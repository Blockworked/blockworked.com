<script setup lang="ts">
// A static, non-interactive block stack for page illustrations, rendered by
// blockstitch's real InstructionList/InstructionRow/ValueBlock with
// Blockwork's own field components — so the feature cards look exactly like
// the editor instead of approximating its markup by hand. Its lists sit
// outside any `.strand-card`, so the canvas's drag/snap code never treats
// them as drop targets.
import { computed, nextTick, onMounted, ref } from 'vue';
import { InstructionList } from 'blockstitch';
import { setupBlockstitch } from '../blockwork/blockstitchSetup';
import { findBlockDef, newId, numberValue, previewBlockDefs, type InstructionDto, type ValueDto } from '../blockwork/types';

const props = defineProps<{ preset: string }>();

setupBlockstitch();

const LOG_IN_BLOCK = 'preview-log-in-as';
if (!previewBlockDefs.some(d => d.id === LOG_IN_BLOCK)) {
  previewBlockDefs.push({
    id: LOG_IN_BLOCK,
    pieces: [
      { kind: 'Label', id: newId(), text: 'log in as' },
      { kind: 'Input', id: newId(), name: 'user', value_type: 'Any' },
    ],
    shape: 'Normal',
    color: '#BF5AF2',
  });
}

const op = (name: Extract<ValueDto, { kind: 'Op' }>['op'], ...args: ValueDto[]): ValueDto => ({ kind: 'Op', op: name, args, saved: numberValue(0) });
const variable = (name: string): ValueDto => ({ kind: 'Var', name });
const id = () => newId();

const PRESETS: Record<string, () => InstructionDto[]> = {
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
    { id: id(), type: 'BlockHeader', block_id: LOG_IN_BLOCK },
    { id: id(), type: 'Text', text: { kind: 'Param', name: 'user' } },
    { id: id(), type: 'Key', key: 'Enter', direction: 'Click' },
  ],
  battery: () => [
    { id: id(), type: 'WhenBatteryChargedTo', threshold: numberValue(100) },
    { id: id(), type: 'Command', command: 'notify-send "Fully charged"' },
  ],
};

const instructions = computed(() => PRESETS[props.preset]?.() ?? []);
const root = ref<HTMLElement>();

// The same row-level accent CustomBlockCanvasColorSync applies in the editor.
onMounted(async () => {
  await nextTick();
  for (const ins of instructions.value) {
    if (ins.type !== 'BlockHeader' && ins.type !== 'CallBlock') continue;
    const color = findBlockDef(null, ins.block_id)?.color;
    const row = root.value?.querySelector<HTMLElement>(`.instruction-row[data-instr-id="${ins.id}"]`);
    if (!row || !color) continue;
    row.classList.add('blockwork-custom-block');
    row.style.setProperty('--blockwork-custom-block-color', color);
  }
});
</script>

<template>
  <div ref="root" class="block-preview" inert>
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
