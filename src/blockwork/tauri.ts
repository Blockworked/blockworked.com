// The website's replacement for Blockwork's ui/src/tauri.ts: same function
// names and signatures, but instead of invoking the Rust backend, each one
// ports the matching `#[tauri::command]` from src-tauri/src/commands.rs and
// applies it to the in-browser `state` (store.ts). Errors are thrown as plain
// strings, the way a rejected Tauri invoke surfaces them. Only the commands
// the editor UI actually calls are here.
import { macroFileName, macroToJson } from './macroFile';
import { keyToString, webEventToKey } from './keyNames';
import { previewText, type Evaluated } from './evaluate';
import { state } from './store';
import { starterMacro } from './store';
import {
  newId, numberValue, type AppEntryDto, type BlockPieceDto, type BlockShapeDto, type InstrPath, type InstructionDto,
  type MacroDto, type StrandDto, type ValueDto, type ValueLocationDto,
} from './types';
import { isHeaderType } from './types';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function mac(): MacroDto {
  if (!state.current_macro) throw 'No macro selected';
  return state.current_macro;
}

function strandOf(m: MacroDto, id: string): StrandDto | undefined {
  return m.strands.find(s => s.id === id);
}

// ── Instruction-tree helpers (InstructionKind::body / resolve_body) ─────────

function bodyOf(ins: InstructionDto, slot: number): InstructionDto[] | undefined {
  switch (ins.type) {
    case 'If': case 'Repeat': case 'Forever': case 'While': return slot === 0 ? ins.body : undefined;
    case 'IfElse': return slot === 0 ? ins.then_body : slot === 1 ? ins.else_body : undefined;
    default: return undefined;
  }
}

function bodies(ins: InstructionDto): InstructionDto[][] {
  return [0, 1].map(slot => bodyOf(ins, slot)).filter((b): b is InstructionDto[] => !!b);
}

/** `resolve_body_mut`: the parent list a path addresses and the local index. */
function resolveBody(list: InstructionDto[], path: InstrPath): [InstructionDto[], number] | null {
  if (path.length === 0) return null;
  let current = list;
  for (const step of path.slice(0, -1)) {
    const ins = current[step.index];
    if (!ins || step.slot == null) return null;
    const next = bodyOf(ins, step.slot);
    if (!next) return null;
    current = next;
  }
  return [current, path[path.length - 1].index];
}

function allInstructionIds(m: MacroDto): Set<string> {
  const ids = new Set<string>();
  const walk = (list: InstructionDto[]) => list.forEach(ins => {
    ids.add(ins.id);
    bodies(ins).forEach(walk);
  });
  m.strands.forEach(s => walk(s.instructions));
  return ids;
}

function pruneOrphanedComments(m: MacroDto) {
  const live = allInstructionIds(m);
  m.comments = m.comments.filter(c => c.attached_to == null || live.has(c.attached_to));
}

// ── Value-tree walkers (Value::rename_var and friends) ──────────────────────

function valueFields(ins: InstructionDto): ValueDto[] {
  switch (ins.type) {
    case 'Wait': return [ins.duration];
    case 'Text': return [ins.text];
    case 'MoveMouse': return [ins.x, ins.y];
    case 'Scroll': return [ins.amount];
    case 'WhenBatteryDischargedTo': case 'WhenBatteryChargedTo': return [ins.threshold];
    case 'SetVariable': case 'ChangeVariable': case 'Return': return [ins.value];
    case 'CallBlock': return ins.args;
    case 'If': case 'IfElse': case 'While': return [ins.condition];
    case 'Repeat': return [ins.count];
    default: return [];
  }
}

/** Visits every value node (args and `saved` included) and every instruction. */
function walkMacro(m: MacroDto, onValue: (v: ValueDto) => void, onInstruction?: (ins: InstructionDto) => void) {
  const walkValue = (v: ValueDto) => {
    onValue(v);
    if (v.kind === 'Op' || v.kind === 'Call') {
      v.args.forEach(walkValue);
      walkValue(v.saved);
    }
  };
  const walkList = (list: InstructionDto[]) => list.forEach(ins => {
    onInstruction?.(ins);
    valueFields(ins).forEach(walkValue);
    bodies(ins).forEach(walkList);
  });
  m.strands.forEach(s => walkList(s.instructions));
  m.floating_values.forEach(f => walkValue(f.value));
}

// ── Value locations (value_slot_mut / resolve_location_mut) ─────────────────

type Slot = { get(): ValueDto; set(v: ValueDto): void };

function fieldSlot(ins: InstructionDto, fieldId: string): Slot | null {
  const prop = (obj: Record<string, unknown>, key: string): Slot => ({
    get: () => obj[key] as ValueDto,
    set: v => { obj[key] = v; },
  });
  const o = ins as unknown as Record<string, unknown>;
  if (fieldId.startsWith('CallArg:')) {
    if (ins.type !== 'CallBlock') return null;
    const i = Number(fieldId.slice('CallArg:'.length));
    return i < ins.args.length ? { get: () => ins.args[i], set: v => { ins.args[i] = v; } } : null;
  }
  const table: Record<string, [InstructionDto['type'][], string]> = {
    WaitDuration: [['Wait'], 'duration'],
    MoveMouseX: [['MoveMouse'], 'x'],
    MoveMouseY: [['MoveMouse'], 'y'],
    ScrollAmount: [['Scroll'], 'amount'],
    TextValue: [['Text'], 'text'],
    SetVariableValue: [['SetVariable'], 'value'],
    ReturnValue: [['Return'], 'value'],
    ChangeVariableValue: [['ChangeVariable'], 'value'],
    Condition: [['If', 'IfElse', 'While'], 'condition'],
    RepeatCount: [['Repeat'], 'count'],
    BatteryDischargeThreshold: [['WhenBatteryDischargedTo'], 'threshold'],
    BatteryChargeThreshold: [['WhenBatteryChargedTo'], 'threshold'],
  };
  const entry = table[fieldId];
  return entry && entry[0].includes(ins.type) ? prop(o, entry[1]) : null;
}

function slotAt(m: MacroDto, loc: ValueLocationDto): Slot | null {
  let slot: Slot | null;
  if (loc.kind === 'Floating') {
    const fv = m.floating_values.find(f => f.id === loc.floating_id);
    if (!fv) return null;
    slot = { get: () => fv.value, set: v => { fv.value = v; } };
  } else {
    const strand = strandOf(m, loc.strand_id);
    const resolved = strand && resolveBody(strand.instructions, loc.index);
    const ins = resolved && resolved[0][resolved[1]];
    if (!ins) return null;
    slot = fieldSlot(ins, loc.field_id);
  }
  // Value::get_mut: descend through Op/Call args.
  for (const step of loc.path) {
    const node: ValueDto | undefined = slot?.get();
    if (!node || (node.kind !== 'Op' && node.kind !== 'Call') || step >= node.args.length) return null;
    slot = { get: () => node.args[step], set: v => { node.args[step] = v; } };
  }
  return slot;
}

function sameRoot(a: ValueLocationDto, b: ValueLocationDto): boolean {
  if (a.kind === 'Floating' || b.kind === 'Floating') {
    return a.kind === 'Floating' && b.kind === 'Floating' && a.floating_id === b.floating_id;
  }
  return a.strand_id === b.strand_id && a.field_id === b.field_id && JSON.stringify(a.index) === JSON.stringify(b.index);
}

/** `prune_value_buffers`: drop invalid-text entries at or beneath `loc`. */
function pruneBuffers(loc: ValueLocationDto) {
  state.invalid_field_buffers = state.invalid_field_buffers.filter(b =>
    !(sameRoot(b.location, loc) && loc.path.every((step, i) => b.location.path[i] === step)));
}

function setBuffer(loc: ValueLocationDto, text: string) {
  const key = JSON.stringify(loc);
  const rest = state.invalid_field_buffers.filter(b => JSON.stringify(b.location) !== key);
  state.invalid_field_buffers = [...rest, { location: clone(loc), text }];
}

const INTEGER_FIELDS = new Set(['MoveMouseX', 'MoveMouseY', 'ScrollAmount', 'BatteryDischargeThreshold', 'BatteryChargeThreshold']);

// ── Placement checks ────────────────────────────────────────────────────────

function checkWhenRanAttachment(list: InstructionDto[], index: number, ins: InstructionDto, topLevel: boolean) {
  if (index === 0 && list[0] && isHeaderType(list[0].type)) {
    throw "Can't attach a block above a When Ran/Block Definition block";
  }
  if (isHeaderType(ins.type) && (!topLevel || index !== 0)) {
    throw 'A When Ran/Block Definition block can only be the first block in a strand';
  }
}

function checkReturnPlacement(m: MacroDto, strand: StrandDto, ins: InstructionDto) {
  if (ins.type !== 'Return') return;
  const head = strand.instructions[0];
  const valid = head?.type === 'BlockHeader'
    && m.block_defs.some(b => b.id === head.block_id && (b.shape === 'ReturnsValue' || b.shape === 'ReturnsBool'));
  if (!valid) throw 'A Return block can only be used inside a custom block that returns a value';
}

function checkLoopControlPlacement(strand: StrandDto, path: InstrPath, ins: InstructionDto) {
  if (ins.type !== 'EscapeLoop' && ins.type !== 'ContinueLoop') return;
  let list = strand.instructions;
  for (const step of path) {
    if (step.slot == null) break;
    const ancestor = list[step.index];
    if (!ancestor) break;
    if (ancestor.type === 'Repeat' || ancestor.type === 'Forever' || ancestor.type === 'While') return;
    const next = bodyOf(ancestor, step.slot);
    if (!next) break;
    list = next;
  }
  throw 'An Escape Loop/Continue Loop block can only be used inside a Repeat/Forever/While loop';
}

// ── Variables ───────────────────────────────────────────────────────────────

export async function createVariable(name: string): Promise<void> {
  const m = mac();
  const trimmed = name.trim();
  if (!trimmed) throw "Variable name can't be empty";
  if (m.variables.includes(trimmed)) throw `A variable named "${trimmed}" already exists`;
  m.variables.push(trimmed);
}

export async function renameVariable(oldName: string, newName: string): Promise<void> {
  const m = mac();
  const trimmed = newName.trim();
  if (!trimmed) throw "Variable name can't be empty";
  if (trimmed !== oldName && m.variables.includes(trimmed)) throw `A variable named "${trimmed}" already exists`;
  if (!m.variables.includes(oldName)) throw 'Variable not found';
  if (trimmed === oldName) return;
  m.variables = m.variables.map(v => (v === oldName ? trimmed : v));
  walkMacro(
    m,
    v => { if (v.kind === 'Var' && v.name === oldName) v.name = trimmed; },
    ins => { if ((ins.type === 'SetVariable' || ins.type === 'ChangeVariable') && ins.name === oldName) ins.name = trimmed; },
  );
}

export async function deleteVariable(name: string): Promise<void> {
  const m = mac();
  m.variables = m.variables.filter(v => v !== name);
}

// ── Custom blocks ───────────────────────────────────────────────────────────

function validateBlockPieces(pieces: BlockPieceDto[]) {
  const label = pieces.filter(p => p.kind === 'Label').map(p => (p as { text: string }).text.trim()).join(' ');
  if (!label.trim()) throw 'Give the block a name';
  const seen = new Set<string>();
  for (const p of pieces) {
    if (p.kind !== 'Input') continue;
    const trimmed = p.name.trim();
    if (!trimmed) throw 'Every input needs a name';
    if (seen.has(trimmed)) throw `Input name "${trimmed}" is used more than once`;
    seen.add(trimmed);
  }
}

function normalizeBlockColor(color: string): string {
  const c = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw 'Choose a valid block color';
  return c.toUpperCase();
}

function nextStrandPosition(m: MacroDto): [number, number] {
  const maxX = m.strands.length ? Math.max(...m.strands.map(s => s.x)) : 0;
  return [maxX + 260, 0];
}

export async function createBlock(pieces: BlockPieceDto[], shape: BlockShapeDto, color: string): Promise<string> {
  validateBlockPieces(pieces);
  const normalized = normalizeBlockColor(color);
  const m = mac();
  const [x, y] = nextStrandPosition(m);
  const id = newId();
  m.block_defs.push({ id, pieces: clone(pieces), shape, color: normalized });
  m.strands.push({ id: newId(), x, y, instructions: [{ id: newId(), type: 'BlockHeader', block_id: id }] });
  return id;
}

export async function editBlock(blockId: string, pieces: BlockPieceDto[], shape: BlockShapeDto, color: string): Promise<void> {
  validateBlockPieces(pieces);
  const normalized = normalizeBlockColor(color);
  const m = mac();
  const def = m.block_defs.find(b => b.id === blockId);
  if (!def) throw 'Unknown block';
  const oldPieces = def.pieces;

  // Inputs that kept their id but changed name: rename Param reads in the body.
  for (const p of pieces) {
    if (p.kind !== 'Input') continue;
    const old = oldPieces.find(o => o.kind === 'Input' && o.id === p.id);
    if (old?.kind !== 'Input' || old.name === p.name) continue;
    for (const strand of m.strands) {
      const head = strand.instructions[0];
      if (head?.type !== 'BlockHeader' || head.block_id !== blockId) continue;
      walkMacro(
        { ...m, strands: [strand], floating_values: [] },
        v => { if (v.kind === 'Param' && v.name === old.name) v.name = p.name; },
      );
    }
  }

  // reconcile_block_call_args: carry each call's args over by input id.
  const oldIds = oldPieces.filter(p => p.kind === 'Input').map(p => p.id);
  const mapping = pieces.filter(p => p.kind === 'Input').map(p => ({
    oldIndex: oldIds.indexOf(p.id),
    blank: (p.kind === 'Input' && p.value_type === 'Bool' ? { kind: 'Bool' } : numberValue(0)) as ValueDto,
  }));
  const rebuild = (args: ValueDto[]) => mapping.map(({ oldIndex, blank }) => (oldIndex >= 0 && args[oldIndex] ? args[oldIndex] : clone(blank)));
  walkMacro(
    m,
    v => { if (v.kind === 'Call' && v.block_id === blockId) v.args = rebuild(v.args); },
    ins => { if (ins.type === 'CallBlock' && ins.block_id === blockId) ins.args = rebuild(ins.args); },
  );

  def.pieces = clone(pieces);
  def.shape = shape;
  def.color = normalized;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const m = mac();
  // Macro::remove_block — note top-level CallBlocks are removed, nested ones
  // are left in place (same as the app).
  m.block_defs = m.block_defs.filter(b => b.id !== blockId);
  m.strands = m.strands.filter(s => !(s.instructions[0]?.type === 'BlockHeader' && s.instructions[0].block_id === blockId));
  for (const strand of m.strands) {
    strand.instructions = strand.instructions.filter(ins => !(ins.type === 'CallBlock' && ins.block_id === blockId));
  }
  const scrub = (v: ValueDto): ValueDto => {
    if (v.kind === 'Call' && v.block_id === blockId) return numberValue(0);
    if (v.kind === 'Op' || v.kind === 'Call') return { ...v, args: v.args.map(scrub), saved: scrub(v.saved) } as ValueDto;
    return v;
  };
  const scrubList = (list: InstructionDto[]) => list.forEach(ins => {
    const o = ins as unknown as Record<string, unknown>;
    for (const key of ['duration', 'text', 'x', 'y', 'amount', 'threshold', 'value', 'condition', 'count']) {
      if (o[key] && typeof o[key] === 'object') o[key] = scrub(o[key] as ValueDto);
    }
    if (ins.type === 'CallBlock') ins.args = ins.args.map(scrub);
    bodies(ins).forEach(scrubList);
  });
  m.strands.forEach(s => scrubList(s.instructions));
  m.floating_values.forEach(f => { f.value = scrub(f.value); });
  pruneOrphanedComments(m);
  const surviving = new Set(m.strands.map(s => s.id));
  state.invalid_field_buffers = state.invalid_field_buffers.filter(b => b.location.kind === 'Floating' || surviving.has(b.location.strand_id));
}

// ── Instructions ────────────────────────────────────────────────────────────

export async function addInstruction(strandId: string, path: InstrPath, instruction: InstructionDto): Promise<void> {
  const m = mac();
  const strand = strandOf(m, strandId);
  const resolved = strand && resolveBody(strand.instructions, path);
  if (!strand || !resolved) return;
  const [list, rawIdx] = resolved;
  const idx = Math.min(rawIdx, list.length);
  checkWhenRanAttachment(list, idx, instruction, path.length === 1);
  checkReturnPlacement(m, strand, instruction);
  checkLoopControlPlacement(strand, path, instruction);
  list.splice(idx, 0, clone(instruction));
  state.invalid_field_buffers = [];
}

export async function editInstruction(strandId: string, path: InstrPath, instruction: InstructionDto): Promise<void> {
  const strand = strandOf(mac(), strandId);
  const resolved = strand && resolveBody(strand.instructions, path);
  if (!resolved) return;
  const [list, idx] = resolved;
  if (idx < list.length) list[idx] = clone(instruction);
}

/** Removes one instruction; anything below it splits off into a new strand
 * at (x, y). Returns that strand's id, or null if nothing was split off. */
export async function deleteInstruction(strandId: string, path: InstrPath, x: number, y: number): Promise<string | null> {
  const m = mac();
  const strand = strandOf(m, strandId);
  const resolved = strand && resolveBody(strand.instructions, path);
  if (!strand || !resolved || resolved[1] >= resolved[0].length) return null;
  const [list, idx] = resolved;
  list.splice(idx, 1);
  const tail = list.splice(Math.min(idx, list.length));
  let newStrandId: string | null = null;
  if (tail.length) {
    newStrandId = newId();
    m.strands.push({ id: newStrandId, x: Math.round(x), y: Math.round(y), instructions: tail });
  }
  if (strand.instructions.length === 0) m.strands = m.strands.filter(s => s.id !== strandId);
  pruneOrphanedComments(m);
  state.invalid_field_buffers = [];
  return newStrandId;
}

export async function editValueField(location: ValueLocationDto, text: string): Promise<void> {
  const slot = slotAt(mac(), location);
  if (!slot) return;
  if (slot.get().kind === 'Text') {
    slot.set({ kind: 'Text', value: text });
    return;
  }
  const integer = location.kind === 'Field' && INTEGER_FIELDS.has(location.field_id);
  // Rust's i32/f64 `parse`: no surrounding whitespace, no hex, no empty string.
  const valid = integer ? /^[+-]?\d+$/.test(text) && Math.abs(Number(text)) <= 2147483647 : /^[+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|inf|infinity|nan)$/i.test(text);
  if (valid) {
    const lower = text.toLowerCase().replace(/^[+-]/, '');
    const n = lower === 'nan' ? NaN : lower.startsWith('inf') ? (text.startsWith('-') ? -Infinity : Infinity) : Number(text);
    slot.set(numberValue(n));
  }
  setBuffer(location, text);
}

function defaultValueForLocation(m: MacroDto, loc: ValueLocationDto): ValueDto {
  if (loc.kind !== 'Field' || loc.path.length > 0) return numberValue(0);
  if (loc.field_id === 'Condition') return { kind: 'Bool' };
  if (!loc.field_id.startsWith('CallArg:')) return numberValue(0);
  const strand = strandOf(m, loc.strand_id);
  const resolved = strand && resolveBody(strand.instructions, loc.index);
  const ins = resolved && resolved[0][resolved[1]];
  if (ins?.type !== 'CallBlock') return numberValue(0);
  const def = m.block_defs.find(d => d.id === ins.block_id);
  const input = def?.pieces.filter(p => p.kind === 'Input')[Number(loc.field_id.slice('CallArg:'.length))];
  return input?.kind === 'Input' && input.value_type === 'Bool' ? { kind: 'Bool' } : numberValue(0);
}

export async function takeValue(location: ValueLocationDto): Promise<ValueDto> {
  const m = mac();
  let taken: ValueDto | null = null;
  if (location.kind === 'Floating' && location.path.length === 0) {
    const i = m.floating_values.findIndex(f => f.id === location.floating_id);
    if (i >= 0) taken = m.floating_values.splice(i, 1)[0].value;
  } else {
    const fallback = defaultValueForLocation(m, location);
    const slot = slotAt(m, location);
    if (slot) {
      const node = slot.get();
      slot.set(node.kind === 'Op' || node.kind === 'Call' ? clone(node.saved) : fallback);
      taken = node;
    }
  }
  pruneBuffers(location);
  if (!taken) throw 'Nothing to take at that location';
  return clone(taken);
}

export async function putValue(location: ValueLocationDto, value: ValueDto): Promise<void> {
  const slot = slotAt(mac(), location);
  if (slot) {
    const incoming = clone(value);
    if (incoming.kind === 'Op' || incoming.kind === 'Call') incoming.saved = clone(slot.get());
    slot.set(incoming);
  }
  pruneBuffers(location);
}

export async function previewValue(value: ValueDto): Promise<string> {
  // Variables hold their last runtime value in the app; nothing runs on the
  // website, so every declared variable reads as its initial 0.
  const env = new Map<string, Evaluated>(mac().variables.map(name => [name, { kind: 'Number', value: 0 }]));
  return previewText(value, env);
}

export async function createFloatingValue(x: number, y: number, value: ValueDto, originBlockId: string | null): Promise<string> {
  const id = newId();
  mac().floating_values.push({ id, x: Math.round(x), y: Math.round(y), value: clone(value), origin_block_id: originBlockId });
  return id;
}

export async function moveFloatingValue(floatingId: string, x: number, y: number): Promise<void> {
  const fv = mac().floating_values.find(f => f.id === floatingId);
  if (fv) Object.assign(fv, { x: Math.round(x), y: Math.round(y) });
}

export async function removeFloatingValue(floatingId: string): Promise<void> {
  const m = mac();
  m.floating_values = m.floating_values.filter(f => f.id !== floatingId);
}

// ── Comments ────────────────────────────────────────────────────────────────

export async function createComment(x: number, y: number, text: string): Promise<string> {
  const id = newId();
  mac().comments.push({ id, x: Math.round(x), y: Math.round(y), text, collapsed: false, attached_to: null });
  return id;
}

export async function createAttachedComment(instructionId: string, dx: number, dy: number, text: string): Promise<string> {
  const id = newId();
  mac().comments.push({ id, x: Math.round(dx), y: Math.round(dy), text, collapsed: false, attached_to: instructionId });
  return id;
}

export async function moveComment(commentId: string, x: number, y: number): Promise<void> {
  const c = mac().comments.find(c => c.id === commentId);
  if (c) Object.assign(c, { x: Math.round(x), y: Math.round(y) });
}

export async function removeComment(commentId: string): Promise<void> {
  const m = mac();
  m.comments = m.comments.filter(c => c.id !== commentId);
}

export async function editCommentText(commentId: string, text: string): Promise<void> {
  const c = mac().comments.find(c => c.id === commentId);
  if (c) c.text = text;
}

export async function setCommentCollapsed(commentId: string, collapsed: boolean): Promise<void> {
  const c = mac().comments.find(c => c.id === commentId);
  if (c) c.collapsed = collapsed;
}

// ── Strands ─────────────────────────────────────────────────────────────────

export async function addStrand(x: number | null, y: number | null, instruction: InstructionDto | null): Promise<string> {
  const m = mac();
  const [dx, dy] = nextStrandPosition(m);
  const id = newId();
  m.strands.push({ id, x: x ?? dx, y: y ?? dy, instructions: instruction ? [clone(instruction)] : [] });
  return id;
}

export async function removeStrand(strandId: string): Promise<void> {
  const m = mac();
  m.strands = m.strands.filter(s => s.id !== strandId);
  pruneOrphanedComments(m);
  state.invalid_field_buffers = state.invalid_field_buffers.filter(b => b.location.kind === 'Floating' || b.location.strand_id !== strandId);
}

export async function moveStrand(strandId: string, x: number, y: number): Promise<void> {
  const strand = strandOf(mac(), strandId);
  if (strand) Object.assign(strand, { x: Math.round(x), y: Math.round(y) });
}

export async function splitStrand(strandId: string, path: InstrPath, x: number, y: number): Promise<string> {
  const m = mac();
  const strand = strandOf(m, strandId);
  if (!strand) throw 'Unknown strand';
  const resolved = resolveBody(strand.instructions, path);
  if (!resolved) throw 'Unknown instruction path';
  const [list, idx] = resolved;
  if (idx >= list.length) throw 'Split index out of range';
  const tail = list.splice(idx);
  const id = newId();
  m.strands.push({ id, x: Math.round(x), y: Math.round(y), instructions: tail });
  state.invalid_field_buffers = [];
  return id;
}

export async function mergeStrand(draggedId: string, targetId: string, path: InstrPath): Promise<void> {
  if (draggedId === targetId) throw "Can't merge a strand into itself";
  const m = mac();
  const dragged = strandOf(m, draggedId);
  if (!dragged) throw 'Unknown dragged strand';
  if (dragged.instructions[0] && isHeaderType(dragged.instructions[0].type)) {
    throw "A When Ran strand can't be merged into another strand";
  }
  const target = strandOf(m, targetId);
  if (!target) throw 'Unknown target strand';
  const resolved = resolveBody(target.instructions, path);
  if (!resolved) throw 'Unknown target instruction path';
  const [list, rawIdx] = resolved;
  if (path.length === 1 && rawIdx === 0 && list[0] && isHeaderType(list[0].type)) {
    throw "Can't attach a strand above a When Ran block";
  }
  list.splice(Math.min(rawIdx, list.length), 0, ...dragged.instructions);
  m.strands = m.strands.filter(s => s.id !== draggedId);
  state.invalid_field_buffers = state.invalid_field_buffers.filter(b => b.location.kind === 'Floating' || b.location.strand_id !== draggedId);
}

// ── Key capture ─────────────────────────────────────────────────────────────

export async function startKeyCapture(strandId: string, path: InstrPath): Promise<void> {
  state.key_capture = { kind: 'Strand', strand_id: strandId, index: clone(path) };
}

export async function startStandaloneKeyCapture(): Promise<void> {
  state.key_capture = { kind: 'Standalone', strand_id: null, index: null };
}

export async function keyCaptureEvent(code: string, key: string): Promise<void> {
  const target = state.key_capture;
  if (!target) return;
  state.key_capture = null;
  const captured = webEventToKey(code, key);
  const name = captured && keyToString(captured);
  if (!name) return;
  if (target.kind === 'Strand' && target.strand_id && target.index) {
    const strand = state.current_macro && strandOf(state.current_macro, target.strand_id);
    const resolved = strand && resolveBody(strand.instructions, target.index);
    const ins = resolved && resolved[0][resolved[1]];
    if (ins?.type === 'Key') ins.key = name;
  } else {
    state.standalone_key = name;
  }
}

export async function clearStandaloneKeyCapture(): Promise<void> {
  state.standalone_key = null;
}

// ── Open App picker ─────────────────────────────────────────────────────────

/** There's no way to enumerate installed apps from a web page. */
export async function listInstalledApps(): Promise<AppEntryDto[]> {
  return [];
}

// ── Website-only ────────────────────────────────────────────────────────────

/** Saves the current workspace as a `.macro` file Blockwork can import. */
export function exportMacro(): void {
  const m = mac();
  const blob = new Blob([macroToJson(m)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = macroFileName(m.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function resetMacro(): void {
  state.current_macro = starterMacro();
  state.invalid_field_buffers = [];
  state.key_capture = null;
}
