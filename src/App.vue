<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { usePianoGame } from './composables/usePianoGame.js';
import GameSettings from './components/GameSettings.vue';
import PianoKeyboard from './components/PianoKeyboard.vue';
import StaffScore from './components/StaffScore.vue';
import MusicBuddy from './components/MusicBuddy.vue';
import RewardsDialog from './components/RewardsDialog.vue';

const game = usePianoGame();
const baseUrl = import.meta.env.BASE_URL;
const { settings, state, accuracy, earnedGifts, questionLabel, clefLabel, phraseProgress, inputHelp } = game;
function changeSetting(field, value) { settings[field] = value; game.reset(); }
function closeRewards() { state.rewardOpen = false; }
onMounted(() => { document.addEventListener('keydown', game.onKeydown); document.addEventListener('keyup', game.onKeyup); window.addEventListener('blur', game.releaseAll); });
onBeforeUnmount(() => { document.removeEventListener('keydown', game.onKeydown); document.removeEventListener('keyup', game.onKeyup); window.removeEventListener('blur', game.releaseAll); });
</script>

<template>
  <header><a class="brand" :href="baseUrl">♫ <span>小小钢琴家<small>每一个音符，都是一次小冒险</small></span></a><button id="sound" class="quiet" :aria-pressed="state.sound" @click="state.sound = !state.sound">{{ state.sound ? '♪ 声音已开启' : '♪ 声音已关闭' }}</button></header>
  <main>
    <div class="intro"><span class="eyebrow">音符森林 · 快乐冒险</span><h1>和小狐狸一起，<em>寻找音乐星星！</em></h1><p>弹对一个音符，点亮一颗星星。你的音乐伙伴在等你！</p><div class="hero-notes" aria-hidden="true">♫ <span>✦</span> ♪</div></div>
    <MusicBuddy :speech="state.buddySpeech" :animation="state.buddyAnimation" :animation-id="state.animationId" :earned="earnedGifts" @open-collection="game.openCollection" />
    <nav class="trial-picker" aria-label="选择试炼">
      <button v-for="item in [{ value: 'basic', number: '01', title: '基础识谱', text: '认识音符 · 左右手配合', icon: '♪' }, { value: 'phrase', number: '02', title: '乐句试炼', text: '读一小段谱 · 连续弹奏', icon: '♫' }]" :key="item.value" :data-trial="item.value" :class="{ selected: settings.trial === item.value }" :aria-pressed="settings.trial === item.value" @click="changeSetting('trial', item.value)"><span>{{ item.number }}</span><div><strong>{{ item.title }}</strong><small>{{ item.text }}</small></div><b>{{ item.icon }}</b></button>
    </nav>
    <GameSettings :settings="settings" @change="changeSetting" />
    <div class="layout"><section class="panel stage" :class="{ success: state.buddyAnimation === 'celebrate' }">
      <div class="stage-top"><span>{{ clefLabel }}</span><span class="pill">{{ settings.mode === 'practice' ? '自由练习' : '60 秒挑战' }}</span></div>
      <div class="stats"><div><strong id="score">{{ state.score }}</strong><span>小星星</span></div><div><strong id="streak">{{ state.streak }}</strong><span>连续答对</span></div><div><strong id="accuracy">{{ accuracy }}</strong><span>正确率</span></div><div><strong id="timer">{{ settings.mode === 'practice' ? '∞' : `${state.remaining}s` }}</strong><span>剩余时间</span></div></div>
      <div v-if="settings.trial === 'phrase'" id="phrase-panel" class="phrase-panel">
        <div class="phrase-toolbar"><div><strong>乐句试炼</strong><span id="phrase-progress">{{ phraseProgress }}</span></div><label for="phrase-length">乐句长度 <select id="phrase-length" :value="settings.phraseLength" @change="changeSetting('phraseLength', Number($event.target.value))"><option :value="4">4 组 · 小小起步</option><option :value="8">8 组 · 连续挑战</option><option :value="12">12 组 · 音乐探险</option></select></label><button class="quiet" @click="game.listenPhrase">{{ state.phraseListening ? '■ 停止试听' : '♫ 听听整段' }}</button></div>
        <div class="phrase-dots" aria-hidden="true"><span v-for="(_, index) in state.phrase" :key="index" :class="{ done: state.phraseFinished || index < state.phraseIndex, active: !state.phraseFinished && index === state.phraseIndex }">{{ state.phraseFinished || index < state.phraseIndex ? '✓' : index + 1 }}</span></div>
        <p>从左向右弹奏高亮音符，每组完成后自动前进；每行四组，不要求节拍速度。♮ 表示恢复自然音。</p>
      </div>
      <div v-if="state.result" id="phrase-result" class="phrase-result" role="status"><div><strong>{{ state.result.title }}</strong><span>{{ state.result.stars }}</span><p>{{ state.result.text }}</p></div><button @click="game.reset">再来一段 →</button></div>
      <div class="question"><span id="question-label">{{ questionLabel }}</span><StaffScore :state="state" :trial="settings.trial" /></div>
      <div id="feedback" :class="state.feedbackType" role="status" aria-live="polite">{{ state.feedback }}</div>
      <PianoKeyboard :state="state" :input-help="inputHelp" @press="game.press" @release="game.release" />
      <div class="actions"><button id="hint" class="quiet" :disabled="state.locked || state.phraseListening" @click="game.hint">✧ 给我一个提示</button><button id="listen" class="quiet" @click="game.listenGroup">{{ settings.trial === 'phrase' ? '♫ 听听当前组' : '♫ 听听这一组' }}</button><button id="restart" class="quiet" @click="game.reset">↻ 重新开始</button></div>
    </section></div>
    <footer>小耳朵听一听，小眼睛看一看，小手弹一弹。<span>每天 5 分钟，和音符成为好朋友。</span></footer>
  </main>
  <div id="particles" aria-hidden="true"><span v-for="particle in state.particles" :key="particle.id" class="particle" :style="particle.style">{{ particle.text }}</span></div>
  <RewardsDialog :state="state" @close="closeRewards" />
</template>
