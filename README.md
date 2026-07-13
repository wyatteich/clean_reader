# Clean Reader

Clean Reader is a local-first browser extension that turns the current article into a quiet, same-tab reader overlay with better typography controls.

It is designed for Chromium-based browsers such as Chrome and Brave.

## Features

- Opens the article in a same-tab overlay
- Keeps the original page available with a `Close` button
- Font picker with built-in, page-default, and custom local font options
- Editable controls for text size, line spacing, and column width
- White, light, sepia, dark, and night themes
- Auto-hiding toolbar while reading
- Reset button when preferences differ from defaults
- Local-only preferences stored with `chrome.storage.local`

## Install Locally

1. Clone or download this repository.
2. Open `chrome://extensions` or `brave://extensions`.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select this repository folder.
6. Open an article page and click the Clean Reader toolbar button.

For custom local fonts, use the installed font family name. You can enter multiple candidates separated by commas, such as `Literata TT Text, Literata, Georgia`.

The `Page default` font option uses the article text font detected from the original page.

## Privacy

Clean Reader does not use a server, analytics, tracking, ads, or remote code. It reads a page only after you click the extension button, extracts article-like content in the browser, and stores only reader preferences locally.

See [PRIVACY.md](PRIVACY.md) for the full privacy note.

## Permissions

- `activeTab`: lets Clean Reader read the current page only after you click the toolbar button.
- `scripting`: injects the article extractor and reader overlay into the active tab.
- `storage`: saves typography and theme preferences locally.

## Project Status

This is an early, practical prototype. It works best on conventional article pages. Some pages, PDFs, browser-internal pages, the Chrome Web Store, and heavily protected sites may block extension injection or article extraction.

## Development

This extension has no build step. The repository root is the unpacked extension folder.

Useful checks:

```powershell
node --check .\background.js
node --check .\extractor.js
node --check .\overlay.js
node --check .\reader.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

After changing files, reload the extension from the browser extensions page.
