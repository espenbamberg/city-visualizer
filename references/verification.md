# Verify a generated map

## For every new issue

1. Build with explicit input/output paths. Validation must pass; inspect the resulting `index.html` and `assets.html`.
2. Read every story in order. Check automatic playback, reading pauses, restart on reselection, Pause/Play/Replay, exact highlighted relationships, manual takeover, Previous/Next boundaries, direct marker jumps and outcomes against the brief. Select each entity from the map or entity list.
3. Inspect overview and zoomed views. Check all nameplates, connection endpoints, annotation bounds, building details and painter order. Pan or enter fullscreen to inspect areas covered by the floating panel. On mobile, collapse the sheet to reach covered objects.
4. Check desktop and phone layouts, including the text below the map. The canvas fills the viewport; sidebar arrival does not resize it; the read link starts below the opening. Check title/legend/control/credit overlap and horizontal overflow.
5. Exercise ordinary scroll, Ctrl/Command + wheel, drag, zoom buttons, Fit, keyboard selection and fullscreen/exit. Check visible focus, mobile sheet toggling and reduced motion. The text explanation must also be usable without JavaScript.
6. For animated stories, inspect travel, arrival, direct and backward jumps, interrupted movement and facility access states. Paths follow actual surfaces and doorways. A closed facility stays closed throughout its scenario.
7. Open the generated HTML offline and check for console errors or missing resources. Inspect screenshots rather than relying only on geometry assertions.
8. For mixed sizes, inspect compact and expanded recipes, stable geometry during stories/return, and pointer/list access to small objects. Review the transport network with highlighting off: shared streets, connected paths, marked crossings, useful end bays and mode-appropriate access. Every moving route must stay on its intended surface or corridor.

Report the checks actually performed. For a new layout or actor path, leave a small focused regression check or assert-based self-check for its important behavior.

For V5 environments, review the brief's spatial choice and physical/schematic explanation. Hide names and relationships to inspect the underlying organization. Check indoor doorway clearance, cut-away walls, room names and mixed-environment return. Build each saved landscape with the ordinary V2 builder; run `scripts/browser-check-v5.js` against the five `/v5/` previews for all stories, actual motion, exact return, fullscreen, mobile and autoplay. `check-v5.mjs` is included in the main model/CLI suite.

## After changing the shared kit

From any working directory, where `SKILL` points to this skill:

```sh
node "$SKILL/scripts/check.mjs"
node "$SKILL/scripts/build.mjs" "$SKILL/examples/repair-service" "$PWD/preview"
node "$SKILL/scripts/build.mjs" "$SKILL/examples/heat-exposure" "$PWD/preview/heat"
python3 -m http.server 8765 --bind 127.0.0.1 --directory "$PWD/preview"
```

The model/CLI suite checks both examples, independent input data, escaping, invalid data, route endpoints, motion math and preservation of existing output on invalid input.

Browser suites are Playwright functions. Run the relevant files with the browser tool's `filename` option, using absolute file paths. They use isolated contexts and expect the bundled repair/heat builds at `http://127.0.0.1:8765/` and `/heat/`:

- `scripts/browser-check.js`: repair objects, labels, stories, layers and responsive interactions.
- `scripts/browser-check-heat.js`: heat stories, annotations, sources and responsive layout.
- `scripts/browser-check-entrance.js`: viewport canvas, floating panel, entrance, scroll and reduced motion.
- `scripts/browser-check-navigation.js`: zoom, focal point, interruption and fullscreen/fallback.
- `scripts/browser-check-motion.js`: actor travel, access states, cancellation and camera independence.
- `scripts/browser-check-playback.js`: all stories autoplay once, restart, reading pauses, manual takeover, pause/resume, actor switching, offscreen cancellation and mobile sheet behavior.
- `scripts/browser-check-city.js`: actual foot-to-line alignment, stable cast, reversible accelerating panel, full-workspace fullscreen, mobile fallback and the small/large city fixtures. First build the extra examples with `node "$SKILL/scripts/build-city-examples.mjs"` from the same working directory as the preview server. It reports local loading/node counts and frame samples during keyboard panning.
- `scripts/browser-check-v2.js`: build `scripts/build-v2.mjs` into `/v2/`, then check three-level drilldown, exact return state, every local process, all new actor kinds, explicit handoffs, actual route alignment, moving-vehicle selection, fullscreen and mobile navigation. `check-v2.mjs` is included in the main model/CLI suite.
- `scripts/browser-check-v3.js`: run `build-v3-example.mjs` first. Checks mixed-size framing, stable geometry, return navigation, node retention, compact pointer/list access and the 30-place fixture. Reuse `checkV2(page, 'v3')` from `browser-check-v2.js` for all process/motion/fullscreen checks on V3; when using a filename-only runner, change the default preview in a temporary copy.

`scripts/check-v3.mjs` is included in the main suite: size validation, deterministic footprints, purposeful extra parts, route clearance, connected roads, pedestrian/vehicle surface choice, flight corridors, recomposed markers/endpoints, preserved people/stories and safe local composition CLI.

V4: `scripts/check-v4.mjs` is included in the main suite. It covers shortest permitted routes, named ports, one-way travel, unjoined crossings, widths and swept obstacle/scenery clearance, activity-group composition, process references and failed-composition preservation. Build `scripts/build-v4-example.mjs`, then run `scripts/browser-check-v4.js` for screen-pixel thresholds/hysteresis, stable geometry, layer/focus precedence, every local part state and scale navigation. Reuse the nested suite with `checkV2(page, 'v4')` for complete process/motion/fullscreen coverage. Visually inspect the network without highlighted routes, local close-ups and phone overview/zoom.

`scripts/check-city.mjs` is included in the main model suite: shared route endpoints, closed-door truncation, conflicting-path rejection, legacy input support, stable varied person profiles, five/thirty-place composition, non-overlapping plots and safe composition output.

Spatial recipes: `scripts/check-spatial.mjs` is included in the main suite. It covers four orientations, named/four-sided ports, roof/canopy height clearance, gate widths, reserved bays, relative/repeated placement, shared scenery, per-port actor starts and safe builds. Build `scripts/build-spatial-example.mjs OUTPUT/spatial`, serve OUTPUT on port 8766 and run `scripts/browser-check-spatial.js`. Inspect `assets.html`, overview, every story and phone zoom. See `spatial-objects.md` for the authoring contract.

These fixtures test the shared kit. Review each new issue's own labels, paths and narrative separately. Browser suites currently target Chromium; Safari/WebKit, physical devices, VoiceOver and larger-map performance need their own verification.
