<script setup>
import { computed } from 'vue';
const props = defineProps({ state: { type: Object, required: true }, trial: String });
const inPhrase = computed(() => props.trial === 'phrase');
const width = computed(() => inPhrase.value ? 760 : 620);
const handStatus = bass => {
  const notes = props.state.notes.filter(note => note.bass === bass);
  return notes.length ? `${notes.filter(note => props.state.matched.has(note.midi)).length} / ${notes.length}` : '休息';
};
const frames = computed(() => {
  const state = props.state;
  const start = Math.floor(Math.min(state.phraseIndex, Math.max(0, state.phrase.length - 1)) / 4) * 4;
  const groups = inPhrase.value ? state.phrase.slice(start, start + 4) : [state.notes];
  const previous = new Map();
  return groups.map((group, column) => {
    const index = start + column, current = !inPhrase.value || index === state.phraseIndex;
    const past = inPhrase.value && (index < state.phraseIndex || state.phraseFinished);
    const center = inPhrase.value ? 235 + column * 140 : 335;
    const needsSign = note => note.alteration !== 0 || (inPhrase.value && (previous.get(note.index) || 0) !== 0);
    const glyphs = group.map(note => {
      const y = note.bass ? 225 - note.index * 9 : 120 - (note.index - 7) * 9;
      const hand = group.filter(other => other.bass === note.bass);
      const shift = hand.length === 2 && hand[1].index - hand[0].index === 1 && note.index === hand[1].index ? 21 : 0;
      const x = center + shift, done = past || (current && state.matched.has(note.midi));
      const color = done ? '#7db582' : note.bass ? '#69a3b7' : '#9876bc';
      const ledgers = [];
      for (let ly = (note.bass ? 252 : 102) + 18; ly <= y; ly += 18) ledgers.push(ly);
      for (let ly = (note.bass ? 180 : 30) - 18; ly >= y; ly -= 18) ledgers.push(ly);
      return { ...note, x, y, color, done, ledgers, showSign: needsSign(note), signX: center - 36 - hand.filter(needsSign).findIndex(other => other.index === note.index) * 24 };
    });
    group.forEach(note => previous.set(note.index, note.alteration));
    return { index, current, past, center, glyphs };
  });
});
const label = computed(() => inPhrase.value
  ? `乐句共 ${props.state.phrase.length} 组，当前第 ${props.state.phraseIndex + 1} 组，已弹对 ${props.state.matched.size} 个音`
  : `大谱表，本题共 ${props.state.notes.length} 个音符，已弹对 ${props.state.matched.size} 个`);
</script>

<template>
  <div class="hand-status"><span>左手 <b id="left-status">{{ handStatus(true) }}</b></span><span>右手 <b id="right-status">{{ handStatus(false) }}</b></span></div>
  <svg id="staff" :viewBox="`0 0 ${width} ${inPhrase ? 295 : 285}`" role="img" :aria-label="label">
    <g v-for="top in [30, 180]" :key="top">
      <line v-for="n in 5" :key="n" x1="95" :y1="top + (n - 1) * 18" :x2="width - 25" :y2="top + (n - 1) * 18" stroke="#b5a8c4" stroke-width="1.3" />
    </g>
    <path d="M81 30 Q60 30 76 108 Q82 132 64 141 Q82 150 76 174 Q60 252 81 252" fill="none" stroke="#ad9abb" stroke-width="3" />
    <line x1="95" y1="30" x2="95" y2="252" stroke="#ad9abb" />
    <text x="108" y="111" font-family="Segoe UI Symbol,serif" font-size="105" fill="#8c74a1">𝄞</text><text x="108" y="241" font-family="Segoe UI Symbol,serif" font-size="73" fill="#7ba8b5">𝄢</text>
    <text x="8" y="76" font-size="13" fill="#a68bc5">右手</text><text x="8" y="225" font-size="13" fill="#7ca8b7">左手</text>
    <g v-for="frame in frames" :key="frame.index">
      <template v-if="inPhrase">
        <rect class="phrase-column" :class="{ current: frame.current && !state.phraseFinished }" :x="frame.center - 65" y="7" width="126" height="263" rx="13" :fill="frame.past ? '#edf7e8' : frame.current ? '#f2e8fd' : 'transparent'" fill-opacity=".65" />
        <text :x="frame.center" y="283" text-anchor="middle" font-size="12" :fill="frame.past ? '#7caf80' : '#a18cb7'">{{ frame.past ? '✓' : frame.index + 1 }}</text>
      </template>
      <g v-for="note in frame.glyphs" :key="note.index">
        <text v-if="note.showSign" class="accidental" :data-alteration="note.alteration" :x="note.signX" :y="note.y" dominant-baseline="central" font-family="Segoe UI Symbol,serif" font-size="29" :fill="note.color">{{ note.alteration === 1 ? '♯' : note.alteration === -1 ? '♭' : '♮' }}</text>
        <line v-for="y in note.ledgers" :key="y" :x1="note.x - 23" :y1="y" :x2="note.x + 23" :y2="y" :stroke="note.color" stroke-width="1.5" />
        <ellipse :data-note="note.index" :data-midi="note.midi" :data-group="inPhrase ? frame.index : 0" :cx="note.x" :cy="note.y" rx="12" ry="8" :transform="`rotate(-18 ${note.x} ${note.y})`" :fill="note.color" />
        <line :x1="note.x + 11" :y1="note.y - 3" :x2="note.x + 11" :y2="note.y - 52" :stroke="note.color" stroke-width="2.5" />
        <text v-if="note.done && !inPhrase" :x="note.x + 38" :y="note.y + 4" font-size="14" fill="#7db582">✓</text>
      </g>
    </g>
    <template v-if="inPhrase"><line v-for="top in [30, 180]" :key="top" :x1="width - 25" :y1="top" :x2="width - 25" :y2="top + 72" stroke="#9f8cb5" stroke-width="3" /></template>
  </svg>
</template>
