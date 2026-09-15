<script setup lang="ts">
import { AppDropdown, ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import { VARIABLES, type InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'ChangeVariable'> }>();
</script>

<template>
  <span class="instruction-label">change</span>
  <AppDropdown
    :options="VARIABLES"
    :model-value="instruction.name"
    placeholder="variable"
    class-name="dd-compact"
    @update:model-value="v => (instruction.name = v)"
  />
  <span class="instruction-label">by</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'ChangeVariableValue')" :value="instruction.value" />
</template>
