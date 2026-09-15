<script setup lang="ts">
import { AppDropdown, ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Scroll'> }>();
</script>

<template>
  <span class="instruction-label">Scroll:</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'ScrollAmount')" :value="instruction.amount" />
  <AppDropdown
    :options="['Vertical', 'Horizontal']"
    :model-value="instruction.axis"
    class-name="dd-compact"
    @update:model-value="v => (instruction.axis = v)"
  />
</template>
