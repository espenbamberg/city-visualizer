# Landscapes that follow the content — V5

Choose the environment while authoring the explanation, before composing geometry. It stays stable during stories and zoom; a drilldown is an authored change of spatial frame. `issue.json` keeps the meaning, relationships and sources; layout and scene carry geometry and the optional environment.

## Choose from the handoffs

1. Identify the reader's question, the actor and the important handoffs.
2. Locate the work: separate places, shared grounds, rooms, workstations or components.
3. Choose the smallest frame that explains the whole view. Record the reason in the brief.
4. Honor supplied geography, organization and sizes. If uncertainty changes the meaning, ask whether activities share a location or belong to separate organizations.
5. Choose again for each useful drilldown; add 1–5 concrete local processes and boundary mappings.

A hospital can be a campus for transport, a building for a patient journey, or a workspace for a laboratory process. Topic keywords alone do not determine the profile. Use a simple composition when two alternatives explain the same thing equally well. Physical and schematic arrangements must be clearly distinguished in the brief and page copy.

| Environment | Useful frame | Layout |
|---|---|---|
| `city` | Independent places and services connected by streets and paths | `districts` or `groups` |
| `campus` | Buildings sharing one site, common arrival and pedestrian circulation | `groups` with court/green clusters and explicit shared access |
| `building` | Rooms in one connected floor plan | `rooms` with front openings and a common corridor |
| `workspace` | Workstations, materials and equipment explaining local work | `rows`, default `theme: "room"` |
| `technical` | Components explaining information or energy flow | `rows`, default `theme: "digital"`; choose `room` for actual physical equipment |

Profiles guide the organization, not object count. A campus differs through clustering and common circulation, not just a greener color. Choose concrete recipes and sizes for the content. Keep specialized assets in the issue's local kit. Logical functions may use the existing process surfaces/cards as a stated metaphor; do not add invented servers, people or roads.

## Compose and preserve edits

`scripts/compose.mjs INPUT OUTPUT-SCENE.json` reads `INPUT/issue.json` and `INPUT/layout.json`. The layout has an optional `environment`, a saved nonnegative integer `seed`, and exactly one of `districts`, `groups`, `rows` or `rooms`. A missing seed is generated once by the CLI; save it for reproducible future composition.

Unknown or incompatible profiles fail before output is written. Input without an environment uses the established district/group/row behavior. Explicit `workspace`/`technical` rows generate a shared local network; old rows retain their authored legacy routes. Ordinary `build.mjs`/`build-v2.mjs` reads the saved scene and never recomposes it.

After composition, refine terrain, marker placement, names and part states in `scene.json`. Recomposition replaces those refinements. Changing the environment field on a finished scene documents its frame; it does not transform the geometry.

## Rooms on one floor

```json
{
  "environment": "building",
  "seed": 81403,
  "rooms": [
    {
      "id": "reception",
      "label": "Mottaksrom",
      "w": 180,
      "d": 208,
      "h": 64,
      "door": {"offset": 105, "width": 48},
      "plots": [{"entity": "intake", "asset": "desk", "size": "regular", "process": "record"}]
    }
  ]
}
```

The complete example is `examples/landscapes/building/`; the snippet only describes one room. Every issue entity needs one plot.

- `w`/`d` describe the interior, excluding five-unit walls. `h` defaults to 64 and must be at least 30.
- Optional room `at: [x,y]` is absolute; otherwise rooms are arranged from `[10,10]`, separated by one shared wall. Optional plot `at` is relative to its room; otherwise stations follow left-to-right with working space.
- Doors are in the front wall (`y + d`). `offset` starts at the interior's left edge; `width` is the clear opening. Both ends need at least five units of wall. An omitted `open` means open; `open: false` blocks travel.
- A shared corridor runs in front of the deepest room. Stations connect to their room's inner aisle, then through its doorway to the corridor. A 20-unit-wide walking network is checked against walls and equipment. Too-narrow or closed openings fail; widen/reposition the passage or author a different reachable route.
- Floor top is z=3 and travel is z=4. Ports keep `front`/`right` directions and accept optional nonnegative `z` (default 3), so port nodes, anchors and routes share the same height.
- Front/right walls are visually cut away; their full extents still block travel. Shared room geometry is the sole source for rendered walls and wall obstacles. A room itself is not a solid obstacle box.
- `scene.rooms` stores room geometry (`id`, `label`, `x`, `y`, `w`, `d`, `h`, `door`). Each station's `room` names its room. The scene also stores ordinary instances, ground, network, routes and scenario layouts.
- Room geometry supports authored rectangular, single-floor arrangements. The composer supplies one front door per room and a front corridor; additional door directions, internal door networks or stairs need an explicit model extension. Use separate views for useful floors. A closed door is an authored geometric state, not a story-driven door animation.

## Indoor and technical connections

`network.setting: "indoor"` renders walking paths on the room floor, without raised outdoor path surfaces or entrance strips. Relationship highlights and actors still use exactly the compiled route points. Cable-style links remain visible. Setting defaults to outdoor for compatibility. Relationship modes follow the traveling actor; different representations sharing one relationship require separate authored relationships.

Physical local networks support people and appropriate document/data/energy handoffs. Logical technical rows use cable links and document/data/electricity actors. Dependencies and hosting stay static relationships. Keep other transport and special geography in authored scene data.

## Examples and checks

`examples/landscapes/{city,campus,building,workspace,technical}/` each contains a brief, a `map-v2.json` and editable issue/scene/layout files. All five work as root maps; building also opens a workspace. Existing nested-map ownership, boundaries and exact paused return are unchanged. The home control says **Hele kartet**.

The workspace's `comparison/scene.json` uses exactly the same issue in a three-room organization. It is an alternative illustrative organization, not a second claim about a real site. Use that scene instead of the workspace scene to build the comparison.

```sh
node "$SKILL/scripts/build-v2.mjs" "$SKILL/examples/landscapes/building" "$OUTPUT"
# Regenerates the bundled V5 input fixtures and five outputs; overwrites fixture scene refinements:
node "$SKILL/scripts/build-v5-examples.mjs" "$OUTPUT/v5"
node "$SKILL/scripts/check.mjs"
```

The fixture generator uses fixed seeds for regression. New issue projects should save a fresh seed.

Review the environment with labels and story lines hidden, then inspect overview, close-up and phone. Check doorways, actor clearance, active process parts, stable Fit/geometry and return focus. `check-v5.mjs` covers profile contracts, invalid passages, equipment clearance, larger room/row compositions, same-issue alternatives and safe CLI output. `browser-check-v5.js` covers stories, real motion, return, fullscreen, mobile and autoplay at `/v5/`.
