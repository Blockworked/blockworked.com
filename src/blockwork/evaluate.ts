// Port of blockwork-core's `Value::resolve_vars` + `Value::eval`/`eval_text`
// (src/input/value.rs) — what `preview_value` runs for click-to-preview.
import type { ValueDto } from './types';

export type Evaluated =
  | { kind: 'Number'; value: number }
  | { kind: 'Text'; value: string }
  | { kind: 'Bool'; value: boolean };

// Rust's `str::parse::<f64>` after a trim: plain decimals, exponents, and
// inf/infinity/nan — but not "", hex, or anything JS's Number() also allows.
const RUST_FLOAT = /^[+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|inf|infinity|nan)$/i;

function parseRustFloat(s: string): number | null {
  if (!RUST_FLOAT.test(s)) return null;
  const lower = s.toLowerCase().replace(/^[+-]/, '');
  const negative = s.startsWith('-');
  if (lower === 'nan') return NaN;
  if (lower === 'inf' || lower === 'infinity') return negative ? -Infinity : Infinity;
  return Number(s);
}

/** Rust's `f64::to_string` — integers print without a trailing `.0`. */
export function rustNumberToString(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return 'inf';
  if (n === -Infinity) return '-inf';
  if (Number.isInteger(n)) return BigInt(n).toString();
  return String(n);
}

function asNumber(e: Evaluated): number {
  switch (e.kind) {
    case 'Number': return e.value;
    case 'Bool': return e.value ? 1 : 0;
    case 'Text': {
      const n = parseRustFloat(e.value.trim());
      if (n === null) throw `"${e.value}" is not a number`;
      return n;
    }
  }
}

function asBool(e: Evaluated): boolean {
  switch (e.kind) {
    case 'Bool': return e.value;
    case 'Number': return e.value !== 0;
    case 'Text': return e.value !== '' && e.value !== 'false';
  }
}

function asText(e: Evaluated): string {
  switch (e.kind) {
    case 'Text': return e.value;
    case 'Number': return rustNumberToString(e.value);
    case 'Bool': return String(e.value);
  }
}

function valuesEqual(l: Evaluated, r: Evaluated): boolean {
  try {
    return asNumber(l) === asNumber(r);
  } catch {
    return asText(l) === asText(r);
  }
}

function charIndexOf(haystack: string, needle: string, last: boolean): number {
  const h = Array.from(haystack);
  const n = Array.from(needle);
  if (n.length === 0 || n.length > h.length) return 0;
  const matches = (i: number) => n.every((c, j) => h[i + j] === c);
  if (last) {
    for (let i = h.length - n.length; i >= 0; i--) if (matches(i)) return i + 1;
  } else {
    for (let i = 0; i <= h.length - n.length; i++) if (matches(i)) return i + 1;
  }
  return 0;
}

// Live readings for the battery operators, filled in when the browser exposes
// the Battery Status API (Chromium). Without one, BatteryPercentage errors the
// way the app does on a machine with no battery.
const battery = { percentage: null as number | null, pluggedIn: true };
type BatteryManagerLike = { level: number; charging: boolean; addEventListener(type: string, cb: () => void): void };
if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
  (navigator as Navigator & { getBattery(): Promise<BatteryManagerLike> }).getBattery().then(b => {
    const sync = () => {
      battery.percentage = Math.round(b.level * 100);
      battery.pluggedIn = b.charging;
    };
    sync();
    b.addEventListener('levelchange', sync);
    b.addEventListener('chargingchange', sync);
  }).catch(() => {});
}

function evaluate(v: ValueDto): Evaluated {
  const num = (x: ValueDto) => asNumber(evaluate(x));
  const text = (x: ValueDto) => asText(evaluate(x));
  switch (v.kind) {
    case 'Number': return { kind: 'Number', value: v.value };
    case 'Text': return { kind: 'Text', value: v.value };
    case 'Bool': return { kind: 'Bool', value: false };
    case 'Var': throw 'unresolved variable reference';
    case 'Param': throw 'unresolved parameter reference';
    case 'Call': throw "custom block calls can't be evaluated directly";
    case 'Op': break;
  }
  const a = v.args;
  switch (v.op) {
    case 'Join': return { kind: 'Text', value: a.map(text).join('') };
    case 'NewLine': return { kind: 'Text', value: '\n' };
    case 'Tab': return { kind: 'Text', value: '\t' };
    case 'Length': return { kind: 'Number', value: Array.from(text(a[0])).length };
    case 'IndexOf': return { kind: 'Number', value: charIndexOf(text(a[1]), text(a[0]), false) };
    case 'LastIndexOf': return { kind: 'Number', value: charIndexOf(text(a[1]), text(a[0]), true) };
    case 'LetterOf': {
      const index = Math.trunc(num(a[0]));
      const chars = Array.from(text(a[1]));
      if (index < 1 || index > chars.length) throw `letter ${index} is out of range for a ${chars.length}-character value`;
      return { kind: 'Text', value: chars[index - 1] };
    }
    case 'Case': {
      const t = text(a[0]);
      return { kind: 'Text', value: text(a[1]) === 'Upper' ? t.toUpperCase() : t.toLowerCase() };
    }
    // Rust's f64::round rounds half away from zero.
    case 'Round': {
      const n = num(a[0]);
      return { kind: 'Number', value: Math.sign(n) * Math.round(Math.abs(n)) };
    }
    case 'Math': {
      const fn = text(a[0]);
      const n = num(a[1]);
      const rad = Math.PI / 180;
      const deg = 180 / Math.PI;
      const table: Record<string, (x: number) => number> = {
        Abs: Math.abs, Floor: Math.floor, Ceiling: Math.ceil,
        Sign: x => (x > 0 ? 1 : x < 0 ? -1 : 0), Sqrt: Math.sqrt,
        Sin: x => Math.sin(x * rad), Cos: x => Math.cos(x * rad), Tan: x => Math.tan(x * rad),
        Asin: x => Math.asin(x) * deg, Acos: x => Math.acos(x) * deg, Atan: x => Math.atan(x) * deg,
        Ln: Math.log, Log: Math.log10, Log2: Math.log2, EPower: Math.exp, TenPower: x => 10 ** x,
      };
      if (!table[fn]) throw `unknown math function '${fn}'`;
      return { kind: 'Number', value: table[fn](n) };
    }
    case 'True': return { kind: 'Bool', value: true };
    case 'False': return { kind: 'Bool', value: false };
    case 'BatteryPercentage':
      if (battery.percentage === null) throw 'No battery found';
      return { kind: 'Number', value: battery.percentage };
    case 'PluggedIn': return { kind: 'Bool', value: battery.pluggedIn };
    case 'CurrentTime': {
      const now = new Date();
      const part = text(a[0]);
      const parts: Record<string, number> = {
        Year: now.getFullYear(), Month: now.getMonth() + 1, Date: now.getDate(), DayOfWeek: now.getDay() + 1,
        Hour: now.getHours(), Minute: now.getMinutes(), Second: now.getSeconds(),
      };
      if (!(part in parts)) throw `unknown current-time component '${part}'`;
      return { kind: 'Number', value: parts[part] };
    }
    case 'Not': return { kind: 'Bool', value: !asBool(evaluate(a[0])) };
    case 'And': return { kind: 'Bool', value: asBool(evaluate(a[0])) && asBool(evaluate(a[1])) };
    case 'Or': return { kind: 'Bool', value: asBool(evaluate(a[0])) || asBool(evaluate(a[1])) };
    case 'Eq': return { kind: 'Bool', value: valuesEqual(evaluate(a[0]), evaluate(a[1])) };
    case 'Neq': return { kind: 'Bool', value: !valuesEqual(evaluate(a[0]), evaluate(a[1])) };
    case 'Gt': return { kind: 'Bool', value: num(a[0]) > num(a[1]) };
    case 'Lt': return { kind: 'Bool', value: num(a[0]) < num(a[1]) };
    case 'Gte': return { kind: 'Bool', value: num(a[0]) >= num(a[1]) };
    case 'Lte': return { kind: 'Bool', value: num(a[0]) <= num(a[1]) };
    default: {
      const l = num(a[0]);
      const r = num(a[1]);
      switch (v.op) {
        case 'Add': return { kind: 'Number', value: l + r };
        case 'Sub': return { kind: 'Number', value: l - r };
        case 'Mul': return { kind: 'Number', value: l * r };
        case 'Div':
          if (r === 0) throw 'division by zero';
          return { kind: 'Number', value: l / r };
        case 'Mod': {
          if (r === 0) throw 'mod by zero';
          // Rust's rem_euclid: always non-negative.
          const m = l % r;
          return { kind: 'Number', value: m < 0 ? m + Math.abs(r) : m };
        }
        case 'Random': {
          const lo = Math.min(l, r);
          const hi = Math.max(l, r);
          const value = Number.isInteger(l) && Number.isInteger(r)
            ? lo + Math.floor(Math.random() * (hi - lo + 1))
            : lo + Math.random() * (hi - lo);
          return { kind: 'Number', value };
        }
      }
    }
  }
}

/** `Value::resolve_vars` — unknown variables read as 0. */
function resolveVars(v: ValueDto, env: Map<string, Evaluated>): ValueDto {
  switch (v.kind) {
    case 'Var': {
      const e = env.get(v.name);
      if (!e) return { kind: 'Number', value: 0 };
      if (e.kind === 'Bool') return { kind: 'Op', op: e.value ? 'True' : 'False', args: [], saved: { kind: 'Number', value: 0 } };
      return e;
    }
    case 'Op': return { ...v, args: v.args.map(x => resolveVars(x, env)), saved: resolveVars(v.saved, env) };
    case 'Call': return { ...v, args: v.args.map(x => resolveVars(x, env)), saved: resolveVars(v.saved, env) };
    default: return v;
  }
}

/** `preview_value_with_env`: `resolve_vars(env).eval_text()`. Throws the error string. */
export function previewText(value: ValueDto, env: Map<string, Evaluated>): string {
  return asText(evaluate(resolveVars(value, env)));
}
