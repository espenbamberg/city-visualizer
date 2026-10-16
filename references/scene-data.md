# Data-driven maps

Each map is an input directory containing `issue.json` (meaning) and `scene.json` (drawing). The renderer and viewer contain no issue-specific composition or narrative. Repair-service, heat-exposure, reading-day and library-network are working examples at different scales. Optional `layout.json` is input to the composition CLI, which writes an editable scene.

V2 adds an optional manifest joining several such views, `detailView` on entities, boundary mappings, `station`/`vehicle` entity kinds, an `electricity` relationship kind and additional actor/asset recipes. The full extension and authoring workflow are in `nested-views.md`. Existing one-level inputs retain their format.

V3 adds optional instance `size` and `emphasis`, supported recipe dimensions, footprint-based city composition and workflow-ordered local rows. Read `variable-sizing.md`. Nested V3 outputs use the same `map-v2.json` contract and builder.

V4 adds optional `scene.network`, `route.network` with compiled `points`/`edges`, instance `process`, step-layout `parts` and `scene.adaptiveDetail`. Read `networks-and-detail.md` for these contracts and the group composer. The manifest remains `map-v2.json`; older authored scenes keep their interpretation.

V5 adds optional layout/scene `environment` (`city`, `campus`, `building`, `workspace`, `technical`), authored `rooms`, instance `room`, `network.setting` and port `z`. Read `landscapes.md` for environment choice, room geometry and indoor passage validation. The standard builders still consume saved scenes; input without these fields retains its interpretation.

## Build

```sh
node .opencode/skills/city-visualizer/scripts/build.mjs /path/to/input /path/to/output
```

Paths are relative to the calling directory unless absolute. Both arguments are required when specifying a custom input. With no arguments, the script builds the bundled repair-service example into `preview/` in the calling directory, independently of where the skill is installed.

Output contains `index.html` and `assets.html`, both self-contained. The component study uses the asset and scenery recipes present in the supplied scene, rather than a separate demo composition. Existing generated HTML at the output path is replaced. Validation runs before either output is written.

## Meaning: `issue.json`

Required fields:

- `title`, `question`, `summary`: nonempty text.
- `status`: internal metadata; `sourced`, `user-provided`, `inferred`, `assumed`, `disputed` or `fictional`. It is not displayed on the page.
- `sources`: records with unique `id`, `title`, `locator` and optional `date`.
- `entities`: records with unique `id`, `number`, `label`, `kind`, `role`, `description`, `constraint`, `source` and `status`. Kinds are `place`, `system`, `infrastructure`, `station` and `vehicle`. Optional `detailView` refers to a V2 view.
- `relationships`: records with unique `id`, entity IDs `from` and `to`, `kind`, `label`, `source` and `status`. Supported kinds are `movement`, `information`, `dependency`, `technical`, `influence` and `electricity`. Use `influence` for environmental effects and `electricity` for electrical energy connections.
- `scenarios`: records with unique `id`, `number`, `label`, `summary`, `condition`, `outcome` and nonempty `steps`. Each step has `title`, `text` and a nonempty `relations` array of relationship IDs; optional `problem: true` marks friction.

IDs use lowercase letters, digits and hyphens, starting with a letter. Every source and relationship reference must resolve. At least one source, entity, relationship and scenario is currently required.

Optional `presentation` fields override generic page copy: `eyebrow`, `intro`, `storyHeading`, `caption`. They are plain text, not HTML. The map header shows only `issue.title`. The older `mapHeading`, `evidenceNote` and `layoutNote` fields are accepted but no longer displayed. Source/status metadata stays in the model; the page lists readable source titles and locators. Follow the direct-writing rules in `issue-mapping.md` for all generated copy. Use `constraint` for an operating condition that affects the story, not a disclaimer about the drawing.

Optional `legend` overrides the description for each supported relationship kind, for example `{"movement":"Water flow"}`. The legend only displays kinds actually used. Colors and line styles remain consistent across maps; adding a new relationship kind requires a deliberate kit change.

A relationship may include a plain-text `shortLabel` for its in-map connection note; otherwise the note uses its full `label`. Preserve the relationship's meaning: a hosting link must not be described as an extra message transfer.

## Composition: `scene.json`

Required fields:

| Field | Meaning |
|---|---|
| `width`, `height` | Positive SVG viewport dimensions |
| `camera` | `azimuth` and `elevation`, each strictly between 0 and 90 degrees |
| `bounds` | At least two world-space `[x,y,z]` points defining the composition's framing envelope |
| `ground` | Ordered surface primitives, described below; may be empty |
| `scenery` | Decorative objects, described below; may be empty |
| `instances` | One visual object for every semantic entity |
| `routes` | One route for every relationship |

Coordinates are world-space, before projection. `z` is elevation. The camera includes instance bounds with roof headroom, ground, scenery, nameplates, routes and actor paths. Use `bounds` for additional framing space. Optional `seed` is a saved nonnegative integer controlling person variation. For an editable district-based starting layout, use the composer described in `city-composition.md`; inspect and refine the generated map at overview and close-up scales.

### Ground

Array order determines painter's order. Supported primitives:

```json
[
  {"type":"box","x":0,"y":0,"z":-2,"w":300,"d":180,"h":2,"material":"#e4e1d5","r":3},
  {"type":"line","points":[[0,150,1],[300,150,1]],"color":"#8b9587","width":1,"dash":[4,5]},
  {"type":"text","at":[20,170,2],"text":"COMMUNITY SERVICES","size":10,"color":"#65736d","tracking":1.5}
]
```

`box` requires finite position and positive dimensions, plus material; radius `r` is optional (default 0.4). `line` requires at least two points, a color and positive width; its dash array is optional. `text` requires position, text, positive size and color; tracking is optional (default 0). Colors are six-digit hex strings. Raw SVG, CSS and arbitrary HTML attributes are not accepted as primitives.

### Scenery

Every object requires `type`, `x` and `y`. Supported recipes:

| Type | Additional optional fields |
|---|---|
| `tree` | `h` (height, greater than 5), `seed` (nonnegative integer palette variation) |
| `lamp` | None |
| `bench` | None |
| `person` | `z`, `material` (clothing color) |

People also accept optional `id` and `appearance`; see `city-composition.md` for stable identities and profile fields. Instance `people` arrays provide overrides for interior people in local slot order.
| `van` | `material`, `sign` (short side marking) |

Optional `sortAt: [x,y,z]` chooses the object's depth-sorting anchor; otherwise it uses `[x,y,0]`. Scenery is interleaved with semantic objects in depth order, but has no semantic relationships or inspector. Put an object in `instances` when its meaning needs to be explored.

### Instances

Each instance requires `id`, `entity`, `asset`, `x`, `y`, `w`, `d`, `h`, `material`, `anchor` and `label`. Optional `sign` supplies the building's sign text for office, reception, school, cool-room, warehouse, workshop and depot recipes. Omitted signs are blank.

`anchor` and `label` are world-space points. Routes use the anchor. `label` is the top-center of a thin nameplate in its host plane: a ground/roof/base surface by default, or a front face. The camera projects both its text and border with that plane. The plate is painted with its object, so nearer scenery can occlude it. Choose a clear position on a real surface; keep the route anchor outside the plate. The renderer supplies standard shadows, selection outlines and service-point connectors.

Optional `labelStyle` controls the physical plate:

```json
"label": [170.5, 498, 43],
"labelStyle": {"plane":"front","width":45,"size":8,"lines":["Job","records"]}
```

- `plane`: `top` (default; local text axes follow world x/y) or `front` (x/down, on a constant-y face).
- `width`, `size`: plate width and font size in world units. Defaults are name length × 7.5 + 32 and 14. Reserve space for the object number; an undersized plate is rejected.
- `lines`: optional explicit line breaks. Joined with spaces, they must equal the entity's full label. The plate grows with the number of lines; long lines fit within its width.

Top plates have the number beside the name; front plates place it above. Keep small labels readable through zoom and the full-name entity list. Label visibility and selection apply to the integrated plates just as to the original labels. `ground` text also follows the ground plane, for street and shared-base names; the Labels toggle hides those names too.

Available recipes and their authored dimensions:

| Asset | Width × depth × height |
|---|---|
| `house` | 112 × 88 × 72 |
| `office` | 122 × 98 × 121 |
| `reception` | 122 × 98 × 60 |
| `school` | 180 × 115 × 65 |
| `park` | 200 × 150 × 72 |
| `square` | 190 × 130 × 38 |
| `cool-room` | 150 × 115 × 58 |
| `warehouse` | 168 × 91 × 73 |
| `workshop` | 256 × 128 × 62 |
| `depot` | 123 × 89 × 67 |
| `cabinet` | 58 × 39 × 42 |
| `server` | 120 × 70 × 85 |
| `database` | 110 × 70 × 60 |
| `gateway` | 120 × 55 × 34 |

These are the legacy default dimensions. Reposition, relabel and recolor recipes in data. Office window floors adapt to height; the district composer accepts office heights from 65 to 240. For V3 sizes, use the registry in `variable-sizing.md`; a scene's declared `size` must match its registered `w`, `d`, `h`. Preserve other authored dimensions unless you also review their fixed interior/facade details. The workshop specifically depicts appliance repair; use or add a different recipe for a different activity instead of mislabeling its contents.

The school contains desks, books, chairs, pupils, a teacher and board. The park contains a crossing path, benches, trees and shade patches. The square is exposed paving with waiting furniture and meeting sign. The cool room contains seats, visitors, drinking water and a cooling unit. Scenario state controls the entrance's open/closed appearance.

### Routes

```json
{"relation":"request","via":[[90,150,3],[290,150,3]]}
```

`relation` identifies a relationship in `issue.json`; `via` contains zero or more world-space waypoints. The start and end come from its source/target instances' anchors. Repositioning an instance and anchor changes the endpoint, not the relationship's meaning. Update waypoints to maintain clear corridors when changing layout. All connections are visible initially. Crossing lines are not junctions.

Alternatively supply `points`, an array of at least two world-space points containing the entire route including endpoints, and omit `via`. Use this for walking routes, whose endpoints are the actual walking positions. People and their visible lines share these points; moving a building also requires updating its walking endpoints. A layout step's optional `routeEnd` truncates the shared route to a reachable endpoint such as a closed entrance.

### Local scenario steps

Optional `scenarioLayouts` adds in-map navigation to a scenario without changing its meaning:

```json
"scenarioLayouts": [{
  "scenario": "single",
  "steps": [{"at":[150,80,55],"links":[{"relation":"handoff","segment":1,"position":0.2}]}]
}]
```

Each layout names an existing scenario and supplies exactly one placement per step, in the same order. `at` is a world-space marker point near the relevant person, workplace or system. Markers show ordinal step numbers, distinct from the permanent object IDs. They are temporary screen-readable annotations; the permanent nameplates retain their surface perspective.

Each `links` entry names a relationship used by that step. `segment` is a zero-based index into the route polyline **including its entity anchors**. Optional `position` selects a fraction along that segment (0–1, default 0.5). This keeps the note's dot on the actual route after reprojection. Choose a clear segment and position so the text avoids markers and buildings; inspect each active step. An empty `links` array is allowed.

Selecting the scenario shows all its numbered markers, with only the current step's title and connection notes expanded. Click or use Enter/Space on a marker to jump to its step. Previous/Next stays synchronized. Escape clears the story and returns keyboard focus to the map. Connection and label toggles also control the temporary notes. Other stories, entity inspection and overview clear the annotations. Layouts are optional; the original side-panel-only stories remain supported.

Every scenario selection starts automatic playback from step one, including reselecting the active scenario. Each step waits for actor arrival, then allows reading time at roughly 250 words/minute (at least three seconds), including the starting condition and final outcome where shown. The story stops at its outcome. Pause/Play freezes and resumes travel and progression; Replay starts over. Previous/Next and direct marker selection take over manually. Space on the focused map background toggles playback, including fullscreen. Selecting an entity, returning to overview, hiding the tab or leaving the map stops automatic progression. Returning does not restart it. Automatic steps preserve a collapsed mobile sheet. Reduced motion skips movement while retaining reading time and automatic stepping.

## Optional living scenarios

An animated scenario adds `actor` in `issue.json`:

```json
"actor": {"kind":"person","label":"Resident in the ochre coat","start":"home"}
```

Supported kinds are `person`, `document`, `car`, `van`, `bicycle`, `plane`, `data` and `electricity`. `start` is an existing entity ID. Optional `entity` binds a moving actor to a named object. See `nested-views.md` for explicit step-level handoffs. Every step in that scenario supplies a complete `state`:

```json
"state": {
  "at":"school",
  "via":"walk-school",
  "moving":"Walking to school",
  "caption":"At the school pickup point",
  "access":{"entity":"cool-room","value":"open"}
}
```

`at` must be an entity involved in that step's relationships. `caption` describes its settled state. Optional `via` names a relationship in this step from the previous step's location (or actor start) to `at`; it requires `moving` text. People and vehicles use movement relationships, data uses information, electricity uses electricity. Documents may use movement or information relationships. Dependencies and technical links cannot carry an animated transfer. A document may instead appear at a new location, as the booking symbol does when persistence is explained.

Optional `access` sets `open` or `closed` on an entity rendered by the `cool-room` recipe. Repeat it in each step that needs that access state, including before a participant discovers a closure. The overview restores the recipe's default open cutaway.

The corresponding `scene.scenarioLayouts` entry adds `actor: {"identity":"resident","at":[126,156,3],"material":"#b58b58"}`. `identity` and `appearance` are optional; see `city-composition.md`. A moving person resolves its path from the `points` on its `state.via` route; omit the layout `path`. Optional `routeEnd` is an inclusive point index greater than zero. The first resolved point must equal the preceding step's final point or initial actor placement. A stationary person or symbolic appearance supplies a one-point `path`, with no `via`. Documents retain their authored `path`, including multi-point information transfers. Choose routes on actual depicted walking surfaces and around furniture.

Existing person inputs with standalone layout paths still load: their active visible line is compiled from that walking path. When a route has explicit `points`, a conflicting layout path is rejected. Prefer the shared-route form for new maps. Generated HTML embeds resolved paths for runtime and inspection.

Sequential, completed steps animate along the next path. Backwards/nonadjacent jumps, changes during unfinished movement and symbolic appearances use a short fade into the requested state. Holding the same actor at the same position does not blink it. Changing story/entity or returning to overview clears the actor. Reduced motion jumps to the final state. Offscreen/background transitions in one-level maps resolve to the selected end state and stop rather than replaying later; V2 pauses in place so navigable parent/child states retain exact positions.

Geometry is generated once. The runtime moves one actor per scenario and interleaves people with depth-sorted objects. Park, square and cool-room floors are rendered below walking lines; furniture and people are above them. Park trees and furniture are individually depth-ordered. Documents are overlays. Travel duration grows with path length, from 1.2 to 12 seconds, before the reading pause. Review routes and drawing order against the scene geometry.

The live status shows travel versus arrival and remains visible in fullscreen. Actor label/status text is plain text. Validation rejects missing state/placement, invalid IDs, non-finite points, unsupported materials/access states, discontinuous movement and invalid transfer types. Existing scenarios need none of these fields.

## Verification

`scripts/check.mjs` checks the repair fixture, the heat-exposure transfer example, and an independent small renderer fixture with different IDs, distant coordinates, two sources, a different internal status and one scenario. It also tests alternate input/output directories, escaping, malformed drawing fields and preservation of generated output on invalid input. `scripts/browser-check-heat.js` exercises both heat stories, exact connection highlights, source display, annotation/component bounds and mobile layouts.

These checks verify data independence and the bundled examples. Follow `verification.md` to review a new issue's own composition and stories.

`scripts/check-motion.mjs` covers the spring, path sampling and malformed actor data; `scripts/browser-check-motion.js` checks real movement, all animated states, cancellation, camera/story independence, offscreen resolution and fullscreen status.
