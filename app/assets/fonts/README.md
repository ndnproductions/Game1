# Bundled fonts

| File | Family | Source | Licence |
|---|---|---|---|
| `Baloo2-700.ttf`, `Baloo2-800.ttf` | Baloo 2 | Google Fonts | SIL Open Font License 1.1 |
| `Nunito-700.ttf`, `Nunito-800.ttf` | Nunito | Google Fonts | SIL Open Font License 1.1 |

Both are OFL, which permits bundling in a commercial app with no attribution
inside the UI. Keep this file next to them so the provenance travels with the
binaries.

They are **bundled, not fetched**. A game that waits on a font CDN renders its
first frame with no text at all, and offline it never renders it — which is
exactly what happened the first time this app was built.
