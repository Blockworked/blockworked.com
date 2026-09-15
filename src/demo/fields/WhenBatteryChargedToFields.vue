<script setup lang="ts">
import { BatteryCharging } from 'lucide-vue-next';
import { ValueBlock, fieldLocation, type NodePath } from 'blockstitch';
import type { InstructionOf } from '../types';

defineProps<{ strandId: string; path: NodePath; instruction: InstructionOf<'WhenBatteryChargedTo'> }>();
</script>

<template>
  <BatteryCharging />
  <span class="instruction-label when-ran-label">When battery charged to</span>
  <ValueBlock :location="fieldLocation(strandId, path, 'BatteryChargeThreshold')" :value="instruction.threshold" />
  <span class="instruction-label">%</span>
</template>
