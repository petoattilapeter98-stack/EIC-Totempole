/**
 * Shared shell capability: give the Welcome banner's height to the content
 * region.
 *
 * Spread `collapseHeroProps()` onto any element in a feature's view. While
 * that element is in the DOM, the shell (src/app/App.module.css) collapses the
 * hero row and the content region grows into the freed space. Callers today:
 * the Ask Assistant conversation and the Tic-Tac-Toe game view.
 *
 * Like `data-attract-exempt` (specs/004-tic-tac-toe/contracts/enlarged-view.md,
 * rule E3), the request is the attribute's PRESENCE in the DOM, never state
 * registered in context. When the element unmounts - the feature ends its own
 * state, the visitor switches tabs, or the idle auto-reset fires - the hero
 * returns in the same frame, and there is nothing that could leak and keep it
 * hidden (Constitution V).
 *
 * Attract mode, by default, overrides the request: the hero is attract mode's
 * centrepiece, so it comes back (and the content region dims with the rest of
 * the chrome) until someone touches the screen again.
 *
 * `attractExempt: true` opts out of that: the hero stays collapsed and the
 * content region stays at full presence through attract mode, so nothing
 * about the view changes while a visitor pauses. For views where a pause is
 * part of normal use, such as players thinking about their next move
 * (specs/004-tic-tac-toe FR-020).
 */
export const COLLAPSE_HERO_ATTRIBUTE = 'data-collapse-hero';

/** The attribute value the shell reads as "keep this through attract mode". */
export const COLLAPSE_HERO_ATTRACT_EXEMPT = 'attract-exempt';

export interface CollapseHeroOptions {
  readonly attractExempt?: boolean | undefined;
}

export function collapseHeroProps({ attractExempt = false }: CollapseHeroOptions = {}) {
  return { [COLLAPSE_HERO_ATTRIBUTE]: attractExempt ? COLLAPSE_HERO_ATTRACT_EXEMPT : '' };
}
