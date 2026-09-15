<script setup lang="ts">
import { computed } from 'vue';
import { InstructionList, bodyBasePath, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Forever'>; part: 'head' | 'body' }>();

const bodyPath = computed(() => bodyBasePath(props.path, 0));
</script>

<template>
  <span v-if="part === 'head'" class="instruction-label">forever</span>
  <div v-else class="wrap-mouth">
    <InstructionList :strand-id="strandId" :base-path="bodyPath" :instructions="instruction.body" />
  </div>
</template>
