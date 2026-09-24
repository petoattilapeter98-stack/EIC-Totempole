/**
 * Known speech-recognition mishearings, corrected in a recognized question
 * before it is shown or sent (spec FR-029, research.md R20).
 *
 * Chrome's Web Speech API offers no way to bias recognition toward custom
 * vocabulary (`grammars` is unimplemented), so the company name is routinely
 * transcribed as ordinary words. Each pattern here only matches the
 * company-name compound -- bare "tech"/"tax" are common words and are
 * deliberately never rewritten on their own. Add newly observed confusables
 * to this list.
 */
const CORRECTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // "tax systems", "tech systems", "TEK systems", "tech-systems", "tax system", ...
  [/\b(?:tax|tech|tek|teck|tec|tex)[\s-]*systems?\b/gi, 'TEKsystems'],
];

export function correctTranscript(text: string): string {
  return CORRECTIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}
