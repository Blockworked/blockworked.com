<script setup lang="ts">
// A live, working slice of Blockwork's editor built from blockstitch's real
// components — same layout as Blockwork's MacroEditor.vue + InstructionSidebar.vue.
// blockstitch addresses the canvas and sidebar by fixed element ids
// (#canvas-scroll, #instruction-sidebar, …), so only one of these can exist
// per page.
import { Trash2, RotateCcw } from 'lucide-vue-next';
import { AppButton, Canvas, PaletteInstructionBlock, PaletteValueBlock, beginSidebarResize, sidebarWidth, type ValueNode } from 'blockstitch';
import {
  PALETTE_INSTRUCTIONS, PALETTE_VALUE_KINDS, PALETTE_VARIABLE_INSTRUCTIONS,
  paletteInstructions, paletteValues, setupDemo,
} from './setup';
import { resetDocument } from './store';
import { VARIABLES } from './types';

setupDemo();

// blockstitch's default sidebar width suits a full app window; start narrower
// inside the page unless the visitor has already dragged it themselves.
try {
  if (localStorage.getItem('blockstitch-sidebar-width') === null) sidebarWidth.value = window.innerWidth < 700 ? 180 : 250;
} catch {
  sidebarWidth.value = 250;
}

function onValueUpdate(kind: string, next: ValueNode) {
  paletteValues[kind] = next;
}

function preventMenu(event: MouseEvent) {
  if ((event.target as Element | null)?.closest('input, textarea')) return;
  event.preventDefault();
}
</script>

<template>
  <div id="macro-editor" class="demo-editor">
    <div class="editor-title-row">
      <span class="demo-title">Try it — this is the real block editor</span>
      <span class="demo-hint">Drag blocks in from the sidebar · click an operator to preview it</span>
      <AppButton class="demo-reset" :icon="RotateCcw" label="Reset" title="Restore the example macro" @click="resetDocument" />
    </div>

    <div class="editor-content-area">
      <div class="instruction-sidebar" id="instruction-sidebar" :style="{ width: sidebarWidth + 'px' }" @contextmenu="preventMenu">
        <div class="sidebar-trash-hint">
          <Trash2 />
          <span>Drag a block here to delete it</span>
        </div>
        <div class="sidebar-scroll">
          <div class="sidebar-palette">
            <PaletteInstructionBlock v-for="type in PALETTE_INSTRUCTIONS" :key="type" :type="type" :instruction="paletteInstructions[type]" />
          </div>

          <div class="sidebar-section-label">Operator</div>
          <div class="sidebar-palette sidebar-palette-values">
            <PaletteValueBlock
              v-for="kind in PALETTE_VALUE_KINDS"
              :key="kind"
              :kind="kind"
              :value="paletteValues[kind]"
              @update:value="v => onValueUpdate(kind, v)"
            />
          </div>

          <div class="sidebar-section-label">Variables</div>
          <div class="sidebar-palette sidebar-palette-values">
            <PaletteValueBlock v-for="name in VARIABLES" :key="name" :kind="`Var:${name}`" />
          </div>
          <div class="sidebar-palette">
            <PaletteInstructionBlock v-for="type in PALETTE_VARIABLE_INSTRUCTIONS" :key="type" :type="type" :instruction="paletteInstructions[type]" />
          </div>
        </div>
        <div class="sidebar-resize-handle" @pointerdown="beginSidebarResize" />
      </div>
      <Canvas />
    </div>
  </div>
</template>

<style scoped>
/* #macro-editor normally fills the app window; here it's a framed panel. */
.demo-editor {
  height: 100%;
  border-top: none;
}
.demo-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.demo-hint {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--blockstitch-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.instruction-sidebar {
  max-width: 42%;
}
@media (max-width: 640px) {
  .demo-hint { display: none; }
  .demo-title { flex: 1; overflow: hidden; text-overflow: ellipsis; }
}
</style>
