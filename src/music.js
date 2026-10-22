export const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const syllables = ['哆', '来', '咪', '发', '嗦', '拉', '西'];
const semitones = [0, 2, 4, 5, 7, 9, 11];
const whiteShortcuts = [...'zxcvbnmasdfghjqwertyu'];
const blackShortcuts = [...'1234567890-=[]\\'];
const blackDegrees = [0, 1, 3, 4, 5];

export function naturalMidi(index) {
  return 48 + Math.floor(index / 7) * 12 + semitones[index % 7];
}

export function makeNote(index, alteration = 0) {
  return {
    index, alteration, midi: naturalMidi(index) + alteration, bass: index < 7,
    name: `${names[index % 7]}${alteration === 1 ? '♯' : alteration === -1 ? '♭' : ''}${3 + Math.floor(index / 7)}`,
  };
}

export const whiteKeys = Array.from({ length: 21 }, (_, index) => ({
  id: naturalMidi(index), index, octave: Math.floor(index / 7), black: false,
  label: makeNote(index).name, syllable: syllables[index % 7], shortcut: whiteShortcuts[index],
}));

export const blackKeys = Array.from({ length: 15 }, (_, index) => {
  const octave = Math.floor(index / 5), degree = blackDegrees[index % 5];
  return {
    id: 48 + octave * 12 + semitones[degree] + 1, octave, black: true,
    index: octave * 7 + degree, sharp: `${names[degree]}♯`, flat: `${names[degree + 1]}♭`,
    label: `${names[degree]}♯${octave + 3} / ${names[degree + 1]}♭${octave + 3}`,
    shortcut: blackShortcuts[index],
  };
});

export const pianoKeys = [...whiteKeys, ...blackKeys];
export const keyByMidi = new Map(pianoKeys.map(key => [key.id, key]));
export const keyByShortcut = new Map(pianoKeys.map(key => [key.shortcut, key.id]));

function pick(pool, count) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function groupSignature(group) {
  return group.map(note => `${note.index}:${note.alteration}`).join(',');
}

export function generateGroup(settings, previous = '') {
  const range = settings.level === 1 ? 3 : settings.level === 2 ? 5 : 7;
  const low = Array.from({ length: range }, (_, i) => i), high = low.map(i => i + 7);
  if (settings.level === 4) high.push(14, 15, 16);
  const choices = settings.accidentals === 'natural' ? [0]
    : settings.accidentals === 'sharp' ? [0, 1]
    : settings.accidentals === 'flat' ? [0, -1] : [0, 1, -1];
  let notes;
  do {
    const count = settings.hands === 'chord' ? 2 : 1;
    const indices = settings.hands === 'solo' ? pick(high, 1) : [...pick(low, count), ...pick(high, count)];
    notes = indices.sort((a, b) => a - b).map(index => {
      const available = choices.filter(alt => keyByMidi.has(naturalMidi(index) + alt));
      return makeNote(index, available[Math.floor(Math.random() * available.length)]);
    });
  } while (groupSignature(notes) === previous || new Set(notes.map(note => note.midi)).size !== notes.length
    || (settings.accidentals !== 'natural' && !notes.some(note => note.alteration)));
  return notes;
}
