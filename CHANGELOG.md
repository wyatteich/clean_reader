# Changelog

## 0.3.4

- Rendered the same-tab overlay through the extension reader page so local fonts are resolved from the extension origin.
- Improved custom local font matching for families like `Literata TT Text` by also trying regular/full/PostScript-style names.

## 0.3.3

- Added a `Page default` font option before `Custom local font`.
- Captured the original article font from the source page during extraction.

## 0.3.2

- Improved custom local font handling without adding new font-listing permissions.
- Allowed comma-separated local font fallback names in the custom font field.
- Avoided rewriting the custom font input while the user is typing.

## 0.3.1

- Renamed public-facing project to Clean Reader.
- Added compact single-line toolbar styling.
- Added editable numeric inputs for typography sliders.
- Replaced theme buttons with a single theme picker.
- Kept custom font entry inside the font control.

## 0.3.0

- Added same-tab reader overlay.
- Added reset-to-defaults behavior.
- Added richer toolbar grouping and controls.

## 0.2.0

- Added auto-hiding toolbar.
- Added white theme.

## 0.1.0

- Initial local extension prototype.
