// The demo's document plus an in-browser `CanvasBackend` for blockstitch.
// In Blockwork these mutations are Tauri commands in src-tauri/src/commands.rs
// (add_instruction, split_strand, merge_strand, take_value, put_value, ...);
// each function below ports the same semantics, including the placement
// checks, so blocks behave exactly like the app. Nothing persists — a reload
// (or the Reset button) restores the starter macro.
import { reactive } from 'vue';
import {
  newId, numberValue, textValue, resolveInstructionList, isHeaderType,
  type CanvasBackend, type CanvasDocument, type CommentLike, type FloatingValueLike,
  type NodePath, type StrandLike, type ValueLocation, type ValueNode,
} from 'blockstitch';
import { FIELD_PROPS, INTEGER_FIELDS, VARIABLES, type Instruction } from './types';
import { evaluateText } from './evaluate';

type Doc = Required<Pick<CanvasDocument<Instruction>, 'strands' | 'floating_values' | 'comments'>> & { id: string };

const op = (name: string, ...args: ValueNode[]): ValueNode => ({ kind: 'Op', op: name, args, saved: numberValue(0) });
const variable = (name: string): ValueNode => ({ kind: 'Var', name });

function starterDocument(): Doc {
  return {
    id: newId(),
    strands: [
      {
        id: newId(),
        x: 0,
        y: 0,
        instructions: [
          { id: newId(), type: 'WhenRan' },
          { id: newId(), type: 'Text', text: textValue('Hello from Blockwork!') },
          { id: newId(), type: 'Key', key: 'Enter', direction: 'Click' },
          { id: newId(), type: 'SetVariable', name: 'clicks', value: numberValue(0) },
          {
            id: newId(),
            type: 'Repeat',
            count: numberValue(10),
            body: [
              { id: newId(), type: 'Button', button: 'Left', direction: 'Click' },
              { id: newId(), type: 'Wait', duration: op('Random', numberValue(80), numberValue(120)) },
              { id: newId(), type: 'ChangeVariable', name: 'clicks', value: numberValue(1) },
            ],
          },
          {
            id: newId(),
            type: 'If',
            condition: op('Gt', variable('clicks'), numberValue(5)),
            body: [{ id: newId(), type: 'Scroll', amount: numberValue(-4), axis: 'Vertical' }],
          },
        ],
      },
      {
        id: newId(),
        x: 390,
        y: 250,
        instructions: [{ id: newId(), type: 'MoveMouse', x: numberValue(640), y: numberValue(360), coordinate: 'Absolute' }],
      },
    ],
    floating_values: [
      { id: newId(), x: 390, y: 170, value: op('Join', textValue('clicked '), variable('clicks')) },
    ],
    comments: [
      { id: newId(), x: 390, y: 0, text: 'Drag blocks from the sidebar, snap them into the stack, or drop them back on the sidebar to delete.', collapsed: false, attached_to: null },
    ],
  };
}

export const doc = reactive<Doc>(starterDocument());

/** Sample variable values for click-to-preview, since nothing actually runs. */
export const variableValues: Record<string, number | string> = Object.fromEntries(VARIABLES.map(v => [v, v === 'clicks' ? 7 : 100]));

// Raw text typed into numeric fields, keyed by serialized location — see
// Blockwork's `invalid_field_buffers`. Lets "1." or "-" stay on screen while
// the model still holds the last valid number.
export const fieldBuffers = reactive(new Map<string, string>());
const locKey = (loc: ValueLocation) => JSON.stringify(loc);

export function resetDocument() {
  Object.assign(doc, starterDocument());
  fieldBuffers.clear();
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function strandOrThrow(id: string): StrandLike<Instruction> {
  const strand = doc.strands.find(s => s.id === id);
  if (!strand) throw new Error('Unknown strand');
  return strand;
}

/** `(parent list, local index)` for a path — Blockwork's `resolve_body_mut`. */
function resolveBody(strand: StrandLike<Instruction>, path: NodePath): [Instruction[], number] {
  const list = resolveInstructionList(strand, path.slice(0, -1));
  return [list, path[path.length - 1]?.index ?? 0];
}

function checkHeaderAttachment(list: Instruction[], index: number, incoming: Instruction[], topLevel: boolean) {
  if (index === 0 && list[0] && isHeaderType(list[0].type)) {
    throw new Error("Can't attach a block above a When Ran block");
  }
  if (incoming.some((ins, i) => isHeaderType(ins.type) && (!topLevel || index !== 0 || i !== 0))) {
    throw new Error('A When Ran block can only be the first block in a strand');
  }
}

/** A get/set handle on the value node at `loc` (`resolve_location_mut`). */
function slotAt(loc: ValueLocation): { get(): ValueNode; set(v: ValueNode): void } | null {
  let container: Record<string, any>;
  let key: string | number;
  if (loc.kind === 'Floating') {
    const fv = doc.floating_values.find(f => f.id === loc.floating_id);
    if (!fv) return null;
    container = fv;
    key = 'value';
  } else {
    const strand = doc.strands.find(s => s.id === loc.strand_id);
    if (!strand) return null;
    const [list, idx] = resolveBody(strand, loc.index);
    const prop = FIELD_PROPS[loc.field_id];
    if (!list[idx] || !prop) return null;
    container = list[idx];
    key = prop;
  }
  for (const step of loc.path) {
    const node = container[key] as ValueNode;
    if (node.kind !== 'Op' && node.kind !== 'Call') return null;
    container = node.args;
    key = step;
  }
  return { get: () => container[key], set: v => { container[key] = v; } };
}

export const backend: CanvasBackend<Instruction> = {
  async addInstruction(strandId, path, instruction) {
    const [list, idx] = resolveBody(strandOrThrow(strandId), path);
    const at = Math.min(idx, list.length);
    checkHeaderAttachment(list, at, [instruction], path.length === 1);
    list.splice(at, 0, instruction);
    fieldBuffers.clear();
  },

  async addStrand(x, y, instruction) {
    const id = newId();
    doc.strands.push({ id, x: x ?? 0, y: y ?? 0, instructions: instruction ? [instruction] : [] });
    return id;
  },

  async removeStrand(strandId) {
    doc.strands = doc.strands.filter(s => s.id !== strandId);
    fieldBuffers.clear();
  },

  async moveStrand(strandId, x, y) {
    const strand = strandOrThrow(strandId);
    strand.x = Math.round(x);
    strand.y = Math.round(y);
  },

  async splitStrand(strandId, path, x, y) {
    const [list, idx] = resolveBody(strandOrThrow(strandId), path);
    if (idx >= list.length) throw new Error('Split index out of range');
    const tail = list.splice(idx);
    const id = newId();
    doc.strands.push({ id, x: Math.round(x), y: Math.round(y), instructions: tail });
    fieldBuffers.clear();
    return id;
  },

  async mergeStrand(draggedId, targetId, path) {
    if (draggedId === targetId) throw new Error("Can't merge a strand into itself");
    const dragged = strandOrThrow(draggedId);
    const target = strandOrThrow(targetId);
    const [list, idx] = resolveBody(target, path);
    const at = Math.min(idx, list.length);
    checkHeaderAttachment(list, at, dragged.instructions, path.length === 1);
    list.splice(at, 0, ...dragged.instructions);
    doc.strands = doc.strands.filter(s => s.id !== draggedId);
    fieldBuffers.clear();
  },

  async editValueField(location, text) {
    const slot = slotAt(location);
    if (!slot) return;
    if (slot.get().kind === 'Text') {
      slot.set(textValue(text));
      return;
    }
    const integer = location.kind === 'Field' && INTEGER_FIELDS.has(location.field_id);
    const n = Number(text);
    if (text.trim() !== '' && !Number.isNaN(n) && (!integer || Number.isInteger(n))) slot.set(numberValue(n));
    fieldBuffers.set(locKey(location), text);
  },

  async takeValue(location) {
    if (location.kind === 'Floating' && location.path.length === 0) {
      const i = doc.floating_values.findIndex(f => f.id === location.floating_id);
      if (i < 0) throw new Error('Nothing to take at that location');
      return clone(doc.floating_values.splice(i, 1)[0].value);
    }
    const slot = slotAt(location);
    if (!slot) throw new Error('Nothing to take at that location');
    const taken = clone(slot.get());
    const fallback: ValueNode = location.kind === 'Field' && location.path.length === 0 && location.field_id === 'Condition'
      ? { kind: 'Bool' }
      : numberValue(0);
    slot.set(taken.kind === 'Op' || taken.kind === 'Call' ? clone(taken.saved) : fallback);
    fieldBuffers.clear();
    return taken;
  },

  async putValue(location, value) {
    const slot = slotAt(location);
    if (!slot) return;
    const incoming = clone(value);
    if (incoming.kind === 'Op' || incoming.kind === 'Call') incoming.saved = clone(slot.get());
    slot.set(incoming);
    fieldBuffers.clear();
  },

  async previewValue(value) {
    return evaluateText(value, variableValues);
  },

  async createFloatingValue(x, y, value) {
    const id = newId();
    doc.floating_values.push({ id, x: Math.round(x), y: Math.round(y), value: clone(value) } satisfies FloatingValueLike);
    return id;
  },

  async moveFloatingValue(floatingId, x, y) {
    const fv = doc.floating_values.find(f => f.id === floatingId);
    if (fv) Object.assign(fv, { x: Math.round(x), y: Math.round(y) });
  },

  async removeFloatingValue(floatingId) {
    doc.floating_values = doc.floating_values.filter(f => f.id !== floatingId);
  },

  async moveComment(commentId, x, y) {
    const c = doc.comments.find(c => c.id === commentId);
    if (c) Object.assign(c, { x: Math.round(x), y: Math.round(y) });
  },

  async removeComment(commentId) {
    doc.comments = doc.comments.filter(c => c.id !== commentId);
  },

  async editCommentText(commentId, text) {
    const c = doc.comments.find(c => c.id === commentId);
    if (c) c.text = text;
  },

  async setCommentCollapsed(commentId, collapsed) {
    const c = doc.comments.find((c): c is CommentLike => c.id === commentId);
    if (c) c.collapsed = collapsed;
  },
};

export function invalidTextAt(location: ValueLocation): { text: string; invalid: boolean } | null {
  const text = fieldBuffers.get(locKey(location));
  if (text === undefined) return null;
  const n = Number(text.trim());
  const integer = location.kind === 'Field' && INTEGER_FIELDS.has(location.field_id);
  return { text, invalid: text.trim() === '' || Number.isNaN(n) || (integer && !Number.isInteger(n)) };
}
