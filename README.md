# Telegram Gallery

A personal gallery for viewing images from your Telegram Saved Messages. Authenticates via Telegram's MTProto protocol, downloads media through a local server, and displays them in a masonry grid with lightbox viewing.

## Features

- **Telegram Auth** — Phone → Code → 2FA flow with step indicator
- **Image Pipeline** — Server downloads photos/documents via MTProto, caches in memory, serves to client
- **Masonry Gallery** — Responsive CSS-column layout (1/2/3 columns), lazy-loaded thumbnails
- **Lightbox** — Full-screen viewer with keyboard navigation (arrows, Escape), download button
- **Pagination** — "Load More" for browsing large collections

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Telegram API credentials from [my.telegram.org/apps](https://my.telegram.org/apps)

### Setup

```bash
git clone https://github.com/whereissam/telegram-gallery.git
cd telegram-gallery

# Client
bun install
cp .env.example .env

# Server
cd server
bun install
cp .env.example .env
# Edit server/.env with your API_ID and API_HASH
```

### Run

```bash
# Terminal 1 — Server
cd server
bun --hot index.ts

# Terminal 2 — Client
bun dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
telegram-gallery/
├── src/                        # React client
│   ├── components/
│   │   ├── AuthForm.tsx        # Phone/Code/2FA auth flow
│   │   ├── GalleryGrid.tsx     # Masonry image grid
│   │   ├── ImageLightbox.tsx   # Full-screen image viewer
│   │   └── ui/                 # shadcn/ui components
│   ├── pages/
│   │   ├── PrivateTelegramGallery.tsx
│   │   └── Home.tsx
│   ├── index.css               # Tailwind 4 + theme
│   └── main.tsx
├── server/
│   ├── index.ts                # Express API + MTProto
│   ├── types.d.ts              # Module declarations
│   └── sessions/               # MTProto session storage
├── .env.example
└── docs/todo.md
```

## Stack

| Layer | Tech |
|-------|------|
| Client | React 19, TypeScript 5.9, Tailwind CSS 4, TanStack Router, shadcn/ui |
| Server | Bun, Express 4, @mtproto/core |
| Build | Vite 6 |

## Environment Variables

**Client** (`.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

**Server** (`server/.env`):
```env
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

## Security

- API credentials stay server-side only — never exposed to the client
- MTProto session stored locally in `server/sessions/`
- CORS restricted to configured origin
- No data leaves your machine — all media proxied through your local server

## License

MIT
