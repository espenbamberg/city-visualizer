# V2: plan the work inside the object

Use a V2 bundle when an issue benefits from opening an object into its own local process. Each view uses the existing issue/scene contract. The build produces one offline `index.html` containing the landscape, all detail data, geometry and the complete text explanation.

Choose a content-based environment independently for each view (`landscapes.md`). A building can open a workspace; a campus can open a building. Any profile can also be the root. The environment stays fixed during zoom/playback, while detail density changes. The home control is **Hele kartet**, and the manifest, ownership, boundaries and paused return-state contract remain the same.

## Decide which objects open

Choose separately for each object:

- **Scenery:** contextual decoration, no interaction.
- **Entity:** a named role with relationships and the existing object explanation.
- **Entity with `detailView`:** a local visualization that explains its internal work. Activation zooms toward it and opens that view.

Any asset can represent an entity with detail: building, park, vehicle, machine, application or technical component. An important scenery object must first become a semantic entity with an instance. Never imply that every object needs detail.

For each detail view write a short content brief before laying it out:

1. What question does the inside answer?
2. What enters, what happens, and what leaves?
3. Who or what acts, and at which stations or components?
4. Which **1–5 processes** explain distinct journeys, conditions or outcomes?
5. Which concrete source details support these processes?
6. Does a component deserve another level, and what new explanation would that add?
7. Which work needs the most room here, and how do aisles, paths or component connections reach it?

One strong process is enough. There is no fixed step count. Add another depth only when the supplied detail supports it. Interiors should be recognizably different from the city: workbenches and instruments, garden paths and benches, vehicle subsystems or digital processing stages. Preserve physical parts, four-tone materials, integrated labels and useful local detail.

## Input structure

```json
{
  "version": 2,
  "language": "nb",
  "root": "city",
  "views": {
    "city": {"issue":"views/city/issue.json","scene":"views/city/scene.json"},
    "workshop": {
      "issue":"views/workshop/issue.json",
      "scene":"views/workshop/scene.json",
      "boundaries":[
        {"relation":"deliver-appliance","direction":"in","entity":"intake"},
        {"relation":"load-van","direction":"out","entity":"quality"}
      ]
    }
  }
}
```

Save as `map-v2.json`. IDs use lowercase letters, digits and hyphens, beginning with a letter. `language` is optional (default `en`). Each parent issue entity may include `"detailView":"workshop"`. The child has its own issue entities, relationships, scenarios and scene. Add another child the same way.

Every non-root view has exactly one owning entity and 1–5 scenarios. Every declared view must be reachable from the root; cycles and shared child ownership are rejected. A view's `boundaries` connect local entities to parent relationships involving its owner. `in` means the parent relationship ends at the owner; `out` means it starts there. Boundaries appear in the local panel and text explanation.

File references must stay within the input directory, including after resolving symlinks. The build validates all views before replacing output. Author source material and outputs in separate directories.

```sh
node "$SKILL/scripts/build-v2.mjs" "$INPUT" "$OUTPUT"
```

With no arguments, this builds the bundled V2 example into the caller's `preview/v2/index.html`. `build-v2-example.mjs` regenerates the bundled JSON fixtures from `examples/v2-example.mjs`; use it only when updating that example. One-level inputs still use `build.mjs`.

## Actor choice and handoffs

`scenario.actor.kind` supports `person`, `document`, `car`, `van`, `bicycle`, `plane`, `data`, `electricity`.

- People and vehicles require `movement` relationships.
- `data` requires `information`; `electricity` requires `electricity`.
- Documents retain existing symbolic movement/information behavior for compatibility.
- A pure dependency or hosting step highlights the components without adding travel.

New moving actors share the complete route in `scene.routes[].points`. A person or vehicle has a real physical route, data an information route, electricity a cable/energy connection. Use world-space `z` for flight height. Ground and furniture must match the depicted travel. Stationary actor steps keep a single-point `path`. `routeEnd` can truncate a shared route to a reachable endpoint.

To change representation at an explicit handoff, a step supplies:

```json
{
  "actor":{"kind":"data","label":"Måledata"},
  "handoff":"Fra teknikerens handling til instrumentets måledata."
}
```

The new actor applies from that step until the next explicit change. The normal step relationships/state still define where it goes. Keep consecutive route endpoints continuous across the handoff.

An actor may have `entity`, identifying the named vehicle or other entity it represents. That makes the moving representation keyboard/pointer-accessible and suppresses its parked instance during the story. If the entity has `detailView`, the moving object opens the same detail as its object-list entry. A step-level actor change supplies its own optional entity reference.

Transport is built in world coordinates, projected and depth-sorted in sixteen precomputed headings. Heading changes follow route direction; vertical parts remain vertical. Fine curved vehicle choreography would need continuous geometry rather than additional flat screen rotation.

## Interaction and state

- Entry pauses the parent and zooms toward the selected object, taking the panel's occupied area into account. Back can cancel an unfinished entry.
- A new detail opens in overview. Selecting any local process starts playback from its beginning.
- Navigation breadcrumbs, Back and “Hele byen” return to ancestors. Return restores exact actor position, step, camera, layers, selected tab and panel scroll. Playback stays paused until resumed.
- Fullscreen and the shared panel's open/hidden state remain in effect through navigation. Fit frames the active scene.
- Reduced motion skips zoom and view fades. Escape exits fullscreen first, then goes up a level; explicit Back remains available in fullscreen.
- Only one scene's SVG is mounted. Parent state is saved as strings and values, with no hidden running players. Local SVG IDs can therefore be reused without collisions. All scene geometry is embedded once in bundle data and instantiated on entry.
- Offscreen/background suspension pauses the active V2 actor in place. It never restarts playback on return.

## New local assets

The registry includes `desk`, `workbench`, `tester`, `shelf`, `battery`, `motor`, `terminal`, `queue`, `garden`, `seating`, plus entity recipes for `car`, `van`, `bicycle`, `plane`. Their dimensions are exported by `detail-assets.mjs` through `assetDimensions`. Entity kinds also include `station` and `vehicle`.

Compose interiors deliberately using these parts and suitable floor/room/vehicle context. Avoid simply running the city district composer for every local scene. The bundled V2 example has eight views: city, workshop, diagnosis, park, van, booking, validation and cargo aircraft. Workshop and booking each demonstrate a third level. Its brief explains every inside before geometry.

V3 adds supported size variants and `composeLocal` for authored workflow rows. Read `variable-sizing.md` and `examples/v3/brief.md`. Each level chooses its own priorities; a compact owner can open an extensive local process. V3 uses this same manifest and navigation contract.

V4 adds concrete process recipes and validated per-step part states. Each step describes its complete visual state so direct jumps and Back restore it exactly. Adaptive detail follows the projected object size; geometry and navigation bounds stay stable. Read `networks-and-detail.md` and `examples/v4/brief.md`.

## Checks

`check-v2.mjs` runs with the model suite. It covers ownership/reachability, boundaries, process counts, route type, handoff data, vehicle geometry, text/JSON escaping, input path confinement and failed-build preservation.

`browser-check-v2.js` expects `/v2/` on the preview server. It checks every view/process, real intermediate actor movement, rendered route alignment, interruption, exact return state, focus, native/fallback fullscreen, phone layout and moving-object selection. Review screenshots of every local view, including a close-up, and open the final HTML offline.
