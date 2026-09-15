<script setup lang="ts">
import { AppDropdown, PaletteNumberField } from 'blockstitch';
import { VARIABLES, type InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'SetVariable'> }>();
</script>

<template>
  <span class="instruction-label">set</span>
  <AppDropdown
    :options="VARIABLES"
    :model-value="instruction.name"
    placeholder="variable"
    class-name="dd-compact"
    @update:model-value="v => (props.instruction.name = v)"
  />
  <span class="instruction-label">to</span>
  <PaletteNumberField v-model="props.instruction.value" />
</template>
