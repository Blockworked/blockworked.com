<script setup lang="ts">
// Static sidebar preview for every C-block — the palette never nests values
// or instructions (the sidebar refuses drops), so, like Blockwork's own
// PaletteIfFields/PaletteRepeatFields/…, this only draws the hollow bracket
// with a blank condition or a literal count.
import { PaletteNumberField } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'If' | 'IfElse' | 'Repeat' | 'Forever' | 'While'>; part: 'head' | 'body' }>();
</script>

<template>
  <template v-if="part === 'head'">
    <template v-if="instruction.type === 'Repeat'">
      <span class="instruction-label">repeat</span>
      <PaletteNumberField :model-value="instruction.count" @update:model-value="v => { if (props.instruction.type === 'Repeat') props.instruction.count = v; }" />
    </template>
    <span v-else-if="instruction.type === 'Forever'" class="instruction-label">forever</span>
    <template v-else>
      <span class="instruction-label">{{ instruction.type === 'While' ? 'while' : 'if' }}</span>
      <span class="value-block value-hex-blank"><span class="value-op value-hex-blank-spacer">&nbsp;</span></span>
      <span v-if="instruction.type !== 'While'" class="instruction-label">then</span>
    </template>
  </template>
  <template v-else-if="instruction.type === 'IfElse'">
    <div class="wrap-mouth" />
    <div class="wrap-mid-bar"><span class="instruction-label">else</span></div>
    <div class="wrap-mouth" />
  </template>
  <div v-else class="wrap-mouth" />
</template>
