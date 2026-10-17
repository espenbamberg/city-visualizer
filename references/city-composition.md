# Size the city to the issue

First choose the view's environment using `landscapes.md`. This reference covers outdoor places. A building, workspace or technical process can be the root map; it does not need an enclosing city. Campus composition uses activity groups and a shared site entrance/path network rather than independent street plots.

Choose the number of places, services and infrastructure objects from the brief. Five and thirty places are working examples, not size presets or limits. Give an object its own place when its role or handoff needs to be explored independently. Group related objects into named districts. Include IT services and their technical foundation only to the depth supported by the material.

Write the choice of scope in `brief.md` before composing. A small reader journey may need five places and no IT. A regional operating strategy may need thirty workplaces, five applications and three infrastructure objects. These are different explanatory needs, not different detail settings on the same diagram.

## Compose an editable starting city

Supply `issue.json` and a `layout.json` alongside it:

```json
{
  "districts": [
    {"label":"Neighbourhood services","plots":[
      {"entity":"welcome","asset":"reception","sign":"WELCOME"},
      {"entity":"collection","asset":"office","height":149,"sign":"COLLECTION"}
    ]}
  ]
}
```

Every entity must appear in exactly one plot. Choose each recipe deliberately. Optional plot `material` is a six-digit hex color; `sign` is short building signage. `height` can vary office buildings between 65 and 240 world units; their window floors follow the height. Optional `emphasis` and supported `size` variants express visual priority. All district layouts use individually sized plots, staggered street frontages and shared streets/paths. See `variable-sizing.md` for the size registry, local workflow rows and network design. Recipes without a variant keep their authored dimensions in `scene-data.md`.

```sh
node "$SKILL/scripts/compose.mjs" "$INPUT" "$INPUT/scene.json"
node "$SKILL/scripts/build.mjs" "$INPUT" "$OUTPUT"
```

Composition creates district plots, roads, footpaths, pocket gardens, people, lighting, connection corridors and story-marker placements. It writes a normal, editable `scene.json`, validated before replacing the requested file. The number of districts and objects determines the city footprint. Connections derive from the actual relationships; the composer adds no semantic entities or IT systems.

The CLI selects a random seed when `layout.seed` is omitted and saves it as `scene.seed`. The seed controls plot spacing, setbacks, district offsets and people. To reproduce the composition and cast, put that seed into `layout.json`. For a new authored scene, choose a fresh nonnegative integer seed once, then keep it with the scene.

Districts pack by their actual area rather than a fixed number of columns. Shorter streets sit inset within each neighbourhood; buildings have varied setbacks and garden space while keeping their authored dimensions. Roads end at useful access bays instead of filling a rectangular grid. Street segments remain orthogonal; use activity groups and an explicit network for diagonal paths or site-specific geography. Previously saved scenes retain their geometry until recomposed; recomposition replaces manual scene refinements.

Review the generated scene and refine it: adjust streets and walking routes, place markers near their activities, add meaningful connection notes, and develop important interiors. Keep path points on the depicted surfaces. Composition is a starting layout, so domain-specific entrances and furniture placement belong in the authored scene.

## Shared movement routes

A walking relationship stores its complete route in `scene.routes[].points`, including its actual starting and ending positions. A person step references it with `state.via`; omit the separate layout `path`. The same points draw the line and move the person.

For an access-dependent endpoint, a layout step may set `routeEnd` to the index of the last reachable point. In the heat example, `reach-room` includes the doorway and interior, while the closed-door step ends at exterior point 6. A stationary step uses a one-point `path`. Keep the preceding endpoint equal to the next route's start.

Walking routes are painted above walkable floors and below furniture and people. The active route is truncated to the selected endpoint. Route labels use the active path's segment indices. Check the actor's footpoint against the line at intermediate frames, including turns and changes of elevation.

## People

People have stable seeded profiles with gender, skin tone, hair color/style, clothing and build. Street people use their optional `id` (otherwise their starting coordinates); interior people use the building ID and local slot; story actors use `layout.actor.identity` (otherwise the scenario ID). Give alternate stories about the same person the same identity.

Optional `appearance` on scenery people and `layout.actor` can override `gender` (`woman`, `man`, `nonbinary`), `skin`, `hair`, `coat`, `trousers` (hex colors), `hairstyle` (`short`, `long`, `bun`, `curly`, `bald`) and `build` (0.85–1.2). An instance's optional `people` array supplies the same overrides in interior-person order. User-specified traits take precedence over random choices. Traits are chosen independently of job roles.

The main actor's existing `material` remains the default coat color for narrative recognition; an explicit appearance coat overrides it. Keep descriptions such as “reader in the ochre coat” consistent. The component study preserves the same person profiles as the main map.

## Review small and large cases

`examples/reading-day/` has five places and no IT. `examples/library-network/` has thirty workplaces in six neighbourhoods plus a shared-services district with eight system/infrastructure objects. Their editable input includes the briefs, issue, district layout and scene. Rebuild both from the authored example definitions with:

```sh
node "$SKILL/scripts/build-city-examples.mjs"
```

This regenerates the two bundled example inputs and writes their previews beneath the calling directory's `preview/`. Use it when updating the bundled examples themselves, not when starting a user's independent map.

Framing includes ground, scenery, labels and routes. Maximum zoom adapts to projection scale and viewport size, so large cities retain readable close-ups. Check whole-city framing and close-up detail, crowded route corridors, a cross-district journey, and phone navigation. Measure loading, SVG size and frame timing with the actual map rather than assuming a fixed building count predicts performance.
