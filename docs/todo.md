# Telegram Gallery - TODO

## Project Status

Core E2E pipeline is working: Telegram auth flow (phone → code → 2FA), image download from Saved Messages via MTProto, and a polished gallery UI with masonry grid, lightbox, and pagination. Stack: React 19, Vite 6, Tailwind CSS 4, Express 4, `@mtproto/core`.

---

## Completed

### Package Upgrades
- [x] React 18 → React 19
- [x] Tailwind CSS 3 → Tailwind CSS 4 (deleted `tailwind.config.js`, using `@tailwindcss/vite`)
- [x] TypeScript 5.6 → 5.9
- [x] All shadcn/ui deps → latest

### Server - Image Download Pipeline
- [x] Implement `upload.getFile` to download photo/document media from Telegram (256KB chunked)
- [x] Add endpoint `GET /api/media/:messageId` with `?size=thumbnail|full`
- [x] Handle different photo sizes via `pickPhotoSize()` helper
- [x] Support both `messageMediaPhoto` and `messageMediaDocument`
- [x] In-memory cache (max 200 entries) with `Cache-Control` headers

### Server - Fix Messages Endpoint
- [x] `/api/messages` returns `{ messages, count, hasMore }` with media URLs
- [x] Filter to only photo/document messages
- [x] Pagination via `?offset_id=N&limit=N`

### Client - Gallery UI
- [x] Masonry grid with CSS columns (responsive 1/2/3 cols)
- [x] Lazy loading thumbnails with fade-in animation
- [x] Full-screen lightbox with keyboard nav, download button
- [x] Loading skeletons, empty state, error display
- [x] "Load More" pagination
- [x] Auto-check auth status on mount (skip login if session valid)
- [x] `VITE_API_URL` env var support

### Fix 2FA / SRP Issues
- [x] `calculateSRP()` signature cleaned up (removed unused params)
- [x] Deleted dead `/api/verify-password` endpoint
- [x] Return `srp_id` (not `srpId`) from SRP calculation

### Server Improvements
- [x] Added `.env.example` files for both client and server
- [x] Removed unused `crypto` and `path` npm packages from `server/package.json`
- [x] Removed unused client-side `@mtproto/core` dep
- [x] Fixed `__dirname` → `import.meta.dirname` (server + vite config)
- [x] CORS origin configurable via `CORS_ORIGIN` env var
- [x] Added `GET /api/auth/status` endpoint
- [x] Added `import 'dotenv/config'` to server

### Client Cleanup
- [x] Deleted unused `src/lib/mtproto.ts`
- [x] Deleted `src/App.css`
- [x] Fixed `retryFetch` (moved to AuthForm, proper return type)
- [x] Removed unused `fetchWithTimeout`
- [x] Removed unused `React` import in `main.tsx`
- [x] Simplified `App.tsx` (removed nav bar)
- [x] `Home.tsx` redirects to `/gallery`

### Known Bugs — Fixed
- [x] `retryFetch` return type issue
- [x] `fetchWithTimeout` unused — removed
- [x] `src/lib/mtproto.ts` unused — deleted
- [x] Server `__dirname` ESM issue — fixed
- [x] CORS hardcoded — now configurable

---

## Medium Priority — Completed

### Authentication Improvements
- [x] Add session persistence — MTProto persists to `server/sessions/telegram.json`
- [x] Add logout endpoint (`POST /api/logout`) and UI button
- [x] Handle `FILE_REFERENCE_EXPIRED` errors (re-fetch message to get fresh reference)

### Client UI Enhancements
- [x] Implement search functionality (by caption text)
- [x] Add image grid size toggle (2/3/4 columns)
- [x] Add date-based grouping/sorting for images
- [x] Add error boundary component
- [x] Infinite scroll instead of "Load More" button (IntersectionObserver)

### Server Improvements
- [x] Add request validation with Zod
- [x] Add rate limiting to auth endpoints (10 req / 15 min)
- [x] Add proper TypeScript types for MTProto responses (`server/types.d.ts`)
- [x] Persist media cache to disk (`server/cache/`, two-tier memory + disk)

---

## Low Priority

### Project Structure
- [x] README references `packages/client` and `packages/server` but actual structure is flat (`src/` + `server/`) — updated both READMEs
- [ ] Add shared types between client and server
- [ ] Add `concurrently` or `turbo` script to start both dev servers with one command

### Developer Experience
- [ ] Add ESLint config for server directory
- [ ] Add Prettier configuration
- [ ] Add pre-commit hooks (husky + lint-staged)
- [ ] Add basic test setup (Vitest for client, bun test for server)

### Features (Roadmap)
- [ ] Image batch download/export
- [ ] Advanced search (by date, media type)
- [ ] Folder/tag organization
- [ ] Image editing (crop, rotate)
- [ ] Video support (streaming)
- [ ] Mobile application (React Native or PWA)
- [ ] Offline mode with service worker
