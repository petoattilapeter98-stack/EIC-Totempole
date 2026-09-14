import type { Locale, LocalizedText } from '../../i18n/locales';

/**
 * Copy owned by this tab (spec FR-021).
 *
 * Lives here rather than in a central string map so the feature stays
 * removable as one folder (Constitution IX) — deleting this directory takes
 * its copy with it, matching the restaurant map's `strings.ts` pattern.
 *
 * Hungarian values are PENDING NATIVE-SPEAKER REVIEW (spec Assumptions,
 * quickstart §2.5). Layout tests protect the fit whatever the final wording
 * turns out to be — see specs/004-tic-tac-toe/contracts/view-states.md §6.
 */
export interface TicTacToeStrings {
  /** Primary heading for the destination. Matches the nav label (registry.test.tsx convention). */
  readonly heading: LocalizedText;
  /** One-line description shown in the default view, above Play. */
  readonly intro: LocalizedText;
  /** Opens the enlarged game view. */
  readonly play: LocalizedText;
  /** Return control label + accessible name, passed to EnlargedView. */
  readonly close: LocalizedText;
  /** Clears the board and starts over, mid-game or after a result. */
  readonly newGame: LocalizedText;
  /** Accessible name for the board's role="group". */
  readonly boardName: LocalizedText;
  /** "{mark}'s turn" — {mark} is replaced with the literal X or O. */
  readonly turnTemplate: LocalizedText;
  /** "{mark} wins!" — {mark} is replaced with the literal X or O. */
  readonly winsTemplate: LocalizedText;
  /** Shown when the board fills with no line completed. */
  readonly draw: LocalizedText;
  /** "Row {n}" — {n} is replaced with the 1-based row number. */
  readonly rowTemplate: LocalizedText;
  /** "column {n}" — {n} is replaced with the 1-based column number. */
  readonly columnTemplate: LocalizedText;
  /** Cell content word for an empty cell. */
  readonly empty: LocalizedText;
  /** Suffix appended to a winning cell's accessible name. */
  readonly winningLine: LocalizedText;
}

export const STRINGS = {
  heading: { en: 'Tic-Tac-Toe', hu: 'Amőba 3×3' },
  intro: {
    en: 'Two players, one screen. Get three in a row to win.',
    hu: 'Két játékos, egy képernyő. Három egy sorban nyer.',
  },
  play: { en: 'Play', hu: 'Játék indítása' },
  close: { en: 'Close game', hu: 'Játék bezárása' },
  newGame: { en: 'New game', hu: 'Új játék' },
  boardName: { en: 'Game board', hu: 'Játéktábla' },
  turnTemplate: { en: "{mark}'s turn", hu: '{mark} következik' },
  winsTemplate: { en: '{mark} wins!', hu: '{mark} nyert!' },
  draw: { en: "It's a draw!", hu: 'Döntetlen!' },
  rowTemplate: { en: 'Row {n}', hu: '{n}. sor' },
  columnTemplate: { en: 'column {n}', hu: '{n}. oszlop' },
  empty: { en: 'empty', hu: 'üres' },
  winningLine: { en: 'winning line', hu: 'nyerő vonal' },
} as const satisfies TicTacToeStrings;

/** 1-based row/column of a board index, 0-8 in row-major order (data-model.md §2). */
export function cellPosition(index: number): { readonly row: number; readonly column: number } {
  return { row: Math.floor(index / 3) + 1, column: (index % 3) + 1 };
}

export interface GameStrings {
  readonly heading: string;
  readonly intro: string;
  readonly play: string;
  readonly close: string;
  readonly newGame: string;
  readonly boardName: string;
  /** "{mark}'s turn" with {mark} substituted. */
  readonly turn: (mark: 'X' | 'O') => string;
  /** "{mark} wins!" with {mark} substituted. */
  readonly wins: (mark: 'X' | 'O') => string;
  readonly draw: string;
  /**
   * Full accessible name for one cell: "Row n, column n, {contents}", with a
   * ", winning line" suffix when the cell is part of a completed line
   * (spec FR-022, FR-013).
   */
  readonly cellName: (index: number, contents: 'X' | 'O' | null, isWinning: boolean) => string;
}

/**
 * Resolve every string for one locale, mirroring the shell's and the
 * restaurant map's `getStrings(locale)` shape so this feature reads like the
 * rest of the codebase.
 */
export function getGameStrings(locale: Locale): GameStrings {
  const s = {
    heading: STRINGS.heading[locale],
    intro: STRINGS.intro[locale],
    play: STRINGS.play[locale],
    close: STRINGS.close[locale],
    newGame: STRINGS.newGame[locale],
    boardName: STRINGS.boardName[locale],
    draw: STRINGS.draw[locale],
  };

  const turnTemplate = STRINGS.turnTemplate[locale];
  const winsTemplate = STRINGS.winsTemplate[locale];
  const rowTemplate = STRINGS.rowTemplate[locale];
  const columnTemplate = STRINGS.columnTemplate[locale];
  const emptyWord = STRINGS.empty[locale];
  const winningLineWord = STRINGS.winningLine[locale];

  return {
    ...s,
    turn: (mark) => turnTemplate.replace('{mark}', mark),
    wins: (mark) => winsTemplate.replace('{mark}', mark),
    cellName: (index, contents, isWinning) => {
      const { row, column } = cellPosition(index);
      const rowText = rowTemplate.replace('{n}', String(row));
      const columnText = columnTemplate.replace('{n}', String(column));
      const contentsText = contents ?? emptyWord;
      const base = `${rowText}, ${columnText}, ${contentsText}`;
      return isWinning ? `${base}, ${winningLineWord}` : base;
    },
  };
}
