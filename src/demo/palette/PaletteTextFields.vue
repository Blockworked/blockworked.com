<script setup lang="ts">
import { AutosizeInput, textValue } from 'blockstitch';
import type { InstructionOf } from '../types';

const props = defineProps<{ instruction: InstructionOf<'Text'> }>();
</script>

<template>
  <span class="instruction-label">Text:</span>
  <AutosizeInput
    :model-value="instruction.text.kind === 'Text' ? instruction.text.value : ''"
    :min-chars="6"
    @update:model-value="v => (props.instruction.text = textValue(v))"
  />
</template>
