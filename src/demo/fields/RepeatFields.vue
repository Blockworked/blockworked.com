<script setup lang="ts">
import { computed } from 'vue';
import { InstructionList, ValueBlock, bodyBasePath, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'Repeat'>; part: 'head' | 'body' }>();

const bodyPath = computed(() => bodyBasePath(props.path, 0));
</script>

<template>
  <template v-if="part === 'head'">
    <span class="instruction-label">repeat</span>
    <ValueBlock :location="fieldLocation(strandId, path, 'RepeatCount')" :value="instruction.count" />
  </template>
  <div v-else class="wrap-mouth">
    <InstructionList :strand-id="strandId" :base-path="bodyPath" :instructions="instruction.body" />
  </div>
</template>
