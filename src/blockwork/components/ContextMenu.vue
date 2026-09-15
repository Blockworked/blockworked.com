<script setup lang="ts">
// Trimmed copy of Blockwork's ui/src/components/ContextMenu.vue: the same
// items and handlers for everything the website supports. Left out: copy/
// cut/paste (Blockwork's clipboard), recording targets, "Delete N Blocks",
// and "Details" (the app's block reference dialog).
import { computed } from 'vue';
import { state } from '../store';
import { contextMenu, closeContextMenu } from '../contextMenu';
import { addInstruction, createAttachedComment, createComment, deleteBlock, deleteInstruction, deleteVariable, setCommentCollapsed } from '../tauri';
import { ContextMenuPanel, clientToCanvas, focusCommentOnMount, type ContextMenuItem } from 'blockstitch';
import { ICONS } from '../icons';
import { openRenameVariableDialog } from '../variableDialogs';
import { openEditBlockDialog } from '../blockDialogs';
import { findBlockDef, nextSiblingPath, regenerateInstructionIds, resolveInstructionAt } from '../types';

const ATTACHED_COMMENT_OFFSET = { dx: 220, dy: 0 };

const strand = computed(() => state.current_macro?.strands.find(s => s.id === contextMenu.strandId) ?? null);
const instruction = computed(() => resolveInstructionAt(strand.value, contextMenu.path));
const headerBlockId = computed(() => (instruction.value?.type === 'BlockHeader' ? instruction.value.block_id : null));
const attachedComment = computed(() => {
  const id = instruction.value?.id;
  if (!id) return null;
  return state.current_macro?.comments?.find(c => c.attached_to === id) ?? null;
});

function onDeleteBlock() {
  if (headerBlockId.value) {
    deleteBlock(headerBlockId.value);
    closeContextMenu();
    return;
  }
  const [x, y] = clientToCanvas(contextMenu.x, contextMenu.y);
  deleteInstruction(contextMenu.strandId, contextMenu.path, x, y);
  closeContextMenu();
}
function onDuplicateBlock() {
  const ins = instruction.value;
  if (ins) addInstruction(contextMenu.strandId, nextSiblingPath(contextMenu.path), regenerateInstructionIds(ins));
  closeContextMenu();
}
async function onAddOrFocusComment() {
  const existing = attachedComment.value;
  if (existing) {
    if (existing.collapsed) await setCommentCollapsed(existing.id, false);
    focusCommentOnMount(existing.id);
  } else {
    const id = instruction.value?.id;
    if (id) focusCommentOnMount(await createAttachedComment(id, ATTACHED_COMMENT_OFFSET.dx, ATTACHED_COMMENT_OFFSET.dy, ''));
  }
  closeContextMenu();
}
async function onAddCanvasComment() {
  focusCommentOnMount(await createComment(contextMenu.canvasX, contextMenu.canvasY, ''));
  closeContextMenu();
}
function onRenameVariable() {
  openRenameVariableDialog(contextMenu.variableName);
  closeContextMenu();
}
function onDeleteVariable() {
  deleteVariable(contextMenu.variableName);
  closeContextMenu();
}
function onEditBlock() {
  const def = findBlockDef(state.current_macro, contextMenu.blockId);
  if (def) openEditBlockDialog(def);
  closeContextMenu();
}
function onEditBlockHeader() {
  const def = headerBlockId.value ? findBlockDef(state.current_macro, headerBlockId.value) : undefined;
  if (def) openEditBlockDialog(def);
  closeContextMenu();
}
function onDeleteBlockDef() {
  deleteBlock(contextMenu.blockId);
  closeContextMenu();
}

const items = computed<ContextMenuItem[]>(() => {
  if (contextMenu.type === 'block') {
    const list: ContextMenuItem[] = [];
    if (headerBlockId.value) {
      list.push({ key: 'edit-header', label: 'Edit block', icon: ICONS.blocks, onSelect: onEditBlockHeader });
    }
    list.push(
      { key: 'duplicate', label: 'Duplicate block', icon: ICONS['corner-down-right'], onSelect: onDuplicateBlock },
      { key: 'comment', label: attachedComment.value ? 'Comment' : 'Add Comment', icon: ICONS['message-square'], onSelect: onAddOrFocusComment },
      { key: 'delete', label: 'Delete block', icon: ICONS.trash, danger: true, onSelect: onDeleteBlock },
    );
    return list;
  }
  if (contextMenu.type === 'canvas') {
    return [{ key: 'add-comment', label: 'Add Comment', icon: ICONS['message-square'], onSelect: onAddCanvasComment }];
  }
  if (contextMenu.type === 'variable') {
    return [
      { key: 'rename', label: 'Rename variable', icon: ICONS.equal, onSelect: onRenameVariable },
      { key: 'delete-var', label: 'Delete variable', icon: ICONS.trash, danger: true, onSelect: onDeleteVariable },
    ];
  }
  return [
    { key: 'edit', label: 'Edit block', icon: ICONS.blocks, onSelect: onEditBlock },
    { key: 'delete-def', label: 'Delete block', icon: ICONS.trash, danger: true, onSelect: onDeleteBlockDef },
  ];
});
</script>

<template>
  <ContextMenuPanel :open="contextMenu.open" :x="contextMenu.x" :y="contextMenu.y" :items="items" @close="closeContextMenu" />
</template>
