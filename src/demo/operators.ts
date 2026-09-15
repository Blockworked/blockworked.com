// Operator table — rows copied from Blockwork's `ui/src/valueOps.ts`
// OPERATOR_KINDS, minus the ones that need a real machine (battery, current
// time) or are rarely needed to show the idea.
import type { OperatorKindSpec } from 'blockstitch';

export const OPERATOR_KINDS: OperatorKindSpec[] = [
  { kind: 'Add', op: 'Add', arity: 2, argTypes: ['number', 'number'], resultType: 'number', infix: '+' },
  { kind: 'Sub', op: 'Sub', arity: 2, argTypes: ['number', 'number'], resultType: 'number', infix: '−' },
  { kind: 'Mul', op: 'Mul', arity: 2, argTypes: ['number', 'number'], resultType: 'number', infix: '×' },
  { kind: 'Div', op: 'Div', arity: 2, argTypes: ['number', 'number'], resultType: 'number', infix: '/' },
  { kind: 'Random', op: 'Random', arity: 2, argTypes: ['number', 'number'], resultType: 'number', prefix: 'pick random from', infix: 'to' },
  { kind: 'Join', op: 'Join', arity: 2, argTypes: ['text', 'text'], resultType: 'text', prefix: 'join' },
  { kind: 'Length', op: 'Length', arity: 1, argTypes: ['text'], resultType: 'number', prefix: 'length of' },
  { kind: 'Eq', op: 'Eq', arity: 2, argTypes: ['number', 'number'], resultType: 'bool', infix: '=' },
  { kind: 'Gt', op: 'Gt', arity: 2, argTypes: ['number', 'number'], resultType: 'bool', infix: '>' },
  { kind: 'Lt', op: 'Lt', arity: 2, argTypes: ['number', 'number'], resultType: 'bool', infix: '<' },
  { kind: 'And', op: 'And', arity: 2, argTypes: ['bool', 'bool'], resultType: 'bool', infix: 'and' },
  { kind: 'Or', op: 'Or', arity: 2, argTypes: ['bool', 'bool'], resultType: 'bool', infix: 'or' },
  { kind: 'Not', op: 'Not', arity: 1, argTypes: ['bool'], resultType: 'bool', prefix: 'not' },
  { kind: 'True', op: 'True', arity: 0, argTypes: [], resultType: 'bool', prefix: 'true' },
  { kind: 'False', op: 'False', arity: 0, argTypes: [], resultType: 'bool', prefix: 'false' },
];
