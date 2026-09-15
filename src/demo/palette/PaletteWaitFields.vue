<script setup lang="ts">
import { PaletteNumberField } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'Wait'> }>();
</script>

<template>
  <span class="instruction-label">Wait (ms):</span>
  <PaletteNumberField v-model="props.instruction.duration" />
</template>
