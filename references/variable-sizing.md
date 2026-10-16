# V3: give important work more room

Choose the visual hierarchy separately in every view. Give the main object or process more floor area and useful content; keep supporting and contextual objects compact. A small system in the city can open a large local explanation. Preserve normal-sized people, doors, vehicles and equipment within each physical scene.

Record these choices in the brief. Size expresses explanatory priority unless the supplied material explicitly defines a quantitative scale. Keep sizes stable during selection, playback and navigation.

V5 applies the same hierarchy to each chosen environment: compact supporting stations, useful primary work areas and rooms with enough circulation. Choose the environment first (`landscapes.md`); use `rooms` for actual partitions and doorways, `rows` for open workstations/components. Keep door clearances independent of decorative cutaways.

## City plots

Optional `emphasis` and `size` belong to the drawing's `layout.json`:

```json
{
  "seed": 92713,
  "districts": [{"label":"Neighbourhood work","plots":[
    {"entity":"workshop","asset":"workshop","emphasis":"primary"},
    {"entity":"park","asset":"park","emphasis":"supporting","size":"expanded"},
    {"entity":"van","asset":"van","emphasis":"context"}
  ]}]
}
```

`primary`, `supporting` and `context` select expanded, regular and compact recipes where available. Explicit `size` overrides this choice. These are editorial roles, not a requirement to use exactly three sizes throughout a map. Different recipes have different footprints. Recipes without variants retain their physical dimensions, including vehicles; unsupported explicit sizes are rejected. Office `height` remains available when no size variant is selected.

The supported dimensions are defined in `kit/sizing.mjs`:

| Recipe | Compact | Regular | Expanded |
|---|---|---|---|
| office | 95 × 76 × 93 | 122 × 98 × 121 | 184 × 126 × 149 |
| workshop | 196 × 110 × 62 | 256 × 128 × 62 | 360 × 190 × 68 |
| park | 150 × 110 × 72 | 200 × 150 × 72 | 300 × 180 × 72 |
| desk | 65 × 44 × 52 | 75 × 48 × 52 | 110 × 64 × 52 |
| workbench | 80 × 48 × 55 | 90 × 55 × 55 | 150 × 86 × 55 |
| tester | 80 × 48 × 65 | 85 × 55 × 65 | 180 × 105 × 65 |
| shelf | 48 × 32 × 68 | 75 × 40 × 68 | 120 × 48 × 68 |
| terminal | 52 × 40 × 45 | 65 × 48 × 45 | 120 × 72 × 45 |
| queue | 48 × 36 × 40 | 90 × 50 × 40 | 140 × 64 × 40 |

Adding either field activates footprint-based district packing. Larger plots are placed first; smaller ones use remaining row space. Each plot reserves its own width and access area. Districts share streets rather than inheriting one maximum plot size. Layouts without either field keep their existing composition.

Run `scripts/compose.mjs INPUT INPUT/scene.json`. The scene saves `size`, `emphasis` and concrete dimensions. Declared sizes must match their registered dimensions. Recompose after changing sizes so streets, paths, endpoints, markers and labels move together. Then refine the scene as needed. The normal single-level component study includes each distinct size present in its input.

## Local working areas

For rooms and digital processes use workflow-ordered rows instead of city districts:

```json
{
  "seed": 92713,
  "theme": "room",
  "rows": [
    [
      {"entity":"intake","asset":"desk","emphasis":"context"},
      {"entity":"diagnosis","asset":"tester","emphasis":"primary"},
      {"entity":"parts","asset":"shelf","emphasis":"context"}
    ],
    [{"entity":"repair","asset":"workbench","emphasis":"primary"}]
  ]
}
```

Use `theme: "digital"` for a process board. Every entity appears exactly once. The same compose command recognizes `rows`; do not supply `districts` as well. Each station gets its own footprint and access area. Rows follow the authored workflow, and connections use clear shared aisles. Special interiors such as parks, vehicles and machines can still be authored directly. Set `scenario.actor.identity` when composing alternate stories about the same person.

Larger benches add working surfaces, instruments and documentation; larger workshops add normal-sized benches and equipment. Shelf bays and queue slots repeat within the supported dimensions. Small objects keep integrated names and a 44-pixel pointer target; zoom and the object list expose their full detail.

## Plan the network with the places

Decide how each moving thing gets from its origin to its destination before finalizing the landscape:

- **Streets:** shared main connections and local branches, with clear junctions, loading/parking access and intentional end bays. A semantic relationship does not require its own road.
- **Walking and cycling:** entrances, park exits and shared paths connected to the neighbourhood; mark crossings where they meet roads. Avoid routes through buildings, equipment and trees.
- **Aircraft, rail, water and other modes:** appropriate terminals and continuous mode-specific corridors. Author these when the supplied issue needs them, including transfers to another mode.
- **Data and electricity:** purposeful component connections or cable/service corridors. A dependency may be highlighted without any traveling actor.
- **Local rooms:** aisles and access points that match the actual workflow. Reserve space for movement while sizing workstations.

The V3 district composer supplies a connected street hierarchy with separate shared walking/cycling paths and marked crossings. Car/van stories use roads and wider access bays; plane stories get elevated routes between aprons. Other relationships follow service/path corridors. Inter-district boulevards and a cross-band connector are added only when needed. Dead-end branches terminate at access bays rather than extending to empty map edges. Routes reuse this network; they do not create a new street for every relationship.

This is editable starting geometry. Review approaches, crossing semantics and endpoints against the issue; rail, water, unusual transfers and domain-specific circulation need authored surfaces/routes. Check the network both with route highlighting off and with every process running. Distinguish a physical junction from two explanation lines merely crossing.

## Example and build

`examples/v3/` contains eight independent views with the same repair stories as V2, varied city footprints and local priorities. It retains the V2 manifest contract:

```sh
node "$SKILL/scripts/build-v2.mjs" "$SKILL/examples/v3" "$OUTPUT"
```

To regenerate the bundled inputs and the separate `preview/v3/` and `preview/v3-scale/` examples, run `scripts/build-v3-example.mjs` from the project directory. The latter has 30 places and 33 root entities. Use the ordinary compose/build commands for independent projects.
