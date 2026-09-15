<script setup lang="ts">
import { AppDropdown, PaletteNumberField } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'MoveMouse'> }>();
</script>

<template>
  <span class="instruction-label">Move mouse:</span>
  <PaletteNumberField v-model="props.instruction.x" placeholder="X" />
  <PaletteNumberField v-model="props.instruction.y" placeholder="Y" />
  <AppDropdown
    :options="['Absolute', 'Relative']"
    :model-value="instruction.coordinate"
    class-name="dd-compact"
    @update:model-value="v => (props.instruction.coordinate = v)"
  />
</template>
