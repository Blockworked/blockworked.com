<script setup lang="ts">
import { AppDropdown, type NodePath } from 'blockstitch';
import type { InstructionOf, KeyDirection } from '../types';

defineProps<{ strandId?: string; path?: NodePath; instruction: InstructionOf<'Button'> }>();
</script>

<template>
  <span class="instruction-label">Mouse:</span>
  <AppDropdown
    :options="['Left', 'Right', 'Middle', 'Side', 'Extra']"
    :model-value="instruction.button"
    class-name="dd-compact"
    @update:model-value="v => (instruction.button = v)"
  />
  <AppDropdown
    :options="['Click', 'Press', 'Release']"
    :model-value="instruction.direction"
    class-name="dd-compact"
    @update:model-value="v => (instruction.direction = v as KeyDirection)"
  />
</template>
