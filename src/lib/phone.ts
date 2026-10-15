// Pure phone-number helpers shared by server and client.

export const PREFIXES = ["+12", "+67", "+30"] as const;
export type Prefix = (typeof PREFIXES)[number];

/** Canonical NEXA number: prefix (+12 | +67 | +30) followed by exactly 7 digits. */
export const NEXA_RE = /^\+(12|67|30)\d{7}$/;

/** Strip everything except digits; numbers on this network always start with "+". */
export function normalizePhone(input: string): string {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

export function isValidNexa(phone: string): boolean {
  return NEXA_RE.test(phone);
}

export function prefixOf(phone: string): Prefix | null {
  const p = phone.slice(0, 3);
  return (PREFIXES as readonly string[]).includes(p) ? (p as Prefix) : null;
}

/** "+124839201" -> "+12 483 9201" */
export function formatPhone(phone: string): string {
  if (!isValidNexa(phone)) return phone;
  const prefix = phone.slice(0, 3);
  const rest = phone.slice(3);
  return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

export function isCompleteNexa(phone: string): boolean {
  return isValidNexa(normalizePhone(phone));
}

/** Random candidate numbers across the three prefixes, excluding taken ones. */
export function generateNumbers(count: number, taken: Set<string>): string[] {
  const out = new Set<string>();
  let attempts = 0;
  while (out.size < count && attempts < count * 40) {
    attempts++;
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    let rest = "";
    for (let i = 0; i < 7; i++) rest += Math.floor(Math.random() * 10);
    const num = `${prefix}${rest}`;
    if (!taken.has(num)) out.add(num);
  }
  return [...out];
}
