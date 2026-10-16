# Third-party material

`kit/anatomy/iso-kit.mjs` is an unmodified copy of Anatomy’s dependency-free core, by Ryan (2026), under the adjacent MIT `LICENSE`.

- Upstream: https://github.com/wheresryan22/anatomy
- Copied: 12 October 2026, from the locally installed Anatomy skill.
- Exact upstream commit was unavailable; the content hash pins this snapshot.
- SHA-256: `6d3ecc725d30c3b0346da309cf61dfa5a65017c23620bbd4093009d4fb104018`.
- License SHA-256: `87c078ab9d90a3044f359e6b563d4e6afea7aa060897cf4f21618687b3856796`.

CityVisualizer uses its projection and geometry with original architectural recipes, material styles, model, and browser interface. The Anatomy runtime, default page styling and specialized 3D/shader engine are not included.

The motion increment follows the time-based motion and visual-review principles in Anatomy’s `references/motion.md` and `references/verify.md`. `kit/motion.mjs` is an original implementation using the closed-form critically damped spring equation and path interpolation; no additional Anatomy modules were copied. The existing vendored core and license are unchanged.
