<script setup lang="ts">
import { AppDropdown, ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'MoveMouse'> }>();
</script>

<template>
  <span class="instruction-label">Move mouse:</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'MoveMouseX')" :value="instruction.x" placeholder="X" />
  <ValueBlock :location="fieldLocation(strandId, path, 'MoveMouseY')" :value="instruction.y" placeholder="Y" />
  <AppDropdown
    :options="['Absolute', 'Relative']"
    :model-value="instruction.coordinate"
    class-name="dd-compact"
    @update:model-value="v => (instruction.coordinate = v)"
  />
</template>
