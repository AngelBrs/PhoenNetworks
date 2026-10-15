"use client";

import type {
  CallDto,
  ChatSummary,
  ContactDto,
  Me,
  MessageDto,
  NetworkStats,
  PeerInfo,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError((data.error as string) ?? "Request failed", res.status);
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────
export const getMe = () => req<{ me: Me }>("/api/auth/me").then((r) => r.me);
export const login = (identifier: string, password: string) =>
  req<{ me: Me }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  }).then((r) => r.me);
export const register = (phone: string, username: string, password: string) =>
  req<{ me: Me }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone, username, password }),
  }).then((r) => r.me);
export const logout = () => req<{ ok: true }>("/api/auth/logout", { method: "POST", body: "{}" });

// ── Numbers & lookup ──────────────────────────────────────────────────
export const availableNumbers = (count = 12) =>
  req<{ numbers: string[] }>(`/api/numbers/available?count=${count}`).then((r) => r.numbers);
export const lookup = (phone: string) =>
  req<{ found: boolean } & Partial<PeerInfo>>(
    `/api/users/lookup?phone=${encodeURIComponent(phone)}`,
  );

// ── Messaging ─────────────────────────────────────────────────────────
export const getChats = () => req<{ chats: ChatSummary[] }>("/api/chats").then((r) => r.chats);
export const getMessages = (peer: string) =>
  req<{ messages: MessageDto[] }>(`/api/messages?peer=${encodeURIComponent(peer)}`).then(
    (r) => r.messages,
  );
export const sendMessage = (to: string, body: string) =>
  req<{ message: MessageDto }>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ to, body }),
  }).then((r) => r.message);
export const markRead = (peer: string) =>
  req<{ ok: true }>("/api/messages/read", { method: "POST", body: JSON.stringify({ peer }) });

// ── Presence ──────────────────────────────────────────────────────────
export const beat = () => req<{ ok: true }>("/api/presence", { method: "POST", body: "{}" });
export const getPresence = (phones: string[]) =>
  req<{ presence: Record<string, { online: boolean; lastSeenAt: string }> }>(
    `/api/presence?phones=${phones.map(encodeURIComponent).join(",")}`,
  ).then((r) => r.presence);

// ── Calls / signaling ─────────────────────────────────────────────────
export type CallHistoryItem = Omit<CallDto, "offer" | "answer"> & {
  direction: "outgoing" | "incoming";
  peer: string;
  viaApi: boolean;
};
export const callHistory = () =>
  req<{ calls: CallHistoryItem[]; names: Record<string, { username: string; hue: number }> }>(
    "/api/calls",
  );
export const placeCall = (to: string, type: "audio" | "video", offer: string | null) =>
  req<{ call: CallDto }>("/api/calls", {
    method: "POST",
    body: JSON.stringify({ to, type, offer }),
  }).then((r) => r.call);
export const incomingCall = () =>
  req<{ call: CallDto | null; caller: { phone: string; username: string; hue: number } | null }>(
    "/api/calls/incoming",
  );
export const getCall = (id: number) => req<{ call: CallDto }>(`/api/calls/${id}`).then((r) => r.call);
export const answerCall = (id: number, answer: string | null) =>
  req<{ call: CallDto }>(`/api/calls/${id}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  }).then((r) => r.call);
export const declineCall = (id: number) =>
  req<{ call: CallDto }>(`/api/calls/${id}/decline`, { method: "POST", body: "{}" });
export const hangupCall = (id: number, reason = "hangup") =>
  req<{ call: CallDto }>(`/api/calls/${id}/hangup`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const postSignal = (id: number, payload: string) =>
  req<{ ok: true }>(`/api/calls/${id}/signals`, { method: "POST", body: JSON.stringify({ payload }) });
export const getSignals = (id: number, after: number) =>
  req<{ signals: { id: number; callId: number; fromPhone: string; payload: string }[] }>(
    `/api/calls/${id}/signals?after=${after}`,
  ).then((r) => r.signals);

// ── Contacts ──────────────────────────────────────────────────────────
export const getContacts = () =>
  req<{ contacts: ContactDto[] }>("/api/contacts").then((r) => r.contacts);
export const addContact = (phone: string, name: string) =>
  req<{ contact: ContactDto }>("/api/contacts", {
    method: "POST",
    body: JSON.stringify({ phone, name }),
  });
export const deleteContact = (id: number) =>
  req<{ ok: true }>(`/api/contacts?id=${id}`, { method: "DELETE" });

// ── Keys & stats ──────────────────────────────────────────────────────
export const rotateKey = () =>
  req<{ apiKey: string }>("/api/keys", { method: "POST", body: "{}" }).then((r) => r.apiKey);
export const getStats = () => req<NetworkStats>("/api/stats");
