---
name: CityVisualizer
description: Create detailed, interactive isometric landscape maps that explain complex issues, services, processes and systems through places, people, infrastructure and connected stories. Use when the user asks for CityVisualizer, an explorable issue map, a city-style system explanation, or a connected landscape showing how an issue works.
compatibility: Node.js 20 or newer. No npm dependencies. Browser tools for visual review.
---

# CityVisualizer

Turn an issue into a connected landscape the reader can explore, with clear stories explaining who acts, what changes and why. Deliver a standalone offline HTML page and editable input data.

All paths below are relative to this skill's directory. Resolve its actual location before running commands; it may be installed locally or globally. Work in the user's project, outside the installed skill directory.

## Workflow

1. **Discover the focus.** Read `references/issue-mapping.md` and reuse the request, supplied material and existing brief. Ask up to three unanswered initial questions about audience/purpose, primary perspective and emphasis; use only follow-ups that change the explanation. Offer relevant choices and a recommendation in the user's language. Respect “choose for me” and requests to proceed. Once the journey boundaries and focus are clear, present a compact map outline and continue without a mandatory approval step. Record the direction in a short `brief.md`, using `templates/brief.md`; distinguish supplied operating rules from assumptions.
2. **Choose the scope and environment.** Read `references/landscapes.md`. For each view, choose the smallest spatial frame that explains the actual handoffs: city, campus, building, workspace or technical system. Record the content-based reason and whether placement is physical or schematic. Respect supplied locations; ask when uncertainty about shared premises versus separate places changes the explanation. Choose independently for useful drilldowns. For outdoor places also read `references/city-composition.md`. Use as many objects as the explanation needs, with technical infrastructure only when relevant. `examples/landscapes/` demonstrates all five environments; `examples/reading-day/` and `examples/library-network/` show different outdoor scales. Read the closest example's brief and data, then create independent project inputs.
3. **Model meaning first.** Read `references/scene-data.md`. Write `issue.json`: entities, typed relationships, source metadata and step-by-step stories. Make the selected priority journey the first story; include an exception when useful and supported. Use the user's language for authored copy. Keep source/status IDs internal and the source list readable. Every step must explain a handoff or change in the modeled issue.
4. **Compose the landscape.** Read `references/visual-direction.md`, `references/variable-sizing.md` and `references/networks-and-detail.md`. Choose a visual hierarchy in every view: important objects get more area and useful detail, supporting objects stay compact. Organize activities around the selected environment's streets, common grounds, rooms, workstations or components. Author `layout.json` with `environment` and one of `districts`, `groups`, `rooms` or `rows`; use `scripts/compose.mjs` to generate an editable scene, or author `scene.json` directly. Give shared networks explicit junctions, named ports, transport modes and widths. Indoor journeys must pass through actual openings and corridors; the same room data draws walls and checks clearance. Compile journeys through that network; each relationship does not need its own road. Reserve clearance before adding scenery. Refine terrain, objects, nameplates and story annotations. Preserve detailed cutaways and meaningful interiors. Set a fresh scene seed for each new map; give recurring people stable identities and random appearance/gender unless the user supplied those traits. Inspect existing asset recipes before drawing new ones.
5. **Add meaningful motion.** Reuse the supplied entrance, camera, full-workspace fullscreen and sliding panel. Selecting any story starts it from the beginning, with time for movement and reading, and Pause/Play/manual stepping controls. A person follows the actual visible movement route in `scene.routes[].points`, referenced by `state.via`. Keep complete end states and access-dependent endpoints for direct navigation. Use the living-scenarios contract in `references/scene-data.md`.
   **Choose what travels.** Use a person, car/van, bicycle, plane, data or electricity according to what the process follows. Hosting and dependencies do not create a traveling actor. Explicit handoffs can change the representation between steps.
   **Plan useful insides.** When opening a building, park, vehicle or system adds explanation, follow `references/nested-views.md`. Write a local brief, design its workstations/components, and author 1–5 local processes. Show concrete apparatus, information and connections; use process parts and explicit per-step highlights where they clarify the work. Add deeper views only when the material supports them. Objects without a useful internal process keep their ordinary explanation or remain scenery. Use a V2 manifest and `build-v2.mjs` for nested maps. Enable adaptive detail for screen-size-aware names and fine geometry; inspect overview, area and close-up on desktop and phone.
6. **Build.** Run the builder with explicit input/output paths, then open the generated page and component study. Resolve validation errors in the input instead of weakening the validator.
7. **Review and refine.** Follow `references/verification.md`. Inspect the overview, zoomed detail, every story and a narrow viewport; check that stories and visual emphasis serve the brief's perspective and intended takeaway. Fix occlusion, misplaced labels, routes and actor paths. Return the preview location, editable inputs and a brief check result, then ask one tailored focus question: “Does this emphasize the right part of the process? What should become more prominent?” Apply feedback to the brief and affected map choices following `references/issue-mapping.md`.

## Build commands

Set `SKILL` to the directory containing this file, and `INPUT` / `OUTPUT` to folders in the user's project:

```sh
node "$SKILL/scripts/build.mjs" "$INPUT" "$OUTPUT"
```

The input contains `issue.json` and `scene.json`. The output contains `index.html` and `assets.html`, each self-contained and usable offline. Building replaces those two generated HTML files, so keep authored inputs separately.

For nested V2 maps, the input contains `map-v2.json` and the referenced issue/scene pairs. Build with `node "$SKILL/scripts/build-v2.mjs" "$INPUT" "$OUTPUT"`. Its output is one offline `index.html` containing all levels and their text explanations. See `examples/v2/` for a complete eight-view example.

To serve the output for browser review:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory "$OUTPUT"
```

Use an available port if 8765 is already occupied. No package installation or framework is needed.

## Writing

Write short, direct explanations of actions, connections and outcomes. Include operating conditions that drive the story, such as a missing part or closed entrance. Avoid generic disclaimers, repeated fiction/evidence labels, defensive prose and descriptions of everything the map does not measure. Follow `references/issue-mapping.md` throughout the page, including the full text explanation.

## Reuse and changes

- For rotated outdoor objects, named entrances, relative/repeated scenery, fences or new recipes, read `references/spatial-objects.md` and inspect `examples/mobility-hub/`.
- Start with data changes. Use the existing renderer, viewer, geometry and recipes rather than generating a replacement interface for each issue.
- If an issue needs a new object, extend a project-local copy of the kit with a detailed recipe in the established style. Register spatial recipes in `kit/outdoor-assets.mjs`; legacy recipes follow `kit/assets.mjs` and `kit/model.mjs`. Review the component study and scene placement. Preserve bundled examples as regression fixtures.
- For deliberate updates to CityVisualizer itself, edit this skill's source and rebuild the affected outputs. Packaging does not freeze the design; previously generated HTML changes only when rebuilt.
- Keep `THIRD-PARTY.md` and `kit/anatomy/LICENSE` with the distributed kit. Preserve the vendored Anatomy core and its attribution. Keep the requested creator/inspiration credits in generated pages.

## Resources

- `templates/brief.md` — intake and narrative outline.
- `references/issue-mapping.md` — adaptive discovery, map focus, meaning, sources and direct writing.
- `references/landscapes.md` — content-driven environment selection, five composition profiles, rooms/passages and mixed-environment views.
- `references/scene-data.md` — complete data contract, asset dimensions and story motion.
- `references/city-composition.md` — need-driven city size, district composition, shared walking routes and person profiles.
- `references/variable-sizing.md` — V3 priority, supported recipe sizes, varied plots, local working areas and logical transport/path networks.
- `references/networks-and-detail.md` — V4 activity groups, explicit transport graph and ports, route validation, process parts and zoom-adaptive detail.
- `references/spatial-objects.md` — rotated recipes, named/four-sided access, visual/obstacle/access bounds, relative/repeated placement, fences and extending the library.
- `references/nested-views.md` — V2 local content planning, 1–5 processes, optional depth, vehicle/data/energy actors and navigation.
- `references/visual-direction.md` — landscape, details, page layout and interactions.
- `references/verification.md` — new-map review and kit regression commands.
- `examples/` — small and large editable input templates, including business/technical and environmental stories.
- `kit/` — shared renderer, detailed assets, viewer and styles.
- `scripts/` — builder, model checks and browser regression suites.
