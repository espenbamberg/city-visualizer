# V4: shared networks, activity groups and process detail

V4 uses the existing issue/scene data and nested `map-v2.json` manifest. Build saved inputs with `scripts/build-v2.mjs INPUT OUTPUT`. `examples/v4/` contains the eight-view repair example; the standalone output belongs in a separate `preview/v4/` directory.

V5 extends this network rather than replacing it. `network.setting: "indoor"` keeps walking on the floor; optional port `z` defaults to 3 and supports the indoor travel plane at 4. Room wall/opening data drives both rendering and passage clearance. See `landscapes.md` for the profile and room contracts; outdoor V4 scenes retain their geometry.

## Plan the landscape

Choose the main activities and their meaningful proximity from the brief. Compose related places as a street, a courtyard or a green/public area. Reserve circulation before adding scenery. Give each place a useful entrance; a workshop can have separate public and loading access. Important objects retain their V3 footprint and content priority.

For an editable starting city, `scripts/compose.mjs INPUT OUTPUT-SCENE` accepts a layout with `groups`, `network` and `routes`:

```json
{
  "seed": 92713,
  "groups": [{
    "label": "Workshop courtyard",
    "pattern": "court",
    "at": [50, 40],
    "plots": [
      {"entity":"workshop","asset":"workshop","emphasis":"primary","at":[0,0]},
      {"entity":"home","asset":"house","emphasis":"supporting","at":[450,0]}
    ]
  }]
}
```

This fragment describes placement; add the network and one route for every relationship before composing. Patterns are `street`, `court` and `green`. Group `at` is a world-space origin; optional plot `at` is a local offset. Omitted plot positions use a stable pattern-based starting arrangement. Every entity appears exactly once. Overlapping footprints are rejected. Ports and routes are compiled after placement. Decorative trees and people are placed outside the reserved traffic corridors.

Save refined geometry in `scene.json`. Re-running the composition CLI replaces its requested output, so use another output path when retaining a hand-refined scene. The main V4 example deliberately authors its courtyard, park, loading bay and delivery area; a larger scale fixture uses shared service-area paths.

## Explicit networks

`scene.network` contains `nodes`, `ports` and `edges`:

```json
{
  "nodes": [
    {"id":"public-door","at":[230,262,3]},
    {"id":"courtyard-junction","at":[460,262,3]}
  ],
  "ports": [{
    "id":"workshop-entry","entity":"workshop","node":"public-door",
    "side":"front","position":0.5,"offset":32
  }],
  "edges": [{
    "id":"public-path","from":"public-door","to":"courtyard-junction",
    "surface":"path","modes":["person","bicycle","data"],"width":40
  }]
}
```

- IDs are unique within each collection and use the normal lowercase ID convention.
- Node `at` is `[x,y,z]` in world units. Connections exist only through shared node IDs. Lines touching or crossing do not create a junction automatically.
- A port belongs to an entity and owns one node. `front` uses `x + w × position, y + d + offset`; `right` uses `x + w + offset, y + d × position`. Port elevation is 3. Position is between 0 and 1, and offset is nonnegative. Keep enough clearance for the traffic using that port.
- Edge `surface` is `road`, `path`, `crossing`, `air` or `cable`. `modes` lists allowed actor kinds. Road supports ground vehicles; paths/crossings support people and bicycles; air supports planes; cables support data, documents and electricity. Symbolic flows can also follow ground service corridors.
- `width` is a world-space corridor width, not a pixel stroke. Validation reserves the actor's swept footprint, including heading changes. Minimum widths are 14 for people, 38 for bicycles, 56 for cars/vans and 88 for aircraft. Use more space when the activity needs it.
- Optional `oneWay: true` permits travel only from `from` to `to`.
- Optional `points` defines an edge polyline. Its endpoints must match the named nodes exactly. Without it, the edge is a straight segment between its nodes.

Surfaces use the same edge geometry as routing. Mark crossing edges explicitly and order them after road edges when drawing them over a road. Short entrance paths join the outside port to the object; aircraft ports have an apron. Aircraft flight edges have no ground paving.

Keep unusual left/rear entrances, rail, water and terrain-specific circulation as authored scene geometry until the corresponding recipes and modes are supported. Current port recipes cover front/right ground-level access. Transport retains sixteen world-projected headings.

## Resolve a journey

A network route references its relationship and ports:

```json
{
  "relation":"visit",
  "network": {
    "from":"home-entry","to":"workshop-entry","mode":"person",
    "via":["courtyard-junction"]
  }
}
```

`via` is optional. The compiler chooses the shortest permitted route by actual edge length, with stable ID tie-breaking. Ports must belong to the relationship's source and target. The mode must fit the relationship and the actor using it. Use separate relationships for journeys requiring different modes/routes rather than silently reusing one incompatible route.

`compileNetwork(issue, scene)` in `kit/network.mjs` resolves port positions and writes the route's `points` and ordered `edges`. The group composer also rebuilds actor start positions and story markers. When authoring a scene directly, update affected scenario placements after recompiling; normal validation rejects discontinuous actor paths.

Saved scenes carry both the network references and compiled geometry. Builds validate that they agree. A stale port, stale route, unavailable direction or unreachable destination fails before replacing the HTML. Authored legacy `points` routes and `routeEnd` remain supported alongside network routes.

Collision validation checks complete segments against conservative expanded building and scenery bounds. Trees, lamps, benches and decorative vans must clear the corridor. Cables can enter logical/component areas. Elevated edges clear obstacles only above their reserved height. Review visual approaches and furniture as well as these geometry checks.

## Process-specific interiors

Use the existing sizes with an optional instance `process` recipe:

| Process | Parts | Visual treatment |
|---|---|---|
| `intake` | `record`, `appliance` | Received appliance and job record |
| `repair` | `appliance`, `component`, `tools` | Open appliance, component and tools |
| `measurement` | `component`, `probes`, `meter` | Exposed circuit, probe cable and instrument |
| `readout` | `input`, `display`, `record` | Input connection, signal display and record |
| `record` | `record`, `contact`, `slot` | Order information and input fields |
| `checks` | `record`, `fields`, `capacity`, `decision` | Explicit checks and decision controls |
| `dispatch` | `record`, `queue`, `output` | Record, staged documents and output |
| `storage` | `labels`, `stock` | Labeled parts shelving |
| `queue` | `tickets`, `released` | Waiting slots and release area |

Storage/queue use `shelf` or `queue` assets of at least 48 × 32. Other processes use `desk`, `workbench`, `tester` or `terminal` assets of at least 52 × 40. Geometry stays inside the supported work surfaces; people and equipment keep normal scale. Choose the recipe from the activity, not merely from the desired shape. Extend a local recipe for a genuinely different process.

Each `scene.scenarioLayouts[].steps[]` may contain `parts`:

```json
"parts": [
  {"entity":"diagnosis","part":"probes","state":"active"},
  {"entity":"diagnosis","part":"meter","state":"active"}
]
```

States are `active`, `done`, `waiting` and `blocked`. References must name actual parts on the owning recipe. Each step is a complete visual snapshot: omitted parts are idle, not inherited from earlier steps. This makes direct jumps, restart and nested return deterministic. Use the state justified by the story; do not invent capacity values or queue counts. Parts are explanatory highlights, while independent interaction still belongs to named entities.

## Zoom-adaptive detail

Set `scene.adaptiveDetail: true`. The renderer marks integrated labels and fine recipe geometry, retaining the full object and its bounds. The viewer selects detail per object using its projected screen width:

- Overview below 85 pixels: main forms, activity and priority names.
- Area at 85 pixels: supporting names and detail markers.
- Close-up at 180 pixels: fine lines and process markings.

Return thresholds of 76 and 162 pixels prevent flicker near a boundary. The calculation includes SVG fitting, viewport size and current camera scale. Active objects retain at least area detail; active process parts and keyboard-focused objects expose their relevant details. Label/connection switches retain their authority.

Fine detail changes opacity rather than physical geometry. Fit, click targets and source-focused drilldown use stable bounds. Repeated navigation mounts one scene, and resizing/fullscreen/return recalculates the appropriate detail. Reduced motion makes level changes immediate. Complete text explanations remain available offline without JavaScript.

## Verification

Run `scripts/check.mjs`; V4 network, mode, clearance, group, part-reference and CLI checks are included. Build the bundled main/scale previews with `scripts/build-v4-example.mjs`, then run `scripts/browser-check-v4.js`. Reuse `checkV2(page, 'v4')` from the nested navigation browser suite to check all eight views, actor movement, autoplay, fullscreen and exact return. Review the overview with routes hidden, process close-ups, small-screen detail and the scale fixture.
