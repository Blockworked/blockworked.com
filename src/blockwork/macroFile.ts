// Serializes the editor's MacroDto into a real Blockwork `.macro` file — the
// same JSON `serde_json` writes for blockwork-core's `Macro`
// (src/macros/mod.rs), which is what Settings → Import in the app reads. The
// DTO → model conversion follows src-tauri/src/state.rs's `dto_to_instruction`.
import { keyToString, stringToKey, type MacroKey } from './keyNames';
import type { BlockDefDto, InstructionDto, MacroDto, ValueDto } from './types';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// src/input/mouse.rs's `get_mouse_button_names` — `dto_to_instruction` looks
// the DTO name up here and falls back to index 0 (Left) when it isn't listed.
const MOUSE_BUTTON_NAMES = ['Left', 'Right', 'Middle', 'Back', 'Forward', 'ScrollUp', 'ScrollDown', 'ScrollLeft', 'ScrollRight'];

// The app stores a captured key as a `MacroKey` directly, so a few names it
// can show (AltGr) have no `string_to_key` arm; map those back by display name.
function dtoKey(name: string): MacroKey {
  const key = stringToKey(name);
  if (key !== null) return key;
  for (const variant of ['AltGr']) if (keyToString(variant) === name) return variant;
  throw new Error(`Unknown key "${name}"`);
}

function direction(d: string): string {
  return d === 'Press' || d === 'Release' ? d : 'Click';
}

function value(v: ValueDto): Json {
  switch (v.kind) {
    case 'Number': return { kind: 'Number', value: v.value };
    case 'Text': return { kind: 'Text', value: v.value };
    case 'Bool': return { kind: 'Bool' };
    case 'Var': return { kind: 'Var', name: v.name };
    case 'Param': return { kind: 'Param', name: v.name };
    case 'Op': return { kind: 'Op', op: v.op, args: v.args.map(value), saved: value(v.saved) };
    // The model's Call has no `branches` (always empty in Blockwork).
    case 'Call': return { kind: 'Call', block_id: v.block_id, args: v.args.map(value), saved: value(v.saved) };
  }
}

const body = (list: InstructionDto[]): Json => list.map(instruction);

function kind(ins: InstructionDto): Json {
  switch (ins.type) {
    case 'Wait': return { Wait: value(ins.duration) };
    case 'Text': return { Token: { Text: value(ins.text) } };
    case 'Key': return { Token: { Key: [dtoKey(ins.key), direction(ins.direction)] } };
    case 'Button': {
      const index = Math.max(0, MOUSE_BUTTON_NAMES.indexOf(ins.button));
      return { Token: { Button: [MOUSE_BUTTON_NAMES[index], direction(ins.direction)] } };
    }
    case 'MoveMouse': return { Token: { MoveMouse: [value(ins.x), value(ins.y), ins.coordinate === 'Relative' ? 'Rel' : 'Abs'] } };
    case 'Scroll': return { Token: { Scroll: [value(ins.amount), ins.axis === 'Horizontal' ? 'Horizontal' : 'Vertical'] } };
    case 'Command': return { Command: ins.command };
    case 'Comment': return { Comment: ins.comment };
    case 'WhenRan': return 'WhenRan';
    case 'WhenBatteryDischargedTo': return { WhenBatteryDischargedTo: value(ins.threshold) };
    case 'WhenBatteryChargedTo': return { WhenBatteryChargedTo: value(ins.threshold) };
    case 'WhenTime': return { WhenTime: { ...ins.schedule } };
    case 'WhenPowerPluggedIn': return 'WhenPowerPluggedIn';
    case 'WhenPowerUnplugged': return 'WhenPowerUnplugged';
    case 'OpenApp': return { OpenApp: { command: ins.command, name: ins.name, icon: ins.icon } };
    case 'CloseApp': return { CloseApp: { command: ins.command, name: ins.name, icon: ins.icon } };
    case 'SetVariable': return { SetVariable: [ins.name, value(ins.value)] };
    case 'ChangeVariable': return { ChangeVariable: [ins.name, value(ins.value)] };
    case 'BlockHeader': return { BlockHeader: ins.block_id };
    case 'CallBlock': return { CallBlock: { block_id: ins.block_id, args: ins.args.map(value) } };
    case 'Return': return { Return: value(ins.value) };
    case 'If': return { If: { condition: value(ins.condition), body: body(ins.body) } };
    case 'IfElse': return { IfElse: { condition: value(ins.condition), then_body: body(ins.then_body), else_body: body(ins.else_body) } };
    case 'Repeat': return { Repeat: { count: value(ins.count), body: body(ins.body) } };
    case 'Forever': return { Forever: { body: body(ins.body) } };
    case 'While': return { While: { condition: value(ins.condition), body: body(ins.body) } };
    case 'EscapeLoop': return 'EscapeLoop';
    case 'ContinueLoop': return 'ContinueLoop';
  }
}

function instruction(ins: InstructionDto): Json {
  return { id: ins.id, kind: kind(ins) };
}

function blockDef(def: BlockDefDto): Json {
  return {
    id: def.id,
    pieces: def.pieces.map((p): Json => (p.kind === 'Label'
      ? { kind: 'Label', id: p.id, text: p.text }
      : { kind: 'Input', id: p.id, name: p.name, value_type: p.value_type })),
    shape: def.shape,
    color: def.color,
  };
}

export function macroToJson(mac: MacroDto): string {
  const file: Json = {
    id: mac.id,
    name: mac.name,
    description: mac.description,
    strands: mac.strands.map(s => ({ id: s.id, x: s.x, y: s.y, instructions: body(s.instructions) })),
    recording_target: mac.recording_target_strand_id,
    speed_multiplier: mac.speed_multiplier,
    floating_values: mac.floating_values.map(f => ({ id: f.id, x: f.x, y: f.y, value: value(f.value), origin_block_id: f.origin_block_id })),
    comments: mac.comments.map(c => ({ id: c.id, x: c.x, y: c.y, text: c.text, collapsed: c.collapsed, attached_to: c.attached_to })),
    // Variables only carry their last runtime value in the model; nothing has
    // run here, so they all start at 0 like a freshly declared variable.
    variables: mac.variables.map(name => ({ name, value: { kind: 'Number', value: 0 } })),
    block_defs: mac.block_defs.map(blockDef),
    settings: { always_listen: mac.settings.always_listen },
  };
  return JSON.stringify(file, null, 2);
}

/** `sanitize_filename` from src-tauri/src/commands.rs, plus the extension. */
export function macroFileName(name: string): string {
  const cleaned = name.replace(/[/\\:*?"<>|]/g, '_').trim();
  return `${cleaned || 'macro'}.macro`;
}
