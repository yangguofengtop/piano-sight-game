import test from 'node:test';
import assert from 'node:assert/strict';
import { pianoKeys, makeNote, generateGroup, keyByMidi, groupSignature } from '../src/music.js';

test('三个八度包含 36 个独立的半音，升降同音和白键变音映射正确', () => {
  assert.equal(pianoKeys.length, 36);
  assert.equal(new Set(pianoKeys.map(key => key.id)).size, 36);
  assert.equal(new Set(pianoKeys.map(key => key.shortcut)).size, 36);
  assert.equal(makeNote(7, 1).midi, makeNote(8, -1).midi);
  assert.equal(makeNote(9, 1).midi, makeNote(10).midi);
  assert.equal(makeNote(10, -1).midi, makeNote(9).midi);
  assert.equal(makeNote(13, 1).midi, makeNote(14).midi);
});

test('各种音域与双手设置均产生可弹奏、无重复音高的组合', () => {
  for (const level of [1, 2, 3, 4]) for (const hands of ['solo', 'duet', 'chord']) for (const accidentals of ['natural', 'sharp', 'flat', 'mixed']) {
    let previous = '';
    for (let i = 0; i < 25; i++) {
      const notes = generateGroup({ level, hands, accidentals }, previous);
      assert.equal(notes.length, hands === 'solo' ? 1 : hands === 'duet' ? 2 : 4);
      assert.equal(new Set(notes.map(note => note.midi)).size, notes.length);
      assert.ok(notes.every(note => keyByMidi.has(note.midi)));
      assert.notEqual(groupSignature(notes), previous);
      if (accidentals !== 'natural') assert.ok(notes.some(note => note.alteration !== 0));
      if (accidentals === 'sharp') assert.ok(notes.every(note => note.alteration >= 0));
      if (accidentals === 'flat') assert.ok(notes.every(note => note.alteration <= 0));
      if (accidentals === 'natural') assert.ok(notes.every(note => note.alteration === 0));
      if (hands !== 'solo') assert.equal(notes.filter(note => note.bass).length, hands === 'chord' ? 2 : 1);
      previous = groupSignature(notes);
    }
  }
});
