"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Phone, Video, VideoOff, Waves } from "lucide-react";
import * as api from "@/lib/client-api";
import { CallSession, type CallPhase } from "@/lib/rtc";
import type { CallDto, Me, PeerInfo } from "@/lib/types";
import { hangupTone, startRingback } from "@/lib/sounds";
import { fmtDuration } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "./ui";

const REASON_LABEL: Record<string, string> = {
  hangup: "Call ended",
  declined: "Declined",
  "no answer": "No answer",
  "call ended": "Call ended",
  "connection lost": "Connection lost",
  "no-media-channel": "No media channel",
  "no-answer": "No answer",
  error: "Call failed",
};

export function CallOverlay({
  me,
  mode,
  peer,
  type,
  incomingCall,
  onClose,
}: {
  me: Me;
  mode: "outgoing" | "incoming";
  peer: string;
  type: "audio" | "video";
  incomingCall?: CallDto | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PeerInfo | null>(null);

  const sessionRef = useRef<CallSession | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const closedRef = useRef(false);

  // resolve peer identity
  useEffect(() => {
    void api
      .lookup(peer)
      .then((r) => {
        if (r.found)
          setInfo({
            phone: r.phone!,
            username: r.username!,
            hue: r.hue!,
            isBot: !!r.isBot,
            online: !!r.online,
          });
      })
      .catch(() => {});
  }, [peer]);

  useEffect(() => {
    closedRef.current = false;
    const session = new CallSession({
      myPhone: me.phone,
      peer,
      type,
      direction: mode,
      events: {
        onPhase: (p) => {
          setPhase(p);
          if (p === "ongoing") {
            stopRingbackRef.current?.();
            stopRingbackRef.current = null;
          }
        },
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
        },
        onLocalStream: (stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        },
        onEnded: (reason) => {
          stopRingbackRef.current?.();
          stopRingbackRef.current = null;
          if (reason !== "error") hangupTone();
          setEndReason(reason);
          setPhase(reason === "error" ? "error" : "ended");
          window.setTimeout(() => {
            if (!closedRef.current) {
              closedRef.current = true;
              onClose();
            }
          }, 1700);
        },
        onError: (message) => {
          setError(message);
          setEndReason("error");
        },
      },
    });
    sessionRef.current = session;

    if (mode === "outgoing") {
      void session.start();
      stopRingbackRef.current = startRingback();
    } else if (incomingCall) {
      void session.accept(incomingCall);
    }

    return () => {
      stopRingbackRef.current?.();
      if (!closedRef.current) {
        closedRef.current = true;
        void session.hangup().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // call timer
  useEffect(() => {
    if (phase !== "ongoing") return;
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
  };
  const toggleVideo = () => {
    const next = !videoOn;
    setVideoOn(next);
    sessionRef.current?.setVideoEnabled(next);
  };

  const name = info?.username ?? "Connecting";
  const statusText =
    phase === "connecting"
      ? "Contacting the network…"
      : phase === "ringing"
        ? "Ringing…"
        : phase === "ongoing"
          ? fmtDuration(seconds)
          : error ?? (REASON_LABEL[endReason ?? ""] ?? "Call ended");

  const live = phase === "ongoing";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-void animate-[fade-in_.25s_ease-out]">
      {/* remote video / ambience */}
      {type === "video" && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${live ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-transparent to-void/80" />
        </>
      )}
      {type === "audio" && (
        <>
          <audio ref={remoteAudioRef} autoPlay className="hidden" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(200,245,66,.07),transparent_55%)]" />
        </>
      )}

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[.3em] text-zinc-500 uppercase">
          <Waves size={13} className={live ? "text-acid" : "text-zinc-600"} />
          nexa p2p wire · {type}
        </div>
        {live && (
          <span className="flex items-center gap-1.5 rounded-full border border-acid/25 bg-void/60 px-3 py-1 font-mono text-[11px] text-acid backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
            {fmtDuration(seconds)}
          </span>
        )}
      </div>

      {/* center identity — always for audio, overlay for video pre-connect */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        {(type === "audio" || !live) && (
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {(phase === "ringing" || phase === "connecting") && (
                <>
                  <span className="absolute h-40 w-40 animate-[sonar_2.2s_ease-out_infinite] rounded-full border border-acid/40" />
                  <span className="absolute h-40 w-40 animate-[sonar_2.2s_ease-out_infinite_.7s] rounded-full border border-acid/25" />
                  <span className="absolute h-40 w-40 animate-[sonar_2.2s_ease-out_infinite_1.4s] rounded-full border border-acid/15" />
                </>
              )}
              {live && (
                <span className="absolute h-44 w-44 rounded-full border border-acid/15 shadow-[0_0_80px_rgba(200,245,66,.12)]" />
              )}
              <div className="animate-[floaty_3.4s_ease-in-out_infinite]">
                <Avatar name={name} hue={info?.hue ?? 210} size={128} />
              </div>
            </div>
            <div className="mt-6 font-display text-3xl font-bold tracking-tight text-white">{name}</div>
            <div className="mt-1.5 font-mono text-sm tracking-[.2em] text-zinc-500">{formatPhone(peer)}</div>
            <div
              className={`mt-4 font-mono text-[13px] tracking-wider ${
                live ? "text-acid" : phase === "ended" || phase === "error" ? "text-zinc-500" : "text-cyanx"
              } ${phase === "ringing" ? "animate-pulse" : ""}`}
            >
              {statusText}
            </div>
            {live && (
              <div className="mt-5 flex h-6 items-end gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-acid/80 animate-[eq_0.9s_ease-in-out_infinite]"
                    style={{ animationDelay: `${i * 0.13}s`, height: 22 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {type === "video" && live && (
          <div className="pointer-events-none absolute bottom-32 left-6">
            <div className="rounded-2xl border border-white/10 bg-void/70 px-4 py-2.5 backdrop-blur">
              <div className="font-display text-lg font-bold text-white">{name}</div>
              <div className="font-mono text-[11px] tracking-[.2em] text-zinc-400">{formatPhone(peer)}</div>
            </div>
          </div>
        )}
      </div>

      {/* local PiP */}
      {type === "video" && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute right-5 bottom-28 z-20 w-36 -scale-x-100 rounded-2xl border border-white/15 bg-panel object-cover shadow-2xl transition-opacity ${
            videoOn ? "opacity-100" : "opacity-0"
          }`}
          style={{ aspectRatio: "3/4" }}
        />
      )}

      {/* controls */}
      <div className="relative z-10 flex items-center justify-center gap-5 pb-10">
        <button
          onClick={toggleMute}
          disabled={!live && phase !== "ringing"}
          className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition-all active:scale-90 disabled:opacity-30 ${
            muted
              ? "border-white/30 bg-white/15 text-white"
              : "border-white/10 bg-void/50 text-zinc-300 hover:bg-white/10"
          }`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => void sessionRef.current?.hangup("hangup")}
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-red-500 text-white shadow-[0_10px_50px_rgba(239,68,68,.45)] transition-all hover:bg-red-400 hover:shadow-[0_10px_70px_rgba(239,68,68,.65)] active:scale-90"
          title="End call"
        >
          <PhoneOff size={28} />
        </button>

        {type === "video" ? (
          <button
            onClick={toggleVideo}
            disabled={!live && phase !== "ringing"}
            className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition-all active:scale-90 disabled:opacity-30 ${
              !videoOn
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 bg-void/50 text-zinc-300 hover:bg-white/10"
            }`}
            title={videoOn ? "Camera off" : "Camera on"}
          >
            {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        ) : (
          <div className="h-14 w-14" />
        )}
      </div>
    </div>
  );
}

// ── Incoming call sheet ────────────────────────────────────────────────
export function IncomingCallSheet({
  call,
  caller,
  onAccept,
  onDecline,
}: {
  call: CallDto;
  caller: { phone: string; username: string; hue: number } | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-3xl border border-white/12 bg-panel/95 p-4 shadow-2xl shadow-black/70 backdrop-blur-2xl animate-[slide-down_.35s_cubic-bezier(.21,1.02,.73,1)]">
        <div className="relative">
          <span className="absolute inset-0 animate-[sonar_1.8s_ease-out_infinite] rounded-full border border-acid/50" />
          <Avatar name={caller?.username ?? "Unknown"} hue={caller?.hue ?? 210} size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[16px] font-bold text-white">
            {caller?.username ?? "Unknown line"}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-zinc-500">
            {call.type === "video" ? (
              <Video size={11} className="text-cyanx" />
            ) : (
              <Phone size={11} className="text-acid" />
            )}
            incoming {call.type} call · {formatPhone(call.callerPhone)}
          </div>
        </div>
        <button
          onClick={onDecline}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-400 active:scale-90"
          title="Decline"
        >
          <PhoneOff size={19} />
        </button>
        <button
          onClick={onAccept}
          className="flex h-12 w-12 shrink-0 animate-pulse items-center justify-center rounded-full bg-acid text-black shadow-[0_0_24px_rgba(200,245,66,.5)] transition-all active:scale-90"
          title="Accept"
        >
          {call.type === "video" ? <Video size={19} /> : <Phone size={19} />}
        </button>
      </div>
    </div>
  );
}
