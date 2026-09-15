<script setup lang="ts">
// Shared by the canvas row and its sidebar prefab. Blockwork captures the key
// natively through its input backend; the demo just listens for the next
// keydown in the page.
import { ref, onBeforeUnmount } from 'vue';
import { AppDropdown, type NodePath } from 'blockstitch';
import type { InstructionOf, KeyDirection } from '../types';

const props = defineProps<{ strandId?: string; path?: NodePath; instruction: InstructionOf<'Key'> }>();

const capturing = ref(false);

function onKeyDown(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && e.key.length > 1 && 'Shift', e.metaKey && 'Super'].filter(Boolean);
    const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    props.instruction.key = [...mods, key].join('+');
  }
  stop();
}

function stop() {
  capturing.value = false;
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('pointerdown', stop, true);
}

function start() {
  if (capturing.value) return stop();
  capturing.value = true;
  window.addEventListener('keydown', onKeyDown, true);
  // Clicking anywhere else cancels, like losing focus in the app.
  setTimeout(() => window.addEventListener('pointerdown', stop, true));
}

onBeforeUnmount(stop);
</script>

<template>
  <span class="instruction-label">Key:</span>
  <button class="btn-chip key-capture-btn" :class="{ capturing }" @click="start">{{ capturing ? 'Press any key…' : instruction.key }}</button>
  <AppDropdown
    :options="['Click', 'Press', 'Release']"
    :model-value="instruction.direction"
    class-name="dd-compact"
    @update:model-value="v => (instruction.direction = v as KeyDirection)"
  />
</template>
