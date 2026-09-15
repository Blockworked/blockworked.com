// Registers the demo's block vocabulary with blockstitch and wires up the
// in-browser backend — the website's counterpart to Blockwork's
// ui/src/blockstitchSetup.ts. Call once before mounting the editor.
import type { Component } from 'vue';
import {
  configureCanvas, newId, registerBlockField, registerBlockShape, registerOperators, registerPaletteBlockField, specForKind, numberValue, textValue,
  type ValueNode,
} from 'blockstitch';
import {
  Clock, Equal, GitBranch, GitFork, Infinity, Keyboard, Mouse, MousePointerClick, Move, Play,
  Repeat, RotateCw, TextCursor, TrendingUp,
} from 'lucide-vue-next';
import { reactive } from 'vue';
import { backend, doc, invalidTextAt } from './store';
import { OPERATOR_KINDS } from './operators';
import { HEADER_TYPES, STACK_TYPES, defaultInstruction, type Instruction, type InstructionType } from './types';

import WhenRanFields from './fields/WhenRanFields.vue';
import WaitFields from './fields/WaitFields.vue';
import TextFields from './fields/TextFields.vue';
import KeyFields from './fields/KeyFields.vue';
import ButtonFields from './fields/ButtonFields.vue';
import MoveMouseFields from './fields/MoveMouseFields.vue';
import ScrollFields from './fields/ScrollFields.vue';
import SetVariableFields from './fields/SetVariableFields.vue';
import ChangeVariableFields from './fields/ChangeVariableFields.vue';
import IfFields from './fields/IfFields.vue';
import IfElseFields from './fields/IfElseFields.vue';
import RepeatFields from './fields/RepeatFields.vue';
import ForeverFields from './fields/ForeverFields.vue';
import WhileFields from './fields/WhileFields.vue';
import PaletteWaitFields from './palette/PaletteWaitFields.vue';
import PaletteTextFields from './palette/PaletteTextFields.vue';
import PaletteMoveMouseFields from './palette/PaletteMoveMouseFields.vue';
import PaletteScrollFields from './palette/PaletteScrollFields.vue';
import PaletteSetVariableFields from './palette/PaletteSetVariableFields.vue';
import PaletteChangeVariableFields from './palette/PaletteChangeVariableFields.vue';
import PaletteWrapFields from './palette/PaletteWrapFields.vue';

// Same icon per type as Blockwork's INSTRUCTION_TYPE_ICONS.
const ICONS: Record<InstructionType, Component> = {
  WhenRan: Play,
  Wait: Clock,
  Text: TextCursor,
  Key: Keyboard,
  Button: MousePointerClick,
  MoveMouse: Move,
  Scroll: Mouse,
  SetVariable: Equal,
  ChangeVariable: TrendingUp,
  If: GitBranch,
  IfElse: GitFork,
  Repeat: Repeat,
  Forever: Infinity,
  While: RotateCw,
};

export const PALETTE_INSTRUCTIONS: InstructionType[] = ['WhenRan', 'Wait', 'Text', 'Key', 'Button', 'MoveMouse', 'Scroll', 'If', 'IfElse', 'Repeat', 'Forever', 'While'];
export const PALETTE_VARIABLE_INSTRUCTIONS: InstructionType[] = ['SetVariable', 'ChangeVariable'];
export const PALETTE_VALUE_KINDS = ['Number', 'Text', ...OPERATOR_KINDS.map(s => s.kind)];

/** Live, editable sidebar prefabs (Blockwork's paletteState.ts). */
export const paletteInstructions = reactive(
  Object.fromEntries([...PALETTE_INSTRUCTIONS, ...PALETTE_VARIABLE_INSTRUCTIONS].map(t => [t, defaultInstruction(t)])),
) as Record<InstructionType, Instruction>;

export const paletteValues = reactive<Record<string, ValueNode>>(
  Object.fromEntries(PALETTE_VALUE_KINDS.map(kind => [kind, freshValue(kind)])),
);

function freshValue(kind: string): ValueNode {
  if (kind === 'Number') return numberValue(0);
  if (kind === 'Text') return textValue('');
  if (kind.startsWith('Var:')) return { kind: 'Var', name: kind.slice(4) };
  const spec = specForKind(kind) ?? OPERATOR_KINDS.find(s => s.kind === kind);
  if (!spec) throw new Error(`Unknown value kind: ${kind}`);
  return {
    kind: 'Op',
    op: spec.op,
    args: spec.argTypes.map((t): ValueNode => (t === 'bool' ? { kind: 'Bool' } : t === 'text' ? textValue('') : numberValue(0))),
    saved: numberValue(0),
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

let didSetup = false;

export function setupDemo() {
  if (didSetup) return;
  didSetup = true;

  registerOperators(OPERATOR_KINDS);

  for (const type of HEADER_TYPES) registerBlockShape(type, { kind: 'header', icon: ICONS[type], isEntryTrigger: true });
  for (const type of STACK_TYPES) registerBlockShape(type, { kind: 'stack', icon: ICONS[type] });
  registerBlockShape<Instruction>('If', {
    kind: 'wrap', icon: ICONS.If,
    getSlots: n => [n.type === 'If' ? n.body : []],
    mapSlots: (n, fn) => (n.type === 'If' ? { ...n, body: fn(n.body, 0) } : n),
  });
  registerBlockShape<Instruction>('IfElse', {
    kind: 'wrap', icon: ICONS.IfElse,
    getSlots: n => (n.type === 'IfElse' ? [n.then_body, n.else_body] : [[], []]),
    mapSlots: (n, fn) => (n.type === 'IfElse' ? { ...n, then_body: fn(n.then_body, 0), else_body: fn(n.else_body, 1) } : n),
  });
  for (const type of ['Repeat', 'Forever', 'While'] as const) {
    registerBlockShape<Instruction>(type, {
      kind: 'wrap', icon: ICONS[type],
      getSlots: n => ['body' in n && n.type === type ? n.body : []],
      mapSlots: (n, fn) => (n.type === type && 'body' in n ? { ...n, body: fn(n.body, 0) } : n),
    });
  }

  const fields: [InstructionType, Component, Component?][] = [
    ['WhenRan', WhenRanFields],
    ['Wait', WaitFields, PaletteWaitFields],
    ['Text', TextFields, PaletteTextFields],
    ['Key', KeyFields],
    ['Button', ButtonFields],
    ['MoveMouse', MoveMouseFields, PaletteMoveMouseFields],
    ['Scroll', ScrollFields, PaletteScrollFields],
    ['SetVariable', SetVariableFields, PaletteSetVariableFields],
    ['ChangeVariable', ChangeVariableFields, PaletteChangeVariableFields],
    ['If', IfFields, PaletteWrapFields],
    ['IfElse', IfElseFields, PaletteWrapFields],
    ['Repeat', RepeatFields, PaletteWrapFields],
    ['Forever', ForeverFields, PaletteWrapFields],
    ['While', WhileFields, PaletteWrapFields],
  ];
  for (const [type, field, palette] of fields) {
    registerBlockField(type, field);
    if (palette) registerPaletteBlockField(type, palette);
  }

  configureCanvas<Instruction>({
    getDocument: () => doc,
    backend,
    resolveFreshValue: kind => (kind.startsWith('Var:') ? freshValue(kind) : clone(paletteValues[kind] ?? freshValue(kind))),
    clonePaletteInstruction: type => ({ ...clone(paletteInstructions[type as InstructionType]), id: newId() }),
    getInvalidText: location => invalidTextAt(location),
    // Suppress the browser's own menu on blocks, like the app does.
    onCanvasContextMenu: () => {},
    onBlockContextMenu: () => {},
  });
}
