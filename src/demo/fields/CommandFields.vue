<script setup lang="ts">
import { AutosizeInput, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Command'> }>();
</script>

<template>
  <span class="instruction-label">Command:</span>
  <AutosizeInput :model-value="instruction.command" :min-chars="6" placeholder="bash -c …" />
</template>
