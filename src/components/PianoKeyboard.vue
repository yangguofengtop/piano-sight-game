<script setup>
import { computed, ref } from 'vue';
import { whiteKeys, blackKeys } from '../music.js';

const props = defineProps({ state: { type: Object, required: true }, inputHelp: String });
const emit = defineEmits(['press', 'release']);
const view = ref('all');
const bounds = computed(() => view.value === 'left' ? [0, 7] : view.value === 'right' ? [7, 21] : view.value === 'duet' ? [0, 14] : [0, 21]);
const captions = ['左手 · C3—B3', '右手 · C4—B4', '高音扩展 · C5—B5'];
const visible = key => key.index >= bounds.value[0] && key.index < bounds.value[1];
function classes(key) {
  return { active: props.state.held.has(key.id), correct: props.state.matched.has(key.id), wrong: props.state.wrong.has(key.id), hinted: props.state.hinted.has(key.id) };
}
function blackStyle(key) {
  const count = bounds.value[1] - bounds.value[0];
  return { left: `${(key.index - bounds.value[0] + 1) * 100 / count - 100 / count * .315}%`, width: `${100 / count * .63}%` };
}
function pointerDown(event, midi) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); emit('press', midi); }
function accessibleClick(event, midi) { if (event.detail === 0) { emit('press', midi); emit('release', midi); } }
</script>

<template>
  <div class="keyboard-tools" role="group" aria-label="琴键显示范围">
    <span>琴键视图</span>
    <button v-for="[value, label] in [['all', '全部'], ['duet', '双手'], ['left', '左手'], ['right', '右手']]" :key="value" :data-keyview="value" :aria-pressed="view === value" :class="{ selected: view === value }" @click="view = value">{{ label }}</button>
  </div>
  <p class="accidental-guide">♯ 升半音 · ♭ 降半音 · 黑键上的两个音名，对应同一个琴键</p>
  <div class="keyboard-caption" :style="{ gridTemplateColumns: `repeat(${(bounds[1] - bounds[0]) / 7}, 1fr)` }">
    <span v-for="(caption, index) in captions" :key="caption" :hidden="index * 7 < bounds[0] || index * 7 >= bounds[1]">{{ caption }}</span>
  </div>
  <div class="keyboard-scroll">
    <div id="keyboard" class="keyboard" :data-view="view" aria-label="三八度钢琴键盘">
      <button v-for="key in whiteKeys" :key="key.id" class="key piano-key" :class="[`octave-${key.octave}`, classes(key)]" :data-midi="key.id" :data-index="key.index" :hidden="!visible(key)" :aria-label="`${key.index < 7 ? '左手' : '右手'} ${key.syllable} ${key.label}`" :aria-pressed="state.held.has(key.id)" @pointerdown="pointerDown($event, key.id)" @pointerup="emit('release', key.id)" @pointercancel="emit('release', key.id)" @lostpointercapture="emit('release', key.id)" @click="accessibleClick($event, key.id)">
        <span class="solfege">{{ key.syllable }}</span><span class="note">{{ key.label }}</span><span class="shortcut">{{ key.shortcut.toUpperCase() }}</span>
      </button>
      <button v-for="key in blackKeys" :key="key.id" class="black piano-key" :class="classes(key)" :style="blackStyle(key)" :data-midi="key.id" :hidden="!visible(key)" :aria-label="key.label" :aria-pressed="state.held.has(key.id)" @pointerdown="pointerDown($event, key.id)" @pointerup="emit('release', key.id)" @pointercancel="emit('release', key.id)" @lostpointercapture="emit('release', key.id)" @click="accessibleClick($event, key.id)">
        <span>{{ key.sharp }}<br>{{ key.flat }}</span><small>{{ key.shortcut }}</small>
      </button>
    </div>
  </div>
  <p id="input-help">{{ inputHelp }}</p>
  <p class="shortcut-guide">左手 Z X C V B N M · 右手 A S D F G H J · 高音 Q W E R T Y U<br>黑键 1 2 3 4 5 · 6 7 8 9 0 · - = [ ] \</p>
</template>
