<script setup lang="ts">
import { Play } from 'lucide-vue-next';
import type { NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId?: string; path?: NodePath; instruction: InstructionOf<'WhenRan'> }>();
</script>

<template>
  <Play />
  <span class="instruction-label when-ran-label">When Ran</span>
</template>
