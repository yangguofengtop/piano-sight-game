import { reactive, computed, onScopeDispose } from 'vue';
import { generateGroup, groupSignature, keyByMidi, keyByShortcut } from '../music.js';

export const gifts = [
  { icon: '🌱', name: '音符小芽', at: 5 }, { icon: '🌸', name: '旋律花朵', at: 15 },
  { icon: '🦋', name: '彩虹蝴蝶', at: 30 }, { icon: '👑', name: '音乐皇冠', at: 50 },
];

export function usePianoGame() {
  const settings = reactive({ level: 1, hands: 'duet', inputStyle: 'collect', accidentals: 'mixed', mode: 'practice', trial: 'basic', phraseLength: 4 });
  const state = reactive({
    notes: [], matched: new Set(), held: new Set(), wrong: new Set(), hinted: new Set(),
    score: 0, streak: 0, attempts: 0, correct: 0, remaining: 60, running: false, locked: false,
    sound: true, feedback: '', feedbackType: '', buddySpeech: '', buddyAnimation: '', animationId: 0,
    phrase: [], phraseIndex: 0, phraseFinished: false, phraseListening: false, result: null,
    lifetimeStars: 0, storageAvailable: true, rewardOpen: false,
    rewardTitle: '我的音乐宝藏', rewardDescription: '收集星星，把可爱的礼物带回家！', particles: [],
  });
  let interval, nextTimer, previewTimer, particleTimer, audioContext;
  let previous = '', hadMistake = false, groupCounted = false, phraseStartedAt = null;
  let previewToken = 0, particleSequence = 0;
  try {
    const saved = Number(globalThis.localStorage?.getItem('piano-forest-stars'));
    state.lifetimeStars = Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    state.storageAvailable = !!globalThis.localStorage;
  } catch { state.storageAvailable = false; }

  const accuracy = computed(() => state.attempts ? `${Math.round(state.correct / state.attempts * 100)}%` : '—');
  const targetKeys = computed(() => state.notes.map(note => note.midi));
  const earnedGifts = computed(() => gifts.filter(gift => state.lifetimeStars >= gift.at).length);
  const questionLabel = computed(() => settings.trial === 'phrase'
    ? `从左往右弹，当前第 ${state.phraseIndex + 1} / ${state.phrase.length} 组`
    : settings.hands === 'solo' ? '找到右手的音符吧！'
      : settings.hands === 'chord' ? '左右手各两个音，一起弹出小和弦！' : '上面右手、下面左手，把两个音符都找到！');
  const clefLabel = computed(() => settings.hands === 'solo' ? '♩ 大谱表 · 右手练习' : settings.hands === 'chord' ? '♫ 大谱表 · 双手和弦' : '♫ 大谱表 · 左右手配合');
  const phraseProgress = computed(() => state.phraseFinished ? `已完成 ${state.phrase.length} / ${state.phrase.length} 组`
    : `第 ${state.phraseIndex + 1} / ${state.phrase.length} 组 · 第 ${Math.floor(state.phraseIndex / 4) + 1} 行`);
  const inputHelp = computed(() => settings.inputStyle === 'together'
    ? '按住目标琴键，直到所有音符同时亮起。支持多点触控。' : '逐个点击也可以完成一组；想练真正配合，选择“同时按住”。');

  function feedback(message, type = '') {
    state.feedback = message; state.feedbackType = type;
    if (type === 'good') state.buddySpeech = ['两只小手，配合得真棒！', '米米为你鼓掌！', '音符朋友都到齐啦！'][state.score % 3];
    else if (type === 'bad') { state.buddySpeech = '别着急，看看上下两行音符～'; animate('encourage'); }
  }
  function animate(animation) { state.buddyAnimation = animation; state.animationId++; }
  function play(midi) {
    if (!state.sound) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      audioContext ??= new Audio(); audioContext.resume().catch(() => {});
      const start = audioContext.currentTime;
      for (let harmonic = 1; harmonic <= 3; harmonic++) {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12) * harmonic;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.1 / harmonic ** 2, start + .012);
        gain.gain.exponentialRampToValueAtTime(.001, start + 1.1);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + 1.2);
      }
    } catch { feedback('暂时无法发声，仍可继续识谱。'); }
  }
  function celebrate() {
    animate('celebrate'); state.lifetimeStars++;
    try { globalThis.localStorage?.setItem('piano-forest-stars', String(state.lifetimeStars)); }
    catch { state.storageAvailable = false; }
    if (!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      clearTimeout(particleTimer);
      state.particles = Array.from({ length: 16 }, (_, i) => ({
        id: particleSequence++, text: ['★', '♪', '✦', '●'][i % 4],
        style: { '--x': `${40 + Math.random() * 35}%`, '--dx': `${(Math.random() - .5) * 500}px`, '--dy': `${-80 - Math.random() * 300}px`, '--delay': `${Math.random() * .12}s`, '--color': ['#e7bc61', '#b197d9', '#e7a6bd', '#9bc9ad'][i % 4] },
      }));
      particleTimer = setTimeout(() => { state.particles = []; }, 1500);
    }
    const unlocked = gifts.find(gift => gift.at === state.lifetimeStars);
    if (unlocked) {
      state.rewardTitle = `解锁了！${unlocked.name}`;
      state.rewardDescription = `米米送你一份礼物 ${unlocked.icon}，奖励你的认真练习！`; state.rewardOpen = true;
    }
  }
  function newGroup() { const group = generateGroup(settings, previous); previous = groupSignature(group); return group; }
  function prepareGroup(notes) {
    state.notes = notes; state.matched.clear(); state.held.clear(); state.wrong.clear(); state.hinted.clear();
    state.locked = false; hadMistake = false; groupCounted = false;
  }
  function stopPhrasePreview() { previewToken++; clearTimeout(previewTimer); state.phraseListening = false; }
  function reset() {
    clearInterval(interval); clearTimeout(nextTimer); stopPhrasePreview();
    state.score = state.streak = state.attempts = state.correct = 0; state.remaining = 60; state.running = false;
    state.result = null; state.phraseIndex = 0; state.phraseFinished = false; phraseStartedAt = null;
    state.phrase = settings.trial === 'phrase' ? Array.from({ length: settings.phraseLength }, newGroup) : [];
    prepareGroup(settings.trial === 'phrase' ? state.phrase[0] : newGroup());
    state.buddySpeech = '左手和右手，一起来弹琴吧！';
    feedback(settings.mode === 'challenge' ? '弹下第一个琴键后开始计时，准备好就出发！'
      : settings.trial === 'phrase' ? '先看看整段谱子，再从高亮的第一组开始弹奏。' : '先看上下谱表，再找到左右手对应的琴键。');
  }
  function finish(timedOut = true) {
    state.locked = true; state.running = false; clearInterval(interval); clearTimeout(nextTimer); stopPhrasePreview();
    if (settings.trial === 'phrase') {
      state.phraseFinished = !timedOut;
      const rate = state.attempts ? Math.round(state.correct / state.attempts * 100) : 0;
      const elapsed = phraseStartedAt === null ? 0 : Math.max(1, Math.round((performance.now() - phraseStartedAt) / 1000));
      const stars = rate === 100 ? 3 : rate >= 75 ? 2 : 1;
      state.result = {
        title: timedOut ? '时间到，下次再试试！' : '乐句试炼通关！',
        stars: timedOut ? '继续加油' : '★'.repeat(stars) + '☆'.repeat(3 - stars),
        text: `完成 ${state.score} / ${state.phrase.length} 组 · 首次正确率 ${rate}% · 用时 ${elapsed} 秒`,
      };
    }
    feedback(timedOut ? `挑战完成！完成 ${state.score} 组音符，正确率 ${accuracy.value}。点击“重新开始”再试一次！`
      : '整段通关啦！点击“再来一段”开启下一次冒险。', 'good');
  }
  function startClock() {
    if (settings.mode !== 'challenge' || state.running) return;
    state.running = true;
    interval = setInterval(() => { if (state.rewardOpen || state.phraseListening) return; state.remaining--; if (state.remaining <= 0) finish(); }, 1000);
  }
  function advanceQuestion() {
    if (state.rewardOpen || state.phraseListening) { nextTimer = setTimeout(advanceQuestion, 200); return; }
    if (settings.trial === 'phrase') {
      if (state.phraseIndex + 1 >= state.phrase.length) { finish(false); return; }
      state.phraseIndex++; prepareGroup(state.phrase[state.phraseIndex]); feedback(`继续第 ${state.phraseIndex + 1} 组，看看高亮的小音符！`);
    } else { prepareGroup(newGroup()); feedback('新的一组音符来啦，让两只手一起合作！'); }
  }
  function press(midi) {
    if (!keyByMidi.has(midi) || state.rewardOpen || state.held.has(midi) || state.phraseListening) return;
    state.held.add(midi); play(midi); if (state.locked) return;
    if (settings.trial === 'phrase' && phraseStartedAt === null) phraseStartedAt = performance.now();
    startClock();
    if (!targetKeys.value.includes(midi)) {
      if (!groupCounted) { state.attempts++; groupCounted = true; }
      hadMistake = true; state.streak = 0; state.wrong.add(midi);
      feedback(`这是 ${keyByMidi.get(midi).label}。看看音符前的符号：♯ 升半音、♭ 降半音。`, 'bad'); return;
    }
    if (settings.inputStyle === 'together') state.matched = new Set(targetKeys.value.filter(key => state.held.has(key)));
    else state.matched.add(midi);
    state.wrong.delete(midi);
    if (state.matched.size < state.notes.length) {
      feedback(`找到 ${state.matched.size} / ${state.notes.length} 个音了！${settings.inputStyle === 'together' ? '请保持按住，再按下其他音。' : '继续找到另一只手的小伙伴吧！'}`); return;
    }
    if (!groupCounted) { state.attempts++; state.correct++; }
    state.score++; state.streak = hadMistake ? 0 : state.streak + 1; state.locked = true;
    celebrate(); feedback(`配合成功！${state.notes.map(note => note.name).join(' + ')}，获得一颗星星 ✦`, 'good');
    nextTimer = setTimeout(advanceQuestion, settings.trial === 'phrase' ? 450 : 1200);
  }
  function release(midi) { state.held.delete(midi); if (settings.inputStyle === 'together' && !state.locked) state.matched.delete(midi); }
  function releaseAll() { for (const midi of [...state.held]) release(midi); }
  function hint() {
    if (state.locked || state.phraseListening) return;
    state.hinted = new Set(targetKeys.value.filter(key => !state.matched.has(key)));
    const handNames = bass => state.notes.filter(note => note.bass === bass).map(note => note.name).join('、') || '休息';
    feedback(`左手：${handNames(true)}；右手：${handNames(false)}。找到亮起来的琴键！`);
    state.notes.forEach(note => play(note.midi)); state.buddySpeech = '黑键上面是升号音名，下面是降号音名哦！';
  }
  function listenGroup() { if (!state.locked && !state.phraseListening) state.notes.forEach(note => play(note.midi)); }
  function listenPhrase() {
    if (state.phraseListening) { stopPhrasePreview(); feedback('已停止试听，从高亮位置继续弹奏吧。'); return; }
    if (!state.sound) { feedback('声音已关闭，先打开右上角的声音，再试听整段。'); return; }
    state.phraseListening = true; const token = ++previewToken; let index = 0;
    function step() {
      if (token !== previewToken) return;
      if (state.rewardOpen) { previewTimer = setTimeout(step, 200); return; }
      if (index >= state.phrase.length) { stopPhrasePreview(); feedback('试听结束，从高亮位置开始弹奏吧。'); return; }
      state.phrase[index].forEach(note => play(note.midi)); feedback(`正在试听整段：第 ${index + 1} / ${state.phrase.length} 组，听完再开始作答。`);
      index++; previewTimer = setTimeout(step, 800);
    }
    step();
  }
  function openCollection() {
    state.rewardTitle = '我的音乐宝藏'; state.rewardDescription = '收集星星，把可爱的礼物带回家！'; state.rewardOpen = true; releaseAll();
  }
  function onKeydown(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target?.tagName) || state.rewardOpen) return;
    const midi = keyByShortcut.get(event.key.toLowerCase()); if (midi !== undefined) { event.preventDefault(); press(midi); }
  }
  function onKeyup(event) { const midi = keyByShortcut.get(event.key.toLowerCase()); if (midi !== undefined) release(midi); }
  onScopeDispose(() => {
    clearInterval(interval); clearTimeout(nextTimer); clearTimeout(particleTimer); stopPhrasePreview();
    if (audioContext) audioContext.close().catch(() => {});
  });
  reset();
  return { settings, state, accuracy, targetKeys, earnedGifts, questionLabel, clefLabel, phraseProgress, inputHelp,
    press, release, releaseAll, reset, hint, listenGroup, listenPhrase, openCollection, onKeydown, onKeyup };
}
