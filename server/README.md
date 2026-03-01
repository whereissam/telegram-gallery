# Telegram Gallery — Server

Express + MTProto backend that handles Telegram authentication and proxies media downloads from Saved Messages.

## Setup

```bash
bun install
cp .env.example .env
```

Edit `.env` with your Telegram API credentials:

```env
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Get credentials at [my.telegram.org/apps](https://my.telegram.org/apps).

## Run

```bash
bun --hot index.ts
```

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/status` | Check if session is authenticated |
| `POST` | `/api/sendCode` | Send verification code to phone |
| `POST` | `/api/signIn` | Sign in with verification code |
| `POST` | `/api/verify-2fa` | Verify 2FA password (SRP) |

### Media

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messages?offset_id=N&limit=N` | List media messages (paginated) |
| `GET` | `/api/media/:messageId?size=thumbnail\|full` | Download media file |

### Response shapes

**`GET /api/messages`**
```json
{
  "messages": [
    {
      "id": 12345,
      "date": 1709251200,
      "message": "caption text",
      "mediaType": "photo",
      "mimeType": "image/jpeg",
      "mediaUrl": "/api/media/12345",
      "thumbnailUrl": "/api/media/12345?size=thumbnail"
    }
  ],
  "count": 150,
  "hasMore": true
}
```

**`GET /api/media/:messageId`** — returns raw image bytes with appropriate `Content-Type` header.

## Architecture

- **MTProto session** persisted to `sessions/telegram.json`
- **Media cache** in-memory (max 200 entries), served with `Cache-Control: public, max-age=86400`
- **File downloads** in 256KB chunks via `upload.getFile`, handles `FILE_MIGRATE_X` DC redirects
- **Photo sizes** picked by quality: `y > x > w` for full, `m > s` for thumbnails

## Stack

- [Bun](https://bun.sh) runtime
- [Express](https://expressjs.com) 4
- [@mtproto/core](https://github.com/nicedeveloper/mtproto-core) for Telegram API
