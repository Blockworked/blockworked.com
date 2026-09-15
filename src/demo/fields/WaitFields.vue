<script setup lang="ts">
import { ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Wait'> }>();
</script>

<template>
  <span class="instruction-label">Wait (ms):</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'WaitDuration')" :value="instruction.duration" />
</template>
