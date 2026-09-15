<script setup lang="ts">
// The live editor on the home page: Blockwork's own MacroEditor layout
// (ui/src/components/MacroEditor.vue) built from the components copied into
// src/blockwork/, running against the in-browser backend. blockstitch
// addresses the canvas and sidebar by fixed element ids (#canvas-scroll,
// #instruction-sidebar, …), so only one of these can exist per page.
import { onBeforeUnmount, onMounted } from 'vue';
import { Download, RotateCcw } from 'lucide-vue-next';
import { AppButton, Canvas, sidebarWidth } from 'blockstitch';
import { setupBlockstitch } from '../blockwork/blockstitchSetup';
import { state } from '../blockwork/store';
import { exportMacro, keyCaptureEvent, resetMacro } from '../blockwork/tauri';
import InstructionSidebar from '../blockwork/components/InstructionSidebar.vue';
import ContextMenu from '../blockwork/components/ContextMenu.vue';
import DetailsDialog from '../blockwork/components/DetailsDialog.vue';
import CustomBlockCanvasColorSync from '../blockwork/components/CustomBlockCanvasColorSync.vue';

setupBlockstitch();

// blockstitch's default sidebar width suits a full app window; start narrower
// inside the page unless the visitor has already dragged it themselves.
try {
  if (localStorage.getItem('blockstitch-sidebar-width') === null) sidebarWidth.value = window.innerWidth < 700 ? 180 : 250;
} catch {
  sidebarWidth.value = 250;
}

function onTitleInput(e: Event) {
  if (state.current_macro) state.current_macro.name = (e.target as HTMLInputElement).value;
}

// Key blocks capture the next key pressed, like App.vue's keydown handler.
function onKeydown(e: KeyboardEvent) {
  if (state.key_capture == null) return;
  e.preventDefault();
  keyCaptureEvent(e.code, e.key);
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div id="macro-editor" class="demo-editor">
    <div class="editor-title-row">
      <label for="macro-title">Title</label>
      <input id="macro-title" type="text" placeholder="Macro name" :value="state.current_macro?.name" @input="onTitleInput">
      <AppButton :icon="RotateCcw" label="Reset" title="Restore the example macro" @click="resetMacro" />
      <AppButton class="btn-primary" :icon="Download" label="Export" title="Download a .macro file you can import into Blockwork" @click="exportMacro" />
    </div>

    <div class="editor-content-area">
      <InstructionSidebar />
      <Canvas>
        <template #context-menu>
          <ContextMenu />
        </template>
      </Canvas>
    </div>
    <DetailsDialog />
    <CustomBlockCanvasColorSync />
  </div>
</template>

<style scoped>
/* #macro-editor normally fills the app window; here it's a framed panel. */
.demo-editor {
  height: 100%;
  border-top: none;
}
.demo-editor :deep(.instruction-sidebar) {
  max-width: 42%;
}
@media (max-width: 640px) {
  .editor-title-row label { display: none; }
}
</style>
