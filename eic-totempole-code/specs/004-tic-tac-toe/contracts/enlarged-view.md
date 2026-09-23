# Contract: Enlarged View (shared capability)

**Feature**: [../spec.md](../spec.md) FR-003 to FR-007, FR-020, FR-027 | **Research**: [../research.md](../research.md) R1, R2, R3

A full-viewport inline state that any feature can render. Today the restaurant map (expanded state)
and Tic-Tac-Toe (game view) use it. It lives in `src/components/EnlargedView/` and depends on
nothing feature-specific.

Two parts must stay in step, and they are the ones a later refactor is most likely to break: the
**component**, which renders the data attributes, and the **shell's CSS rules**, which read them.
Nothing type-checks across that boundary, so layout tests guard it (§5).

---

## 1. Component API

```ts
interface EnlargedViewProps {
  /**
   * Whether the view is enlarged. The component is rendered in BOTH states so its children keep
   * their position in the React tree; see E10.
   */
  readonly active: boolean;
  /** Visible text and accessible name of the return control. Already localized by the feature. */
  readonly returnLabel: string;
  /** Called when the return control is activated. The feature switches its own state back. */
  readonly onReturn: () => void;
  /** Opt out of attract-mode dimming while mounted. Default false. */
  readonly attractExempt?: boolean | undefined;
  /** Feature-owned layout class for the panel's content area. */
  readonly className?: string | undefined;
  /** The feature's enlarged content. The feature's own data attributes stay on its own elements. */
  readonly children: ReactNode;
}
```

The feature decides **when** it is active (its own display state). `EnlargedView` decides **how**
the enlarged state looks and behaves.

## 2. Rules

| ID | Rule | Requirement |
|----|------|-------------|
| E1 | While `active`, renders one panel element with `position: fixed; inset: 0`, the shared padding and `--color-surface` background, **inside the caller's React subtree**. No portal, no `<dialog>`, no `role="dialog"`, no `aria-modal`. | Principle IV, 003 S2, FR-006 |
| E1a | **Never uses the browser Fullscreen API** (`requestFullscreen`, `exitFullscreen`, `fullscreenchange`). "Enlarged" is a layout state, not browser fullscreen: the kiosk browser already runs full screen, and a visitor gesture that exits browser fullscreen would leave the page in a state no code path expects. | FR-006 |
| E2 | While `active`, the panel carries `data-enlarged-view`, and `data-attract-exempt` **if and only if** `attractExempt` is true. While inactive it carries **neither**. | FR-003, FR-020 |
| E3 | The exemption is **derived from the attribute's presence in the DOM, never registered anywhere.** There is no context state, no effect and no cleanup, so deactivating or unmounting ends the exemption in the same frame. Do not "optimise" this into a context flag (research R1). | Principle V |
| E4 | While `active`, renders exactly one return control after the children (so it never shifts their index): a `<button type="button">` with `Minimize2` icon (`aria-hidden`) and visible `returnLabel` text, which is also its accessible name. It is always visible and never fades, hides or depends on a gesture. | FR-004, FR-005 |
| E5 | The return control's box meets `--touch-target-min` and sits fully on screen. Its geometry, padding, radius, font and shadow are moved **unchanged** from the map's pre-migration `.stateToggle`. Its rect after migration equals the rect measured before migration (±1px). **Implementation note found during T007–T012**: because an absolutely positioned element's containing block is its ancestor's padding *box*, `.panel`'s own `padding` does not inset the return control the way a normal-flow child is inset — the control's `top`/`right` bake the padding in explicitly (`calc(var(--space-6) + var(--touch-gap-min))`). This lands within 1px of the pre-migration rect, not exactly on it: the old `.stateToggle` sat inside `.mapArea`'s 1px border, which the shared control has no equivalent of. That 1px is the entire discrepancy; width and height are exact. | FR-004, Principle III |
| E6 | The icon colour inherits `--accent-color` from the caller (emerald for the map, blue for the game). Every other visual property is identical between callers. | FR-004 |
| E7 | When `active` becomes true, including mounting already active, focus moves to the return control. `EnlargedView` does **not** restore focus on unmount: the opener is re-rendered by the feature's own state change, so the feature restores focus after that render. | FR-007, 003 S6 |
| E8 | **No focus trap.** | Principle IV, 003 S7 |
| E9 | Adds no timers, intervals, subscriptions or document listeners. | Principle V |
| E10 | **Toggling `active` never remounts the children.** The same wrapper element is rendered in both states; inactive, it is `display: contents` with no attributes and no return control, so it adds no box to the caller's layout. Rendering `<EnlargedView>` only while enlarged would move the children to a new parent, and React would recreate them. For the map that means **its iframe reloads on every expand and collapse**, losing the visitor's pan and zoom and restarting the load race. | 003 FR-010, FR-013 |

## 3. Shell rules (`src/app/App.module.css`)

Exactly these two rules. They name no feature and read only the attributes from E2:

```css
/* Lift: the content region's stacking context must beat the footer row, which follows it
   in the DOM at the same z-index (research R2). */
.shell:has([data-enlarged-view]) .content {
  z-index: 2;
}

/* Exemption: attract dims <main> itself; a descendant cannot undo that (research R1). */
.shell:has([data-enlarged-view][data-attract-exempt]) .content {
  opacity: 1;
}
```

| ID | Rule |
|----|------|
| H1 | No `!important`. The selectors' specificity (0,4,0 for the exemption) already beats `.attract .recede` (0,2,0). A test (§5) catches any later change that reverses this. |
| H2 | `isAttract`, `data-attract`, the aurora and the ground are **not** changed by either rule. Only the content region's stacking and opacity are. |
| H3 | Nothing else in the shell may reference `data-enlarged-view` or `data-attract-exempt`. |

## 4. Callers

| Caller | `attractExempt` | Notes |
|--------|-----------------|-------|
| `restaurant-map` expanded state | omitted (false) | `<EnlargedView active={isExpanded}>` wraps the map area **in both display states** (E10). Map dims in attract mode (003 FR-035). Its expand control stays in the map area and renders only in `default`. Its collapse control is now E4's. Keeps `data-display` on its own root for its existing tests. |
| `tic-tac-toe` game view | `true` | Rendered with `active` only while `enlarged`. Remounting `GameBoard` on each Play is the intended way a game is discarded (research R6), so E10 does not apply to this caller. |

**Map migration obligations**: remove the expanded-panel and collapse-toggle styles from
`RestaurantMap.module.css`, and remove the `collapseRef` / `'collapse'` branch of `pendingFocus`,
because E7 covers it. Keep the `'expand'` focus restore. Every existing map test must pass
unchanged, apart from queries that relied on the expand and collapse control being the same element.
Update `specs/003-restaurant-map/contracts/view-states.md` §1 to reference this contract.

## 5. Test obligations

| Test | Project | Asserts |
|------|---------|---------|
| `EnlargedView.test.tsx` | unit | E2 attributes for active × exempt combinations, and none while inactive; E4 name, `type`, present only while active; E7 focus on mount-active and on the inactive→active transition; `onReturn` fires once per activation; E1 no `dialog` role / `aria-modal`; E1a no Fullscreen API call; **E10 a child DOM node is the identical node before and after toggling `active` both ways**; E9 via fake-timer count and document listener spy balance across 20 mount/unmount cycles. |
| `RestaurantMap.test.tsx` | unit | **Added**: the map iframe is the identical DOM node across expand → collapse (E10); `[data-enlarged-view]` present only while expanded; `[data-attract-exempt]` never present. |
| `RestaurantMap.browser.test.tsx` | layout | Through `<App/>`, the non-exempt caller. **Added**: while expanded, `elementFromPoint` at the header, nav **and footer** centres resolves inside the map root (R2, the fixed defect); with `attractAfterSeconds={1}`, `<main>` opacity reaches `0.16` while expanded (R1, no exemption leak). **Added**: collapse control rect equals the recorded pre-migration rect (E5). |
| `TicTacToe.browser.test.tsx` | layout | Through `<App/>`, the exempt caller: footer covered; `<main>` opacity `1` while enlarged during attract (R1); map and game return-control rects equal (E5, FR-004). |

There is no `EnlargedView.browser.test.tsx`. A layout test must run through the real shell, and
only a registered tab can put an enlarged view there without mocking the registry, so the two
callers carry these assertions instead.
