<script setup lang="ts">
import { computed } from 'vue';
import { InstructionList, ValueBlock, bodyBasePath, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'IfElse'>; part: 'head' | 'body' }>();

const thenPath = computed(() => bodyBasePath(props.path, 0));
const elsePath = computed(() => bodyBasePath(props.path, 1));
</script>

<template>
  <template v-if="part === 'head'">
    <span class="instruction-label">if</span>
    <ValueBlock :location="fieldLocation(strandId, path, 'Condition')" :value="instruction.condition" />
    <span class="instruction-label">then</span>
  </template>
  <template v-else>
    <div class="wrap-mouth">
      <InstructionList :strand-id="strandId" :base-path="thenPath" :instructions="instruction.then_body" />
    </div>
    <div class="wrap-mid-bar"><span class="instruction-label">else</span></div>
    <div class="wrap-mouth">
      <InstructionList :strand-id="strandId" :base-path="elsePath" :instructions="instruction.else_body" />
    </div>
  </template>
</template>
