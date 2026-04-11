# sdlang.com

Marketing and documentation site for the Solution Design Language.

## Pages

- `/` — Home: hero, how it works, generators, stacks, CTA
- `/spec` — Full SDL v1.1 specification rendered from `spec/SDL-v1.1.md`
- `/examples` — Example gallery linking to the playground with pre-loaded YAML

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Static export — deploy the `out/` directory to any CDN, or use the Vercel config.

The playground lives at `play.sdlang.com` (separate Vite app in `packages/sdl-playground/`).
Link it there by updating `PLAYGROUND_URL` in `src/lib/constants.ts`.
