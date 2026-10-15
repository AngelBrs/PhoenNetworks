"use client";

// WebRTC session manager with DB-backed signaling (polling every 900ms).

import * as api from "./client-api";
import type { CallDto } from "./types";

export type CallPhase =
  | "connecting"
  | "ringing"
  | "ongoing"
  | "ended"
  | "error";

export type CallSessionEvents = {
  onPhase?: (phase: CallPhase) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream | null) => void;
  onEnded?: (reason: string) => void;
  onError?: (message: string) => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export class CallSession {
  readonly myPhone: string;
  readonly type: "audio" | "video";
  readonly direction: "outgoing" | "incoming";
  peer: string;
  callId: number | null = null;

  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private remote: MediaStream | null = null;
  private ev: CallSessionEvents;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastSignalId = 0;
  private remoteDescSet = false;
  private pendingIce: RTCIceCandidateInit[] = [];
  private dead = false;

  constructor(opts: {
    myPhone: string;
    peer: string;
    type: "audio" | "video";
    direction: "outgoing" | "incoming";
    events: CallSessionEvents;
  }) {
    this.myPhone = opts.myPhone;
    this.peer = opts.peer;
    this.type = opts.type;
    this.direction = opts.direction;
    this.ev = opts.events;
  }

  // ── Outgoing: create offer → POST call → wait for answer ──────────
  async start() {
    try {
      this.ev.onPhase?.("connecting");
      await this.setupPeer();
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      const call = await api.placeCall(this.peer, this.type, JSON.stringify(this.pc!.localDescription));
      this.callId = call.id;
      this.ev.onPhase?.("ringing");
      this.startPolling();
    } catch (e) {
      this.fail(e instanceof Error ? e.message : "Could not start the call.");
    }
  }

  // ── Incoming: set remote offer → answer → poll ────────────────────
  async accept(incoming: CallDto) {
    try {
      this.callId = incoming.id;
      this.ev.onPhase?.("connecting");
      if (!incoming.offer) {
        // API-placed call: signaling only, no media channel exists.
        await api.answerCall(incoming.id, null).catch(() => {});
        await api.hangupCall(incoming.id, "no-media-channel").catch(() => {});
        this.fail("This call was placed via the NEXA API and carries no media channel.");
        return;
      }
      await this.setupPeer();
      await this.pc!.setRemoteDescription(JSON.parse(incoming.offer) as RTCSessionDescriptionInit);
      this.remoteDescSet = true;
      await this.flushIce();
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      const call = await api.answerCall(incoming.id, JSON.stringify(this.pc!.localDescription));
      this.callId = call.id;
      this.ev.onPhase?.("ongoing");
      this.startPolling();
    } catch (e) {
      this.fail(e instanceof Error ? e.message : "Could not answer the call.");
    }
  }

  private async setupPeer() {
    this.local = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: this.type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    this.ev.onLocalStream?.(this.local);

    this.remote = new MediaStream();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;

    this.local.getTracks().forEach((track) => pc.addTrack(track, this.local!));

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        stream.getTracks().forEach((t) => this.remote!.addTrack(t));
      } else if (event.track) {
        this.remote!.addTrack(event.track);
      }
      this.ev.onRemoteStream?.(this.remote!);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.callId) {
        void api.postSignal(this.callId, JSON.stringify(event.candidate)).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "failed" || state === "closed") {
        this.finish("connection lost", false);
      }
    };
  }

  private startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => void this.tick(), 900);
  }

  private async flushIce() {
    if (!this.remoteDescSet || !this.pc) return;
    while (this.pendingIce.length) {
      const cand = this.pendingIce.shift()!;
      try {
        await this.pc.addIceCandidate(cand);
      } catch {
        /* stale candidate */
      }
    }
  }

  private async tick() {
    if (this.dead || !this.callId || !this.pc) return;
    try {
      const call = await api.getCall(this.callId);

      if (call.status === "ended" || call.status === "missed" || call.status === "declined") {
        const reason =
          call.status === "declined"
            ? "declined"
            : call.status === "missed"
              ? this.direction === "outgoing"
                ? "no answer"
                : "call ended"
              : call.endReason ?? "call ended";
        this.finish(reason, true);
        return;
      }

      if (call.status === "ongoing") {
        this.ev.onPhase?.("ongoing");
        if (this.direction === "outgoing" && !this.remoteDescSet && call.answer) {
          await this.pc.setRemoteDescription(JSON.parse(call.answer) as RTCSessionDescriptionInit);
          this.remoteDescSet = true;
          await this.flushIce();
        }
      }

      const signals = await api.getSignals(this.callId, this.lastSignalId);
      for (const s of signals) {
        this.lastSignalId = Math.max(this.lastSignalId, s.id);
        if (s.fromPhone === this.myPhone) continue;
        try {
          const cand = JSON.parse(s.payload) as RTCIceCandidateInit;
          if (this.remoteDescSet) await this.pc.addIceCandidate(cand);
          else this.pendingIce.push(cand);
        } catch {
          /* malformed candidate */
        }
      }
    } catch {
      /* transient network error — keep polling */
    }
  }

  setMuted(muted: boolean) {
    this.local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  setVideoEnabled(on: boolean) {
    this.local?.getVideoTracks().forEach((t) => (t.enabled = on));
  }

  async hangup(reason = "hangup") {
    if (this.callId) {
      await api.hangupCall(this.callId, reason).catch(() => {});
    }
    this.finish(reason, false);
  }

  private finish(reason: string, remote: boolean) {
    if (this.dead) return;
    this.dead = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    try {
      this.pc?.close();
    } catch {
      /* already closed */
    }
    this.local?.getTracks().forEach((t) => t.stop());
    this.ev.onLocalStream?.(null);
    if (!remote) this.ev.onPhase?.("ended");
    this.ev.onEnded?.(reason);
  }

  private fail(message: string) {
    this.ev.onError?.(message);
    this.finish("error", false);
  }
}
