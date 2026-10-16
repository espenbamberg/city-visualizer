# Visual direction

## A connected, inhabited landscape

Build one coherent landscape with roads, footpaths, shared surfaces, buildings, trees, furniture and people. Group related activities spatially and connect their actual endpoints. Make the scene readable from the whole district down to a workstation.

Use detailed solid isometric parts, consistent material shading and depth-correct painter order. Preserve the existing muted palette and `filter:saturate(.75)` treatment. Windows, roof edges, doorways, shelves, desks, tools and people should reveal what a place does. Cutaway rooms show the activity and its participants. Use the authored asset dimensions in `scene-data.md`; changing their bounding box does not resize fixed interior details.

Keep permanent labels on real ground, roof, base or front-face planes. Choose readable line breaks, with full names also available in the entity list. Place route anchors outside nameplates. Reserve clear corridors for connections and story annotations. Review both overview and close-up framing.

Model physical places, logical services, technical infrastructure and environmental influence distinctly. Add computers only when they participate in the issue. Use explicit service-to-runtime/storage/integration links for technical architecture. A hosting dependency highlights where a service runs; it does not animate a traveling packet.

V2 insides have their own physical vocabulary: benches, instruments and shelves for workshop activity; paths and seating for parks; an unfolded technical assembly for a vehicle; terminals, queues and storage for digital processing. Each scene answers a local question. Use the ⊕ marker only on entities with authored detail. Keep the parent recognizable during entry zoom, then show the local view's navigation path and boundary handoffs. Preserve the same panel, fullscreen and controls at every level; details are described in `nested-views.md`.

## The shared page

Preserve the supplied interface when generating new issues:

- Edge-to-edge, viewport-height map canvas. The map continues behind the floating sidebar and through the exposed strip to its right.
- CityVisualizer at upper left, with only the issue title beneath it. Name-only vertical connection legend at upper right.
- Objects rise from the ground; the existing story/system panel begins arriving after two seconds. Panel arrival never shifts or shrinks the canvas. Input, reduced motion and offscreen/background changes settle the opening without replay.
- Desktop sidebar floats above the map. Mobile uses the existing collapsible bottom sheet.
- Fullscreen includes the same map and sidebar, preserving story, playback and camera state. The `>>` button at the far right of the tabs slides the panel out to the right; a `<<` island opens it again. The 450 ms movement starts slowly and accelerates in the second half, reverses without jumping, and is immediate with reduced motion. Hiding the panel leaves the canvas fixed and playback running. On mobile it hides the entire bottom sheet sideways; the sheet's compact header remains a separate collapse control.
- Ordinary scrolling reads the document. Ctrl/Command + wheel zooms; the hint reads `Ctrl/⌘ to zoom`. Pan, pinch, keyboard controls, Fit and the fullscreen/fallback behavior remain available. Fullscreen is immediately before Fit.
- Connections are visible initially. Overview colors and dash patterns identify relationship types; selected story routes, arrows and step markers match that story's numbered badge.
- Selecting a story always plays it from the beginning. Wait for travel and reading before advancing; stop at the outcome. Keep Pause/Play/Replay and manual stepping available. Background/offscreen maps stop playback without replaying on return.
- “Read the issue” and the complete accessible explanation follow below the viewport opening. Keep selection, keyboard focus, text access and reduced motion working.

## Credits

Keep the subtle in-map `Skill created by Espen Bamberg` credit at bottom right with the supplied 40% opacity and responsive positioning. The footer repeats the credit at normal contrast, with the creator's name linking to `mailto:espen.bamberg@gmail.com` and the LinkedIn icon linking to `https://www.linkedin.com/in/espen-bamberg-20b283123/`.

The footer's right side reads `Skill inspired by Bo Meyer, Anatomy and MIT.` Anatomy links to `https://skills.wheresryan.sh/anatomy`; MIT links to `https://opensource.org/license/mit`. Code provenance and the upstream license live in `THIRD-PARTY.md` and `kit/anatomy/LICENSE`.
