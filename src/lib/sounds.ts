"use client";

// Tiny WebAudio signal lab — ringtones, ringback, DTMF, UI blips. No assets.

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.05, at = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const DTMF_MAP: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
  "+": [941, 1209],
};

export function dtmf(key: string) {
  const f = DTMF_MAP[key];
  if (!f) return;
  tone(f[0], 0.14, "sine", 0.035);
  tone(f[1], 0.14, "sine", 0.035);
}

/** Incoming-call warble. Returns a stop function. */
export function startRingtone(): () => void {
  let step = 0;
  const burst = () => {
    for (let i = 0; i < 4; i++) {
      tone(i % 2 === 0 ? 988 : 784, 0.18, "triangle", 0.045, i * 0.22);
    }
  };
  burst();
  const t = setInterval(() => {
    step++;
    burst();
  }, 2400);
  return () => clearInterval(t);
}

/** Outgoing ringback tone (dual-frequency). Returns a stop function. */
export function startRingback(): () => void {
  const burst = () => {
    tone(440, 1.4, "sine", 0.028);
    tone(480, 1.4, "sine", 0.028);
  };
  burst();
  const t = setInterval(burst, 4000);
  return () => clearInterval(t);
}

export function messagePop() {
  tone(660, 0.09, "sine", 0.04);
  tone(990, 0.12, "sine", 0.035, 0.07);
}

export function sentWhoosh() {
  tone(520, 0.07, "sine", 0.025);
}

export function hangupTone() {
  tone(392, 0.14, "sine", 0.045);
  tone(294, 0.22, "sine", 0.045, 0.14);
}

export function errorBuzz() {
  tone(196, 0.18, "square", 0.03);
}
