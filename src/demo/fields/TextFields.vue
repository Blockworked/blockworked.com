<script setup lang="ts">
import { ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Text'> }>();
</script>

<template>
  <span class="instruction-label">Text:</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'TextValue')" :value="instruction.text" />
</template>
