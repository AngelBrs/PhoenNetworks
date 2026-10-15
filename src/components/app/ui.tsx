"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// ── Avatar ────────────────────────────────────────────────────────────
export function Avatar({
  name,
  hue = 210,
  size = 40,
  online,
  className = "",
}: {
  name: string;
  hue?: number;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-display font-bold text-black/80 select-none"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 90% 62%), hsl(${(hue + 55) % 360} 80% 45%))`,
          fontSize: Math.max(10, size * 0.36),
        }}
      >
        {initials || "·"}
      </div>
      {online !== undefined && (
        <span
          className={`absolute right-0 bottom-0 block rounded-full border-2 border-void ${
            online ? "bg-acid shadow-[0_0_8px_rgba(200,245,66,.9)]" : "bg-zinc-600"
          }`}
          style={{ width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28) }}
        />
      )}
    </div>
  );
}

// ── Toaster ───────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; kind: "ok" | "err" | "info" };
let toastId = 0;

export function toast(msg: string, kind: Toast["kind"] = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Toast>("nexa-toast", { detail: { id: ++toastId, msg, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((xs) => [...xs.slice(-2), t]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3600);
    };
    window.addEventListener("nexa-toast", handler);
    return () => window.removeEventListener("nexa-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => {
        const Icon = t.kind === "ok" ? CheckCircle2 : t.kind === "err" ? AlertTriangle : Info;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border border-white/10 bg-panel/95 px-4 py-2.5 text-sm shadow-2xl shadow-black/60 backdrop-blur-xl animate-[toast-in_.3s_cubic-bezier(.21,1.02,.73,1)]"
          >
            <Icon
              size={16}
              className={
                t.kind === "ok" ? "text-acid" : t.kind === "err" ? "text-red-400" : "text-cyanx"
              }
            />
            <span className="text-zinc-200">{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────
export function IconBtn({
  icon: Icon,
  onClick,
  label,
  className = "",
  disabled,
  danger,
}: {
  icon: LucideIcon;
  onClick?: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-30 ${
        danger ? "hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400" : ""
      } ${className}`}
    >
      <Icon size={17} />
    </button>
  );
}

// ── Misc ──────────────────────────────────────────────────────────────
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-zinc-500 ${className}`} />;
}

export function EmptyState({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <Icon size={26} className="text-zinc-600" />
      </div>
      <div className="font-display text-lg font-semibold text-zinc-300">{title}</div>
      {sub && <div className="max-w-xs text-sm leading-relaxed text-zinc-500">{sub}</div>}
      {children}
    </div>
  );
}

export function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-widest uppercase ${
        online
          ? "border-acid/30 bg-acid/10 text-acid"
          : "border-white/10 bg-white/[.04] text-zinc-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-acid" : "bg-zinc-600"}`} />
      {online ? "online" : "offline"}
    </span>
  );
}
