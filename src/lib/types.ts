// Shared DTO types between server route handlers and the client app.

export type Me = {
  id: number;
  phone: string;
  username: string;
  isAdmin: boolean;
  isBot: boolean;
  hue: number;
  createdAt: string;
  apiKey?: string;
};

export type PeerInfo = {
  phone: string;
  username: string;
  hue: number;
  isBot: boolean;
  online: boolean;
};

export type MessageDto = {
  id: number;
  fromPhone: string;
  toPhone: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  mine?: boolean;
};

export type ChatSummary = {
  peer: string;
  username: string;
  hue: number;
  isBot: boolean;
  online: boolean;
  unread: number;
  last: MessageDto;
};

export type CallDto = {
  id: number;
  callerPhone: string;
  calleePhone: string;
  type: "audio" | "video";
  status: "ringing" | "ongoing" | "ended" | "missed" | "declined";
  offer: string | null;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  endReason: string | null;
};

export type NetworkStats = {
  users: number;
  online: number;
  messages: number;
  calls: number;
  apiRequests: number;
};

export type ContactDto = {
  id: number;
  phone: string;
  name: string;
  exists: boolean;
  username: string | null;
  hue: number;
  online: boolean;
};
