import type { LocalizedText } from '../../i18n/locales';

export type KnowledgeDomain = 'innovation-centre' | 'company' | 'employees';

export interface ExamplePrompt {
  readonly domain: KnowledgeDomain;
  readonly text: LocalizedText;
}

/**
 * Discoverability content (spec FR-016, SC-007) -- one example per Knowledge
 * Domain (data-model.md) so a visitor with no prior guidance can see the full
 * scope of what the assistant can help with.
 */
export const examplePrompts: readonly ExamplePrompt[] = [
  {
    domain: 'innovation-centre',
    text: {
      en: 'What programs does the Innovation Centre run?',
      hu: 'Milyen programokat futtat az Innovációs Központ?',
    },
  },
  {
    domain: 'company',
    text: {
      en: 'What does TEKsystems do?',
      hu: 'Mivel foglalkozik a TEKsystems?',
    },
  },
  {
    domain: 'employees',
    text: {
      en: 'Who leads the engineering team?',
      hu: 'Ki vezeti a mérnöki csapatot?',
    },
  },
];
