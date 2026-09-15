<script setup lang="ts">
// Website version of Blockwork's "Choose an App" popup (OpenApp/CloseApp).
// The app lists installed apps from the system; a web page can't, so this
// asks for the app's name and the command that launches it instead — the
// same two things the app stores on the instruction. Emits the same
// `select`/`close` events, so the copied field components use it unchanged.
import { computed, onMounted, ref } from 'vue';
import type { AppEntryDto } from '../types';

const props = withDefaults(defineProps<{ title?: string }>(), { title: 'Choose an App' });
const emit = defineEmits<{ select: [app: AppEntryDto]; close: [] }>();

const name = ref('');
const command = ref('');
const nameInput = ref<HTMLInputElement | null>(null);
const canChoose = computed(() => name.value.trim() !== '' && command.value.trim() !== '');

onMounted(() => nameInput.value?.focus());

function choose() {
  if (!canChoose.value) return;
  emit('select', { name: name.value.trim(), command: command.value.trim(), icon: null });
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @pointerdown.self="emit('close')">
      <div class="modal-panel">
        <h2 class="modal-title">{{ props.title }}</h2>
        <p class="app-selector-note">In Blockwork you pick from your installed apps. Here, type the app's name and the command that launches it.</p>
        <input
          ref="nameInput"
          v-model="name"
          type="text"
          class="modal-input"
          placeholder="App name, like Firefox"
          spellcheck="false"
          @keydown.enter="choose"
          @keydown.esc="emit('close')"
        >
        <input
          v-model="command"
          type="text"
          class="modal-input"
          placeholder="Command, like firefox"
          spellcheck="false"
          @keydown.enter="choose"
          @keydown.esc="emit('close')"
        >
        <div class="modal-actions">
          <button type="button" @click="emit('close')">Cancel</button>
          <button type="button" class="btn-primary" :disabled="!canChoose" @click="choose">OK</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-selector-note {
  margin: 0;
  font-size: 13px;
  color: var(--blockstitch-text-dim);
}
</style>
