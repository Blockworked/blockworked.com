<script setup lang="ts">
// The "Snap together" illustration: a Mouse block is carried over a Key block
// and dropped onto it, on a loop. Everything on screen is blockstitch's own
// markup and drag classes — the carried block is a `.strand-drag-ghost`, and
// the landing spot is the real second row showing `.strand-snap-preview`,
// which is exactly how the editor previews a drop.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
// lucide's `hand-grab` is still named `Grab` in this lucide-vue-next version.
import { Grab as HandGrab, Hand } from 'lucide-vue-next';
import { InstructionList } from 'blockstitch';
import { setupBlockstitch } from '../blockwork/blockstitchSetup';
import { newId, type InstructionDto } from '../blockwork/types';

setupBlockstitch();

const stack: InstructionDto[] = [
  { id: newId(), type: 'Key', key: 'Enter', direction: 'Click' },
  { id: newId(), type: 'Button', button: 'Left', direction: 'Click' },
];
const carried: InstructionDto[] = [{ ...stack[1], id: newId() }];

/** Where the carried block starts, relative to where it lands. */
const START = { x: 80, y: 78 };
/** Where it's held — close enough to snap — before being let go. */
const HOVER = { x: 34, y: 38 };

const stage = ref<HTMLElement>();
const ghost = ref<HTMLElement>();
type Phase = 'idle' | 'carry' | 'near' | 'placed' | 'fade';
const phase = ref<Phase>('placed');

let timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

function landing() {
  const row = stage.value?.querySelectorAll<HTMLElement>('.snap-target > .strand-body > .instruction-row')[1];
  if (!row || !stage.value) return { x: 0, y: 0 };
  const s = stage.value.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  // getBoundingClientRect is in zoomed pixels; the ghost's offsets are not.
  const zoom = s.width / stage.value.offsetWidth || 1;
  return { x: (r.left - s.left) / zoom, y: (r.top - s.top) / zoom };
}

function place(x: number, y: number, animate: boolean) {
  const el = ghost.value;
  if (!el) return;
  el.style.transition = animate ? 'transform 900ms cubic-bezier(0.45, 0, 0.25, 1)' : 'none';
  el.style.transform = `translate(${x}px, ${y}px)`;
}

let landingRow: HTMLElement | undefined;
watch(phase, p => landingRow?.classList.toggle('strand-snap-preview', p === 'near'));

function cycle() {
  timers.forEach(clearTimeout);
  timers = [];
  const end = landing();
  place(end.x + START.x, end.y + START.y, false);
  phase.value = 'idle';
  later(900, () => {
    phase.value = 'carry';
    place(end.x + HOVER.x, end.y + HOVER.y, true);
  });
  // Within snapping range: the drop spot lights up while the block is held.
  later(1650, () => (phase.value = 'near'));
  later(2600, () => {
    phase.value = 'placed';
    place(end.x, end.y, false);
  });
  later(5000, () => (phase.value = 'fade'));
  later(5300, cycle);
}

let motion: MediaQueryList | undefined;
const onMotionChange = () => {
  timers.forEach(clearTimeout);
  timers = [];
  if (motion?.matches) phase.value = 'placed';
  else cycle();
};

onMounted(async () => {
  await nextTick();
  landingRow = stage.value?.querySelectorAll<HTMLElement>('.snap-target > .strand-body > .instruction-row')[1];
  landingRow?.classList.add('snap-landing');
  motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', onMotionChange);
  onMotionChange();
});
onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
  motion?.removeEventListener('change', onMotionChange);
});
</script>

<template>
  <div ref="stage" class="snap-preview block-preview" :class="`snap-${phase}`" inert>
    <div class="snap-target">
      <InstructionList strand-id="preview-snap" :base-path="[]" :instructions="stack" :show-empty-hint="false" />
    </div>
    <div ref="ghost" class="snap-ghost" :class="{ 'strand-drag-ghost': phase === 'carry' || phase === 'near' }">
      <InstructionList strand-id="preview-snap-ghost" :base-path="[]" :instructions="carried" :show-empty-hint="false" />
      <HandGrab v-if="phase === 'carry' || phase === 'near'" class="snap-cursor" />
      <Hand v-else class="snap-cursor" />
    </div>
  </div>
</template>

<style scoped>
.snap-preview {
  position: relative;
  pointer-events: none;
  user-select: none;
  font-size: 14px;
  line-height: normal;
  text-align: left;
  /* Room for the carried block's starting point below and to the right. */
  padding: 0 84px 80px 0;
}
.snap-preview :deep(.strand-body) {
  padding-bottom: var(--blockstitch-connector-notch-depth);
}
.snap-ghost {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  transition: opacity 250ms ease;
}
/* The drop itself is instant — the ghost vanishes as the real row appears. */
.snap-placed .snap-ghost,
.snap-placed :deep(.snap-landing) { transition: none; }
/* Sitting on the canvas, waiting to be picked up. */
.snap-idle .snap-ghost { opacity: 1; }
.snap-cursor {
  position: absolute;
  left: 16px;
  top: 14px;
  width: 20px;
  height: 20px;
  color: var(--blockstitch-text);
  fill: #000;
}
.snap-carry .snap-ghost,
.snap-near .snap-ghost { opacity: 0.92; }
.snap-cursor { opacity: 0; transition: opacity 250ms ease; }
.snap-idle .snap-cursor, .snap-carry .snap-cursor, .snap-near .snap-cursor { opacity: 1; }

/* The second row of the stack is where the block lands: hidden until the
   carried block gets close, then blockstitch's own `.strand-snap-preview`
   (toggled in the script), then the real block. */
.snap-preview :deep(.snap-landing) { transition: opacity 250ms ease; }
.snap-idle :deep(.snap-landing),
.snap-carry :deep(.snap-landing),
.snap-fade :deep(.snap-landing) { opacity: 0; }
</style>
