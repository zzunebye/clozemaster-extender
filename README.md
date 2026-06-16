# Clozemaster Multilingual Helper

A Manifest V3 Chrome extension that translates Clozemaster meanings and explanation text into a selected target language.

This is an unofficial helper and is not affiliated with, endorsed by, or produced by Clozemaster.

## Features

- Translates Clozemaster meaning text on supported pages.
- Translates explanation dialogs in replace or separate-display mode.
- Supports Google Cloud Translation and DeepL.
- Stores API keys, language settings, provider choice, and translation cache locally in Chrome.

## Development

```bash
npm install
npm test
npm run build
```

The production extension is emitted to `dist/`.

## Local Installation

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist/` directory.
6. Open the extension popup and enter either a Google Cloud Translation API key or a DeepL API key.

## Release Package

```bash
npm run release
```

This rebuilds the extension and writes a Chrome Web Store upload ZIP to `release/`. The ZIP contains `manifest.json` at its root.

## Privacy

See [PRIVACY.md](./PRIVACY.md).
