<script setup lang="ts">
// Shared by the canvas row and its sidebar prefab. Blockwork captures the key
// natively through its input backend; the demo listens for the next keydown in
// the page instead. Like the app, a Key block holds exactly one key — a
// shortcut is several blocks (press Control, click c, release Control) — so
// modifiers are captured as keys in their own right, never combined.
import { ref, onBeforeUnmount } from 'vue';
import { AppDropdown, type NodePath } from 'blockstitch';
import type { InstructionOf, KeyDirection } from '../types';

const props = defineProps<{ strandId?: string; path?: NodePath; instruction: InstructionOf<'Key'> }>();

// KeyboardEvent.code → Blockwork's key names (blockwork-core/src/input/key_names.rs).
const CODE_NAMES: Record<string, string> = {
  ControlLeft: 'LeftControl', ControlRight: 'RightControl',
  ShiftLeft: 'LeftShift', ShiftRight: 'RightShift',
  AltLeft: 'LeftAlt', AltRight: 'AltGr',
  MetaLeft: 'Meta', MetaRight: 'Meta',
  ArrowLeft: 'LeftArrow', ArrowRight: 'RightArrow', ArrowUp: 'UpArrow', ArrowDown: 'DownArrow',
  Enter: 'Enter', NumpadEnter: 'Enter', Escape: 'Escape', Space: 'Space', Tab: 'Tab', Backspace: 'Backspace',
  CapsLock: 'CapsLock', Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End',
  PageUp: 'PageUp', PageDown: 'PageDown', NumLock: 'NumLock', ScrollLock: 'ScrollLock',
  Pause: 'Pause', PrintScreen: 'PrintScr',
  AudioVolumeDown: 'VolumeDown', AudioVolumeMute: 'VolumeMute', AudioVolumeUp: 'VolumeUp',
};

function keyName(e: KeyboardEvent): string | null {
  if (CODE_NAMES[e.code]) return CODE_NAMES[e.code];
  if (/^F([1-9]|1\d|2[0-4])$/.test(e.code)) return e.code;
  if (e.key.length === 1) return e.key.toLowerCase();
  return null;
}

const capturing = ref(false);

function onKeyDown(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
  const name = keyName(e);
  if (name) props.instruction.key = name;
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
