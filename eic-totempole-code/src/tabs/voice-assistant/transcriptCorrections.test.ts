import { describe, expect, it } from 'vitest';

import { correctTranscript } from './transcriptCorrections';

describe('correctTranscript', () => {
  it.each([
    ['what does tax systems do', 'what does TEKsystems do'],
    ['Tax Systems history', 'TEKsystems history'],
    ['tech-systems offices', 'TEKsystems offices'],
    ['who founded TEK systems', 'who founded TEKsystems'],
    ['the tax system company', 'the TEKsystems company'],
    ['tech systems and tax systems', 'TEKsystems and TEKsystems'],
  ])('corrects %j', (input, expected) => {
    expect(correctTranscript(input)).toBe(expected);
  });

  it.each([
    'how does TEKsystems differentiate itself',
    'where do I file my taxes',
    'what tech does the centre use',
    'help with a tax return',
    'systems engineering roles',
  ])('leaves %j unchanged', (input) => {
    expect(correctTranscript(input)).toBe(input);
  });
});
