# Contract: Curated Restaurant Data

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md) | **Research**: [../research.md](../research.md) R8

The curated set exists in **two places that no code can reconcile**. This contract is how that stays
manageable rather than becoming a slow-rotting data problem.

---

## 1. The two representations

| # | Representation | Location | Drives | Editable by |
|---|----------------|----------|--------|-------------|
| A | Pinned places | The feature's Google My Maps map | The pins the visitor sees on the map | Anyone with edit access to the map |
| B | `RESTAURANTS` array | `src/tabs/restaurant-map/restaurants.static.ts` | The numbered companion list **and** the offline fallback | Anyone with repo access |

FR-023 requires A and B to name the same restaurants, with matching numbers.

**No automated check can prove this.** The embed is keyless and opaque — the application cannot read
A at runtime, and CI cannot read it without adding a network dependency on an undocumented Google
endpoint (rejected in research R8). Anyone who claims to have tested parity automatically has tested
something else.

---

## 2. What IS enforced automatically

`restaurants.test.ts` proves every invariant that lives inside representation B. These catch most
real editing mistakes — a duplicated number, a forgotten translation, a ninth entry.

| ID | Invariant | Requirement |
|----|-----------|-------------|
| V1 | 1–8 entries | FR-031 |
| V2 | `number` values are exactly `1..n`, no gaps, no duplicates | FR-006 |
| V3 | Names unique and non-empty | FR-005 |
| V4 | `address.en` and `address.hu` both non-empty | FR-013 |
| V5 | `cuisine`, where present, has both locales | FR-018 |
| V6 | `walkMinutes`, where present, is a positive integer | — |
| V7 | The exported array is frozen | Principle V |

---

## 3. Editorial procedure (the part that is not automated)

**Any change to the curated set is a single action that touches both representations.** Doing one
without the other is a defect per FR-023, not a "to-do".

1. Edit the pins on the My Maps map — add/remove/move, and set the pin's **number** to match its
   intended list position.
2. Edit `RESTAURANTS` in `restaurants.static.ts` to match, renumbering so the set stays `1..n`.
3. Re-save the map's default view if the set's geographic extent changed, so all pins still fit the
   initial framing in **both** display states (FR-007, FR-027).
4. Run `npm test` — catches the invariant violations in §2.
5. Open the map destination and compare, in both languages: every list number has a pin, every pin
   has a list entry, and the count matches.

Step 5 is the only check that can catch A/B drift. It is cheap because the companion list is on
screen during normal operation (a consequence of the Q3 clarification), so the comparison is a
glance rather than a procedure.

---

## 4. Map ownership

The My Maps map is **feature infrastructure**, not an incidental asset (spec Assumptions):

| Concern | Requirement |
|---------|-------------|
| Ownership | Owned by a team-controlled account, not an individual's personal account — an owner leaving must not break the kiosk |
| Sharing | Public or unlisted, so the kiosk renders it without signing in |
| Edit access | Held by whoever maintains the curated set |
| Recorded | The `mid` and the owning account are documented alongside `MAP_EMBED_URL` |

If sharing is revoked or the owning account is removed, the embed stops rendering for the public.
Note that this failure mode may **not** trigger the fallback — Google can return an error page with
a successful `load` (see [map-embed.md](map-embed.md) §3). The companion list keeps the screen useful
regardless, but the underlying problem is operational and needs a human.

---

## 5. Upgrade path (not in scope now)

If drift proves to be a recurring problem in practice, the fix is to generate representation B from
representation A at build time via the My Maps KML export (`maps/d/kml?mid=…`), making A the single
source of truth. Rejected for this feature because it puts a network call and an undocumented Google
endpoint into the build. Recorded here so the option is not rediscovered from scratch.
