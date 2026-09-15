<script setup lang="ts">
// Blockwork's CallBlockFields renders the called BlockDef's pieces; the demo's
// stand-in carries a single label + input directly.
import { ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'CallBlock'> }>();
</script>

<template>
  <span class="instruction-label">{{ instruction.label }}</span>
  <ValueBlock
    v-for="(arg, i) in instruction.args"
    :key="i"
    :location="fieldLocation(strandId, path, `CallArg:${i}`)"
    :value="arg"
  />
</template>
