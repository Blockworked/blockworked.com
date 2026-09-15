// The demo's instruction vocabulary — a subset of Blockwork's own
// `ui/src/types.ts` InstructionDto (same type names, field names, and
// defaults), limited to blocks that make sense without a real machine behind
// them. Values are blockstitch's own `ValueNode`.
import { newId, numberValue, textValue, blankBoolValue, type ValueNode } from 'blockstitch';

export type KeyDirection = 'Click' | 'Press' | 'Release';

export type Instruction = { id: string } & (
  | { type: 'WhenRan' }
  | { type: 'WhenBatteryChargedTo'; threshold: ValueNode }
  // Stand-in for Blockwork's CallBlock: the site has no BlockDef store, so the
  // call carries its own prototype (label + one input) and color.
  | { type: 'CallBlock'; label: string; args: ValueNode[]; color: string }
  | { type: 'Wait'; duration: ValueNode }
  | { type: 'Text'; text: ValueNode }
  | { type: 'Key'; key: string; direction: KeyDirection }
  | { type: 'Button'; button: string; direction: KeyDirection }
  | { type: 'MoveMouse'; x: ValueNode; y: ValueNode; coordinate: string }
  | { type: 'Scroll'; amount: ValueNode; axis: string }
  | { type: 'SetVariable'; name: string; value: ValueNode }
  | { type: 'ChangeVariable'; name: string; value: ValueNode }
  | { type: 'If'; condition: ValueNode; body: Instruction[] }
  | { type: 'IfElse'; condition: ValueNode; then_body: Instruction[]; else_body: Instruction[] }
  | { type: 'Repeat'; count: ValueNode; body: Instruction[] }
  | { type: 'Forever'; body: Instruction[] }
  | { type: 'While'; condition: ValueNode; body: Instruction[] }
);

export type InstructionType = Instruction['type'];
export type InstructionOf<T extends InstructionType> = Extract<Instruction, { type: T }>;

export const HEADER_TYPES: InstructionType[] = ['WhenRan', 'WhenBatteryChargedTo'];
export const STACK_TYPES: InstructionType[] = ['CallBlock', 'Wait', 'Text', 'Key', 'Button', 'MoveMouse', 'Scroll', 'SetVariable', 'ChangeVariable'];
export const WRAP_TYPES: InstructionType[] = ['If', 'IfElse', 'Repeat', 'Forever', 'While'];

export function defaultInstruction(type: InstructionType): Instruction {
  const id = newId();
  switch (type) {
    case 'WhenRan': return { id, type };
    case 'WhenBatteryChargedTo': return { id, type, threshold: numberValue(100) };
    case 'CallBlock': return { id, type, label: 'my block', args: [numberValue(0)], color: '#bf5af2' };
    case 'Wait': return { id, type, duration: numberValue(1000) };
    case 'Text': return { id, type, text: textValue('text') };
    case 'Key': return { id, type, key: 'a', direction: 'Click' };
    case 'Button': return { id, type, button: 'Left', direction: 'Click' };
    case 'MoveMouse': return { id, type, x: numberValue(0), y: numberValue(0), coordinate: 'Relative' };
    case 'Scroll': return { id, type, amount: numberValue(4), axis: 'Vertical' };
    case 'SetVariable': return { id, type, name: 'clicks', value: numberValue(0) };
    case 'ChangeVariable': return { id, type, name: 'clicks', value: numberValue(1) };
    case 'If': return { id, type, condition: blankBoolValue(), body: [] };
    case 'IfElse': return { id, type, condition: blankBoolValue(), then_body: [], else_body: [] };
    case 'Repeat': return { id, type, count: numberValue(10), body: [] };
    case 'Forever': return { id, type, body: [] };
    case 'While': return { id, type, condition: blankBoolValue(), body: [] };
  }
}

/** Which instruction property each blockstitch `field_id` addresses —
 * mirrors Blockwork's `FieldId` enum (src-tauri/src/state.rs). */
export const FIELD_PROPS: Record<string, string> = {
  WaitDuration: 'duration',
  TextValue: 'text',
  MoveMouseX: 'x',
  MoveMouseY: 'y',
  ScrollAmount: 'amount',
  SetVariableValue: 'value',
  ChangeVariableValue: 'value',
  Condition: 'condition',
  RepeatCount: 'count',
  BatteryChargeThreshold: 'threshold',
};

/** Integer-only fields, same set as Blockwork's `location_requires_integer`. */
export const INTEGER_FIELDS = new Set(['MoveMouseX', 'MoveMouseY', 'ScrollAmount']);

export const VARIABLES = ['clicks', 'delay'];
