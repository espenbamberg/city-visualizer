# CityVisualizer

Create detailed, interactive isometric maps that explain issues, services and systems through places, people and connected stories.

The toolkit supports cities, campuses, buildings, workspaces and technical systems, with animated journeys and nested views. Generated HTML pages are self-contained and work offline.

[![The repair district: an isometric service map showing the booking journey through people, places and supporting systems.](docs/images/research-booking-step-2.webp)](https://espenbamberg.github.io/city-visualizer/)

## What can you use it for?

CityVisualizer helps explain processes that cross several people, places or systems. Readers can follow a journey, inspect a location and explore the work inside it. It makes handoffs, dependencies and exceptions visible alongside the main story.

- **Service and customer journeys.** Follow a repair from booking to collection, a patient through care, or an application through a public service. Show who acts next and where a delay changes the outcome.
- **Technical systems.** Connect the user-facing service to its applications, data stores and infrastructure. Use a workspace or technical-system view to explain what happens behind a request.
- **Public issues and infrastructure.** Explain how heat, transport, water or electricity affect a neighborhood. Follow residents and response teams to show how one disruption affects other services.
- **Training and onboarding.** Turn a procedure into a guided story with concrete locations and steps. Examples include a driving-licence journey, a laboratory workflow or a new employee learning how work moves between teams.
- **Operations and logistics.** Trace parts, deliveries and information through shops, workshops and warehouses. Compare the normal route with a missing part, closed entrance or missed collection.
- **Fictional worlds and interactive stories.** Build an explorable setting whose places have a purpose: a cantina receiving supplies, a workshop repairing equipment, or a city responding to a storm.

Use the result in documentation, workshops, lessons, presentations or public-facing explainers. Each map comes with editable input data and a standalone HTML page, so you can revise the explanation and share it without running a server.

### Example prompts

> Use city-visualizer to explain a laptop repair, from drop-off to collection. Include a missing-part scenario and let readers explore the workshop.

> Turn this service description into an interactive map for new employees. Show which team owns each step and how information passes between them.

> Explain how a power outage affects water supply and healthcare in a small city. Follow a resident and a repair crew through the response.

## Screenshot gallery

**[Explore the visual archive](https://espenbamberg.github.io/city-visualizer/)** — saved screenshots from development reviews and project studies, including desktop, mobile, close-ups and component studies.

The static website lives in `docs/`. Its screenshot catalog is `docs/screenshots.json`; full-resolution WebP images and smaller thumbnails live in `docs/images/`. After editing the catalog, regenerate the page with `node scripts/build-gallery.mjs`. GitHub Pages serves `docs/` from `main`.

## Build an example

With a current Node.js installation, run:

```sh
node scripts/build.mjs examples/repair-service preview
```

Open `preview/index.html` for the interactive map and `preview/assets.html` for its component study. No package installation is needed.

For a building with nested views:

```sh
node scripts/build-v2.mjs examples/landscapes/building preview/building
```

## Use as an AI skill

The skill entry point is [SKILL.md](SKILL.md). Keep this entire directory together when installing it in your assistant's skills directory, including the kit, examples, references and attribution files.

Ask: **“Use city-visualizer to explain [issue] as an interactive map.”**

## Author your own map

- Start with [the brief template](templates/brief.md).
- Read [issue mapping](references/issue-mapping.md), [landscape selection](references/landscapes.md) and [the data contract](references/scene-data.md).
- Keep editable inputs separate from generated output. Build with explicit input and output paths.
- See [verification](references/verification.md) for model and browser checks.

Run the model/CLI checks:

```sh
node scripts/check.mjs
```

## Credits

Includes the MIT-licensed Anatomy geometry core by Ryan. See [THIRD-PARTY.md](THIRD-PARTY.md) and [its license](kit/anatomy/LICENSE).
