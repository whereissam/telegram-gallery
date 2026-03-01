# Telegram Gallery - TODO

## Project Status

The project has a basic client (React + Vite) and server (Express + MTProto) with authentication flow partially working. The gallery display exists but image downloading from Telegram is not yet connected.

---

## High Priority

### Server - Image Download Pipeline
- [ ] Implement `upload.getFile` to actually download photo/document media from Telegram
- [ ] Add endpoint `GET /api/media/:messageId` that streams image bytes to the client
- [ ] Handle different photo sizes (thumbnail, medium, full) from `photoSize` array
- [ ] Support both `messageMediaPhoto` and `messageMediaDocument` (for GIFs, stickers, etc.)
- [ ] Cache downloaded images locally (or in memory) to avoid re-downloading

### Server - Fix Messages Endpoint
- [ ] `/api/messages` currently returns raw `msg.media` objects — transform them to include downloadable URLs (e.g., `/api/media/{msgId}`)
- [ ] Filter messages to only return those with photo/document media
- [ ] Add pagination support (`offset_id`, `limit` query params)
- [ ] Return total count for pagination UI

### Client - Connect Gallery to Real Data
- [ ] Update `PrivateTelegramGallery.tsx` — map `msg.media` to actual image URLs via `/api/media/:id`
- [ ] Add lazy loading / infinite scroll for image gallery
- [ ] Implement image lightbox/modal for full-size viewing
- [ ] Show loading skeleton while images load
- [ ] Handle messages with no media gracefully

### Fix 2FA / SRP Issues
- [ ] Server `calculateSRP()` is called with only 1 arg but expects 3 (`password`, `srpB`, `srpId`) — the extra params are fetched internally but signature is misleading
- [ ] `/api/verify-password` endpoint is incomplete (placeholder SRP) — consolidate with `/api/verify-2fa`
- [ ] Remove duplicate/dead endpoint (`verify-password` vs `verify-2fa`)

---

## Medium Priority

### Authentication Improvements
- [ ] Add session persistence — currently auth is lost on server restart
- [ ] Add `GET /api/auth/status` endpoint to check if already authenticated
- [ ] Client: auto-check auth status on page load (skip login if session exists)
- [ ] Add logout endpoint and UI button
- [ ] Move `API_URL` to env variable (`VITE_API_URL`)

### Client UI Enhancements
- [ ] Implement search functionality (currently just a placeholder input)
- [ ] Add image grid size toggle (2/3/4 columns)
- [ ] Add date-based grouping/sorting for images
- [ ] Improve responsive layout for mobile
- [ ] Add empty state when no images found
- [ ] Add error boundary component

### Server Improvements
- [ ] Add `.env.example` files for both client and server
- [ ] Add request validation with Zod
- [ ] Add rate limiting to auth endpoints
- [ ] Add proper TypeScript types for MTProto responses
- [ ] Remove unused `crypto` and `path` npm packages (built-in to Node/Bun)
- [ ] Remove unused client-side `@mtproto/core` and `telegram-mtproto` deps (MTProto runs server-side only)

---

## Low Priority

### Project Structure
- [ ] README references `packages/client` and `packages/server` but actual structure is flat (`src/` + `server/`) — update README or restructure
- [ ] Add monorepo setup (workspaces) if keeping both packages
- [ ] Add shared types between client and server
- [ ] Add `concurrently` or `turbo` script to start both dev servers with one command

### Developer Experience
- [ ] Add ESLint config for server directory
- [ ] Add Prettier configuration
- [ ] Add pre-commit hooks (husky + lint-staged)
- [ ] Add basic test setup (Vitest for client, bun test for server)

### Features (Roadmap)
- [ ] Image batch download/export
- [ ] Advanced search (by date, caption text, media type)
- [ ] Folder/tag organization
- [ ] Image editing (crop, rotate)
- [ ] Video support
- [ ] Offline mode with service worker
- [ ] Dark mode toggle

---

## Package Upgrades Needed

### Client (`package.json`)
- React 18 → React 19
- Vite 6 → latest
- TanStack Router → latest
- Tailwind CSS 3 → Tailwind CSS 4
- TypeScript 5.6 → latest
- All shadcn/ui related deps → latest

### Server (`server/package.json`)
- Express 4 → Express 5
- All deps → latest
- Remove unnecessary `crypto` and `path` packages (Node/Bun built-ins)

---

## Known Bugs
- [ ] `retryFetch` in `PrivateTelegramGallery.tsx` returns `undefined` if all retries fail (missing return type)
- [ ] `fetchWithTimeout` is defined but never used
- [ ] Client-side `src/lib/mtproto.ts` is unused (MTProto runs server-side)
- [ ] Server `__dirname` may not work in ESM mode — needs `import.meta.dirname` or `fileURLToPath`
- [ ] CORS only allows `localhost:5173` — needs to be configurable via env
