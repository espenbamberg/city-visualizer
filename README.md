# CityVisualizer

Create detailed, interactive isometric maps that explain issues, services and systems through places, people and connected stories.

The toolkit supports cities, campuses, buildings, workspaces and technical systems, with animated journeys and nested views. Generated HTML pages are self-contained and work offline.

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
