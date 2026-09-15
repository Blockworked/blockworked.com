<script setup lang="ts">
// Blockwork's BlockHeaderFields renders the BlockDef's pieces; the demo's
// stand-in carries a label and parameter names directly.
import { Blocks } from 'lucide-vue-next';
import { PaletteValueBlock, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'BlockHeader'> }>();
</script>

<template>
  <Blocks class="custom-block-header-icon" />
  <span class="instruction-label block-header-label">{{ instruction.label }}</span>
  <PaletteValueBlock
    v-for="name in instruction.params"
    :key="name"
    class="blockwork-custom-value-block"
    :style="{ '--blockwork-custom-block-color': instruction.color }"
    :kind="`Param:${name}`"
  />
</template>
