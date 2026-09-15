// Click-to-preview evaluation for operator blocks — a TypeScript port of the
// relevant arms of blockwork-core's `Value::eval` (src/input/value.rs).
import type { ValueNode } from 'blockstitch';

type Evaluated = number | string | boolean;

function asNumber(v: Evaluated): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v.trim());
  if (v.trim() === '' || Number.isNaN(n)) throw `'${v}' is not a number`;
  return n;
}

const asBool = (v: Evaluated) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : v !== '' && v !== 'false');
const asText = (v: Evaluated) => String(v);

function equal(a: Evaluated, b: Evaluated): boolean {
  try {
    return asNumber(a) === asNumber(b);
  } catch {
    return asText(a).toLowerCase() === asText(b).toLowerCase();
  }
}

export function evaluate(v: ValueNode, env: Record<string, number | string>): Evaluated {
  switch (v.kind) {
    case 'Number': return v.value;
    case 'Text': return v.value;
    case 'Bool': return false;
    case 'Var':
      if (!(v.name in env)) throw `unknown variable '${v.name}'`;
      return env[v.name];
    case 'Param': throw 'unresolved parameter reference';
    case 'Call': throw "custom block calls can't be evaluated directly";
    case 'Op': {
      const arg = (i: number) => evaluate(v.args[i], env);
      switch (v.op) {
        case 'Join': return v.args.map((_, i) => asText(arg(i))).join('');
        case 'Length': return [...asText(arg(0))].length;
        case 'True': return true;
        case 'False': return false;
        case 'Not': return !asBool(arg(0));
        case 'And': return asBool(arg(0)) && asBool(arg(1));
        case 'Or': return asBool(arg(0)) || asBool(arg(1));
        case 'Eq': return equal(arg(0), arg(1));
        case 'Gt': return asNumber(arg(0)) > asNumber(arg(1));
        case 'Lt': return asNumber(arg(0)) < asNumber(arg(1));
      }
      const l = asNumber(arg(0));
      const r = asNumber(arg(1));
      switch (v.op) {
        case 'Add': return l + r;
        case 'Sub': return l - r;
        case 'Mul': return l * r;
        case 'Div':
          if (r === 0) throw 'division by zero';
          return l / r;
        case 'Random': {
          const [lo, hi] = [Math.min(l, r), Math.max(l, r)];
          return Number.isInteger(l) && Number.isInteger(r)
            ? lo + Math.floor(Math.random() * (hi - lo + 1))
            : lo + Math.random() * (hi - lo);
        }
      }
      throw `unknown operator '${v.op}'`;
    }
  }
}

export function evaluateText(v: ValueNode, env: Record<string, number | string>): string {
  const result = evaluate(v, env);
  return typeof result === 'number' ? String(Math.round(result * 1e6) / 1e6) : String(result);
}
