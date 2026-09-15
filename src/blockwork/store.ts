// The website's stand-in for Blockwork's ui/src/store.ts. The app mirrors a
// Rust backend's StateDto; here the same reactive `state` is owned directly
// by the in-browser backend (backend.ts), which mutates it in place. Only the
// fields the editor reads are meaningful — everything else keeps
// `emptyState()`'s defaults. Nothing persists; a reload (or Reset) restores
// the starter macro.
import { reactive } from 'vue';
import { emptyState, newId, numberValue, textValue, defaultMacroSettings, type MacroDto, type StateDto, type ValueDto } from './types';

export const state = reactive<StateDto>(emptyState());

const op = (name: Extract<ValueDto, { kind: 'Op' }>['op'], ...args: ValueDto[]): ValueDto => ({ kind: 'Op', op: name, args, saved: numberValue(0) });
const variable = (name: string): ValueDto => ({ kind: 'Var', name });

export function starterMacro(): MacroDto {
  return {
    id: newId(),
    name: 'My macro',
    description: '',
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
    recording_target_strand_id: null,
    speed_multiplier: 1,
    floating_values: [
      { id: newId(), x: 390, y: 170, value: op('Join', textValue('clicked '), variable('clicks')), origin_block_id: null },
    ],
    comments: [
      {
        id: newId(),
        x: 390,
        y: 0,
        text: 'Drag blocks from the sidebar, snap them into the stack, or drop them back on the sidebar to delete.',
        collapsed: false,
        attached_to: null,
      },
    ],
    variables: ['clicks', 'delay'],
    block_defs: [],
    settings: defaultMacroSettings(),
  };
}

state.current_macro = starterMacro();
