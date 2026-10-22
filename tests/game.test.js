import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { usePianoGame } from '../src/composables/usePianoGame.js';

function setup(t, settings = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const scope = effectScope(), game = scope.run(usePianoGame);
  game.state.sound = false; game.state.lifetimeStars = 100;
  Object.assign(game.settings, settings); game.reset();
  t.after(() => scope.stop());
  return game;
}
function playGroup(game) {
  for (const midi of game.targetKeys.value) game.press(midi);
  for (const midi of [...game.state.held]) game.release(midi);
}

test('双手同时按住才完成，松开后未完成的匹配会撤销', t => {
  const game = setup(t, { hands: 'chord', inputStyle: 'together' });
  const keys = [...game.targetKeys.value];
  game.press(keys[0]); game.release(keys[0]);
  assert.equal(game.state.matched.size, 0);
  assert.equal(game.state.score, 0);
  keys.forEach(game.press);
  assert.equal(game.state.score, 1);
  assert.equal(game.state.locked, true);
  t.mock.timers.tick(1200);
  assert.equal(game.state.locked, false);
  assert.equal(game.state.held.size, 0);
});

test('乐句按顺序完成并跨行推进，整段只结算一次', t => {
  const game = setup(t, { trial: 'phrase', phraseLength: 8 });
  const wrong = Array.from({ length: 36 }, (_, i) => i + 48).find(midi => !game.targetKeys.value.includes(midi));
  game.press(wrong); game.release(wrong);
  assert.equal(game.state.phraseIndex, 0);
  for (let i = 0; i < 8; i++) {
    assert.equal(game.state.phraseIndex, i);
    playGroup(game); t.mock.timers.tick(450);
  }
  assert.equal(game.state.phraseFinished, true);
  assert.equal(game.state.result.stars, '★★☆');
  assert.equal(game.state.correct, 7);
  assert.equal(game.state.attempts, 8);
  playGroup(game); t.mock.timers.tick(2000);
  assert.equal(game.state.score, 8);
});

test('倒计时在宝藏弹窗期间暂停，结束后锁定本轮', t => {
  const game = setup(t, { mode: 'challenge' });
  game.press(game.targetKeys.value[0]);
  game.state.rewardOpen = true; t.mock.timers.tick(5000);
  assert.equal(game.state.remaining, 60);
  game.state.rewardOpen = false;
  for (let i = 0; i < 60; i++) t.mock.timers.tick(1000);
  assert.equal(game.state.remaining, 0);
  assert.equal(game.state.locked, true);
  const score = game.state.score; playGroup(game);
  assert.equal(game.state.score, score);
});

test('试听暂停作答，重新开始清除试听和待执行的换题', t => {
  const game = setup(t, { trial: 'phrase' });
  game.state.sound = true; game.listenPhrase();
  game.press(game.targetKeys.value[0]);
  assert.equal(game.state.held.size, 0);
  assert.equal(game.state.score, 0);
  game.reset();
  assert.equal(game.state.phraseListening, false);
  game.state.sound = false; playGroup(game); game.reset();
  t.mock.timers.tick(5000);
  assert.equal(game.state.phraseIndex, 0);
  assert.equal(game.state.score, 0);
  assert.equal(game.state.phraseListening, false);
});

test('星星解锁宝藏且重新开始保留累计奖励', t => {
  const game = setup(t);
  game.state.lifetimeStars = 4; playGroup(game);
  assert.equal(game.state.lifetimeStars, 5);
  assert.equal(game.state.rewardOpen, true);
  assert.equal(game.earnedGifts.value, 1);
  game.state.rewardOpen = false; game.reset();
  assert.equal(game.state.score, 0);
  assert.equal(game.state.lifetimeStars, 5);
});
