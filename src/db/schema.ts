import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(), // canonical: "+124839201" (prefix + 7 digits)
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // "salt:hash" (scrypt)
  isAdmin: boolean("is_admin").notNull().default(false),
  isBot: boolean("is_bot").notNull().default(false),
  apiKey: text("api_key").notNull().unique(),
  hue: integer("hue").notNull().default(190),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("contacts_owner_idx").on(t.ownerId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    fromPhone: text("from_phone").notNull(),
    toPhone: text("to_phone").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (t) => [
    index("messages_from_idx").on(t.fromPhone),
    index("messages_to_idx").on(t.toPhone),
    index("messages_id_idx").on(t.id),
  ],
);

export const calls = pgTable(
  "calls",
  {
    id: serial("id").primaryKey(),
    callerPhone: text("caller_phone").notNull(),
    calleePhone: text("callee_phone").notNull(),
    type: text("type").notNull().default("audio"), // "audio" | "video"
    status: text("status").notNull().default("ringing"), // ringing | ongoing | ended | missed | declined
    offer: text("offer"), // SDP offer JSON (null when placed through the developer API)
    answer: text("answer"), // SDP answer JSON
    createdAt: timestamp("created_at").notNull().defaultNow(),
    answeredAt: timestamp("answered_at"),
    endedAt: timestamp("ended_at"),
    endReason: text("end_reason"),
  },
  (t) => [
    index("calls_caller_idx").on(t.callerPhone),
    index("calls_callee_idx").on(t.calleePhone),
  ],
);

export const callSignals = pgTable(
  "call_signals",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    fromPhone: text("from_phone").notNull(),
    payload: text("payload").notNull(), // JSON ICE candidate
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("signals_call_idx").on(t.callId)],
);

export const apiLogs = pgTable(
  "api_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    status: integer("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("apilogs_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type CallSignal = typeof callSignals.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
