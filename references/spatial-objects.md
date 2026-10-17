# Spatial objects: rotation, access and outdoor recipes

The additive spatial contract keeps existing saved scenes valid. New recipes share one definition for drawing, physical obstacles, reserved access and named connections. Use the same recipe as an inspectable instance (`asset`) or decorative scenery (`type`). Scenery does not gain relationships or an inspector.

`examples/mobility-hub/` contains editable issue/layout/scene inputs and five working stories: shelter access, cycle parking, a garden gate, tree shade and an electrical supply. `examples/mobility-hub.mjs` regenerates those bundled inputs; copy the JSON files into your project for an independent map.

## Recipes

Definitions live in `kit/outdoor-assets.mjs`:

| Recipe | Minimum width × depth; height | Named sockets | Options |
|---|---|---|---|
| `corner-shop` | 130 × 85; 65 | `public`, `delivery` | `sign` up to 24 characters |
| `bus-shelter` | 110 × 55; 52 | `waiting`, `boarding` | Roof, posts, bench, timetable and sign form one assembly |
| `bike-rack` | 66 × 28; 22 | `parking` | `options.bays`: integer, default 3; at least 18 units per bay |
| `charging-bay` | 64 × 110; 37 | `vehicle`, `power` | Cabinet, cable and marked vehicle space |
| `planting-bed` | 120 × 70; 16 | `edge` | Plants repeat at normal scale as width/depth increase |
| `canopy-tree` | 58 × 58; 75 | `shade` | `options.crown`: `round` or `column` |
| `fence` | 180 × 8; 28 | `gate` when configured | `options.path` and `options.gate` |

Width/depth may increase; recipe height stays fixed. Omitted scenery dimensions use defaults. Instances keep explicit `w`, `d`, `h`. Colors remain six-digit hex values. Unknown options and undersized recipes fail validation. Legacy assets retain their existing size contracts.

## Orientation and space

Spatial recipes accept `rotation: 0 | 90 | 180 | 270` and optional nonnegative `z`. Dimensions describe the **unrotated** recipe; `x`/`y` are the minimum corner of its rotated footprint. At 90/270 degrees occupied width/depth swap. World geometry transforms before projection; the finished SVG is never rotated as a flat image.

- **Visual bounds** contain rendered parts, including roofs and signs, for framing and selection.
- **Obstacles** are rectangular 3D volumes. Roofs and canopies leave ground-level passage; posts, benches, trunks and rails remain solid. Checks include traveler height and the corridor's full width.
- **Reserved access** prevents other objects occupying approaches or vehicle bays. Routes may enter it. The charging recipe currently represents an empty reserved bay; parked vehicles are not an occupancy state.

Legacy recipes reject rotation/elevation until converted. Elevation positions objects but does not generate supports, ramps, bridges or multilevel paths. Canopy checks use conservative rectangular volumes. Room doors retain their existing contract.

## Access

Explicit network ports accept local `front`, `right`, `back` and `left` sides. Spatial recipes also expose named sockets:

```json
{"id":"waiting","entity":"stop","node":"waiting","socket":"waiting"}
```

Optional `offset` moves outward along the socket direction and defaults to zero. Sockets own their elevation; do not combine `socket` with `side`, `position` or `z`. `waiting` is inside the shelter; `boarding` is outside. The charging `power` and `vehicle` sockets are distinct.

Recompose after moving, resizing or rotating objects. Composition rebuilds port nodes, routes, actor starts and step markers. Builds reject stale saved geometry. Stories can start at different ports of the same entity.

## Placement

The `groups` composer supports spatial placement. Other profiles reject these options rather than silently dropping them. Direct scenes can use spatial recipes in any environment.

```json
{"entity":"stop","asset":"bus-shelter","rotation":270,
 "beside":{"entity":"shop","side":"right","gap":80,"align":"start"}}
```

`beside` references an **earlier** entity or scenery ID. Its side is a world-space side of the host's rotated footprint. Alignment is `start`, `center` (default) or `end`; gap defaults to 16. Choose relative placement or explicit coordinates. Collision validation reports conflicts rather than searching for another position.

Top-level layout `scenery` replaces automatic trees/people. It accepts spatial recipes with world `x`/`y` or `beside`, plus optional repetition:

```json
{"id":"street-tree","type":"canopy-tree","x":560,"y":80,
 "repeat":{"count":2,"step":[0,110]},"material":"#9aaa7c"}
```

Repetition produces ordinary saved objects. Counts are 1–100; multiple copies need nonzero spacing. IDs become `street-tree-1`, `street-tree-2`, etc. The base includes scenery and ground-level corridors. Scene JSON stores resolved coordinates. Plot `label`/`labelStyle` can override generated world-space plates; review these overrides after moving an object.

## Fences and openings

Fence paths are local axis-aligned polylines inside the declared width/depth. Gates identify a segment, distance from its start, and width:

```json
{"asset":"fence","w":180,"d":140,"h":28,
 "options":{"path":[[0,0],[180,0],[180,140]],
 "gate":{"segment":0,"offset":70,"width":40}}}
```

The default path is straight across the width. Gate width is at least 20, with four units remaining at each segment end. Drawing and routing use the same gap. A wider corridor can still be rejected by its posts.

## Add a recipe

1. Add a function in `kit/outdoor-assets.mjs` returning `parts`, `obstacles`, `clearances` and `ports`. Set `walkable: true` when people can enter its footprint.
2. Use local-coordinate `box`, `cylinder`, `line`, `sign` and `volume` helpers. Mark ground surfaces `ground: true` so routes appear above them. Body parts use volume-aware painter order.
3. Register the function/default dimensions in `outdoorRecipes`; validate any options in `validateOutdoor`.
4. Add a representative scene and focused geometry checks. Inspect the component study, all orientations and movement through the object.

Registration supplies asset/scenery names and dimensions automatically; renderer and network dispatch need no asset-specific branches. Assemblies are one semantic object. Model independently selectable equipment as separate entities when its role matters.

## Build and verify

```sh
node "$SKILL/scripts/check.mjs"
node "$SKILL/scripts/compose.mjs" "$INPUT" "$INPUT/scene.json"
node "$SKILL/scripts/build.mjs" "$INPUT" "$OUTPUT"
```

Rebuild the bundled study with `node "$SKILL/scripts/build-spatial-example.mjs" "$OUTPUT/spatial"`. Serve `$OUTPUT` on port 8766 for `scripts/browser-check-spatial.js`. It checks every story, actual travel/pause, roof/canopy interleaving, keyboard selection, mobile layout, component study and offline playback. Copy the check file into the project if browser filename access is workspace-confined.
