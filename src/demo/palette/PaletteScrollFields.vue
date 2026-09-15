<script setup lang="ts">
import { AppDropdown, PaletteNumberField } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'Scroll'> }>();
</script>

<template>
  <span class="instruction-label">Scroll:</span>
  <PaletteNumberField v-model="props.instruction.amount" />
  <AppDropdown
    :options="['Vertical', 'Horizontal']"
    :model-value="instruction.axis"
    class-name="dd-compact"
    @update:model-value="v => (props.instruction.axis = v)"
  />
</template>
