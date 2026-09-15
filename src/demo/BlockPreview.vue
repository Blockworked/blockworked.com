<script setup lang="ts">
// A static, non-interactive block stack for page illustrations, rendered by
// blockstitch's real InstructionList/InstructionRow/ValueBlock — so the
// feature cards look exactly like the editor instead of approximating its
// markup by hand. Its lists sit outside
// any `.strand-card`, so the canvas's drag/snap code never treats them as
// drop targets.
import { computed } from 'vue';
import { InstructionList, newId, numberValue, textValue, type ValueNode } from 'blockstitch';
import { setupDemo } from './setup';
import type { Instruction } from './types';

const props = defineProps<{ preset: string }>();

setupDemo();

const op = (name: string, ...args: ValueNode[]): ValueNode => ({ kind: 'Op', op: name, args, saved: numberValue(0) });
const variable = (name: string): ValueNode => ({ kind: 'Var', name });
const id = () => newId();

const PRESETS: Record<string, () => Instruction[]> = {
  'key-mouse': () => [
    { id: id(), type: 'Key', key: 'Enter', direction: 'Click' },
    { id: id(), type: 'Button', button: 'Left', direction: 'Click' },
  ],
  'if-click': () => [
    {
      id: id(),
      type: 'If',
      condition: op('Lt', variable('clicks'), numberValue(100)),
      body: [{ id: id(), type: 'Button', button: 'Left', direction: 'Click' }],
    },
  ],
  'set-random': () => [
    { id: id(), type: 'SetVariable', name: 'delay', value: op('Random', numberValue(80), numberValue(120)) },
  ],
  'custom-block': () => [
    { id: id(), type: 'CallBlock', label: 'log in as', args: [textValue('player1')], color: '#bf5af2' },
  ],
  battery: () => [
    { id: id(), type: 'WhenBatteryChargedTo', threshold: numberValue(80) },
  ],
};

const instructions = computed(() => PRESETS[props.preset]?.() ?? []);
</script>

<template>
  <div class="block-preview" inert>
    <InstructionList :strand-id="`preview-${preset}`" :base-path="[]" :instructions="instructions" :show-empty-hint="false" />
  </div>
</template>

<style scoped>
.block-preview {
  pointer-events: none;
  user-select: none;
  font-size: 14px;
  line-height: normal;
  text-align: left;
}
/* The last row's negative margin (how stacked rows overlap the next notch)
   would clip its own bottom tab at the edge of the preview. Only the top-level
   list needs the room back — a nested body inside a C-block must stay flush
   against the bracket's foot bar. */
.block-preview > :deep(.strand-body) {
  padding-bottom: var(--blockstitch-connector-notch-depth);
}
</style>
