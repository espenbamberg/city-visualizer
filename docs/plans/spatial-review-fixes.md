# Plan: fix the four spatial-object review findings

Status: implemented and verified locally.

## Compact handoff

- Repository: `espenbamberg/city-visualizer`.
- PR #1 added seven outdoor recipes, quarter-turn rotation, named/four-sided entrances, relative/repeated placement and separate obstacle/access geometry.
- PR #1 is merged into `main` as `0b244375cd33b0ce80879eaa1015ed6de2df9938`.
- The review ran against the equivalent feature commit `468044370b77ff3b4dce3f068df0530be4e5af4c`.
- The full model/CLI suite passes. Targeted probes reproduced findings 1–4 below. Findings 1–3 are regressions; 4 is an existing helper limitation exposed by multi-port stories.
- Expected use: locally authored maps with tens to roughly 100 objects, built into offline HTML.
- No implementation changes were made during review. Fresh browser checks remain part of implementation verification.

## Implementation order

**2 → 3 → 1 → 4.** Validate before generating geometry, separate labels from signs, preserve legacy route compatibility, then fix actor continuity. Keep each fix bounded and add its regression test before changing behavior.

### 2. Reject invalid geometry before generation

**Reproduction:** set a corner-shop plot width to JSON `1e309`. The composer generates geometry before final validation and exhausts memory instead of reporting invalid input.

- Validate resolved spatial plots before ground-generation loops, recipe construction or network compilation.
- Reuse `validateOutdoor` and existing transform checks; avoid a second set of validation rules.
- Check the other composition entry points for the same ordering problem. Include dimensions and recipe options, not only width.
- Preserve the CLI's behavior of writing output only after successful composition.

**Likely files:** `kit/compose-groups.mjs`, `kit/sizing.mjs`, relevant other composers, `scripts/check-spatial.mjs`.

**Acceptance tests:**
- Run malformed JSON through `scripts/compose.mjs` in a subprocess with a timeout and bounded heap. Require a normal nonzero exit with a useful validation message, not a timeout or memory failure.
- Cover non-finite dimensions, invalid rotation and invalid repetition-driving recipe options such as rack bay counts.
- An existing output scene remains byte-for-byte unchanged after failure; valid enlarged recipes still compose.

### 3. Separate entity labels from physical signs

**Reproduction:** rename the racks to `Neighbourhood bicycle parking`. Composition fails because the unrestricted entity label becomes a sign with a 24-character limit.

- Stop automatically assigning full entity labels to every spatial recipe's `sign`.
- Keep the full label for the nameplate and inspector. Let sign-bearing recipes use their short default or an explicitly authored sign.
- Apply sign restrictions to supported sign-bearing recipes; retain legacy sign behavior.
- Update the spatial authoring contract to explain the distinction.

**Likely files:** `kit/compose-groups.mjs`, `kit/outdoor-assets.mjs`, `references/spatial-objects.md`, `scripts/check-spatial.mjs`.

**Acceptance tests:**
- Long labels compose for racks, shelters and shops without truncating the entity label.
- A short explicit shop sign renders independently of a long nameplate label.
- An oversized explicit sign is rejected; escaping and existing legacy signs remain correct.

### 1. Preserve existing routes when adding spatial scenery

**Reproduction:** append `{ "type": "canopy-tree", "x": 10000, "y": 10000 }` to a valid legacy scene. The heat example now fails against an existing lamp; the repair example fails against an existing van.

- Remove the scene-wide switch that changes legacy route validation merely because one spatial object exists.
- For legacy routes, validate relevant new spatial obstacles without retroactively applying different collision rules to unrelated legacy geometry.
- Preserve full network-route validation and existing room-wall checks.
- Use the actual movement-path contract, including supported legacy actor paths, rather than assuming every visible relationship line is an actor path.

**Likely files:** `kit/network.mjs`, relevant path-resolution helpers in `kit/model.mjs`, `scripts/check-spatial.mjs`.

**Acceptance tests:**
- Both affected bundled examples remain valid after adding distant spatial scenery.
- Moving a new obstacle into an actual walking path still fails.
- Existing network collision, doorway, corridor-width and overhead-clearance checks still pass their negative tests.

### 4. Keep stationary actors at their arrival port

**Reproduction:** put the shelter's boarding port first, then append a stationary waiting step after arrival at its waiting port. The actor jumps from `[455.75,125,3]` to `[497,125,3]`; validation accepts it.

- For an unchanged actor remaining at the same entity without a movement step, carry forward the previous resolved endpoint.
- Keep first-step placement, explicit handoffs and documented symbolic appearances intact. Respect truncated arrival routes where supported.
- Apply the rule to both group-composition paths: the shared helper used with `environment` and the fallback used without it. Check other callers of `scenarioLayouts`.
- Share only the necessary position-resolution logic; preserve existing colors, markers and fixture conventions.

**Likely files:** `kit/compose-helpers.mjs`, `kit/compose-groups.mjs`, `scripts/check-spatial.mjs`, `scripts/browser-check-spatial.js`.

**Acceptance tests:**
- Arrival followed by one or several waiting steps retains the exact endpoint, regardless of port ordering.
- Cover group layouts with and without `environment`; then depart from that same port without a discontinuity.
- In the browser, forward/backward stepping and replay keep the waiting actor in place. Existing handoff and symbolic-story tests remain valid.

## Completion checks

- Run focused regression tests while implementing, then `node scripts/check.mjs`.
- Rebuild the mobility hub with `node scripts/build.mjs examples/mobility-hub preview/spatial`.
- Run the spatial browser suite, including the new waiting-step case, and the existing repair-service browser regression.
- Inspect affected stories on desktop and mobile; run `git diff --check`.
- Report actual results and any unavailable browser coverage. Do not treat the previously passing suite as proof that these new regressions are fixed.

Done means all four reproductions are covered and corrected, existing fixtures still work, and the extension guide matches the resulting behavior.

## Implementation results

- **2:** Shared dimension resolution validates spatial recipes before layout loops; resolved group objects and direct geometry generation also validate before building parts. Bounded CLI regressions reject malformed dimensions, rotation, elevation and bay counts while preserving existing output.
- **3:** All composers separate spatial entity labels from signs. Only the corner shop's configurable sign has the 24-character limit. Full nameplates and escaped explicit signs have regression coverage.
- **1:** Legacy collision checks now run after actor-path validation and check new spatial solids against actual physical journeys. Distant trees preserve both affected examples; a trunk on an authored walking path still fails. Network and wall checks remain covered by the existing suite.
- **4:** Shared stationary placement retains the previous physical actor endpoint in both group paths, including truncated arrivals. Tests cover both port orders, multiple waits, departure, handoffs and symbolic appearances. The bundled shelter story demonstrates arrival and waiting with two entrances.

Verification completed:
- `node scripts/check.mjs` — full model/CLI suite passed, including new regressions.
- Mobility-hub inputs regenerated and its standalone map/component study built; repair-service build passed.
- Chromium spatial browser suite passed, including waiting forward/backward/replay, movement/pause, keyboard, mobile and offline checks.
- Chromium repair-service browser suite passed all 19 steps and existing interaction checks.
- Desktop/mobile screenshots reviewed; `git diff --check` passed.

Safari/WebKit and physical devices were not checked.
