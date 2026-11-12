# Atelier

A quiet wardrobe, on your own keys.

Atelier is a Native Now guest app for iOS. Photograph the pieces you own, compose
looks, see them on a model — or on yourself — and ask a stylist that only knows
what is actually on your rail.

Everything lives on the device: SQLite for the wardrobe, the iOS Keychain for API
keys, and the app's document directory for images. There is no account, no
backend, and no analytics.

## Features

- **Wardrobe** — add a piece with the camera, the photo library, a direct image
  URL, or an in-app web image search. Gemini can name the piece, colour and
  category from the photo.
- **Studio** — compose looks from real wardrobe pieces. Every look keeps a
  collage, its pieces and a lookbook of renders.
- **Try-on** — cast an editorial model with AI, or use a full-body photo of
  yourself. NVIDIA FLUX is tried first; Gemini takes over when a real photo
  needs to be preserved.
- **Stylist** — a Gemini-powered chat that proposes looks using only the item ids
  in your wardrobe, with a one-tap save into the studio.
- **Discover** — Google Programmable Search when a key is present, with a
  keyless DuckDuckGo image search fallback.

## Run it in the Native Now shell

This project ships JavaScript only. The shell (`com.genux.go`) already contains
every native module in the catalog, so there is no prebuild, pod install, or EAS
build.

```bash
npm install --legacy-peer-deps
native-now doctor          # must report no issues
native-now start           # export + serve; prints the manifest URL
native-now open <manifestUrl>
```

During development, `native-now push --reason "..."` re-exports and updates a
running shell.

## Keys

Open **Settings** in the app and paste any of:

| Key | Used for | Free tier |
| --- | --- | --- |
| NVIDIA NIM (`nvapi-…`) | FLUX.3 model casting and first-pass try-on | Free credits at [build.nvidia.com](https://build.nvidia.com) |
| Google Gemini (`AIza…`) | Stylist, cataloguing, photo try-on, backup images | Free tier at [Google AI Studio](https://aistudio.google.com/apikey) |
| Google Search + engine id | Higher-quality image search | 100 queries/day at [Programmable Search](https://programmablesearchengine.google.com/) |

Keys are stored with `expo-secure-store` in the iOS Keychain and are sent only
to the provider they belong to.

## Development

```bash
npm run typecheck          # tsc --noEmit
npx expo lint
```

- Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router 57.
- Routes live in `src/app/`; everything else is in `src/components/` and
  `src/lib/`.
- The palette and type ramp are in `src/lib/theme.ts`.
- AI providers are isolated in `src/lib/ai/`; the try-on fallback lives in
  `src/lib/image.ts`.
