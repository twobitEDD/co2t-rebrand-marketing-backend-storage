# CO2T Backend Storage

Standalone file upload server for CO2T Marketing Command Center. Upload images via POST /upload; serve them at GET /files/:filename.

## Env

| Var | Description |
|-----|-------------|
| `PORT` | Server port (default: 3002) |
| `STORAGE_SECRET` | Must match the main backend's `STORAGE_SECRET` |
| `STORAGE_PUBLIC_URL` | Public base URL (e.g. `https://co2t-storage.railway.app`). `/files` is appended automatically. |

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

## Deploy (Railway, etc.)

- **Root**: this directory (or repo root)
- **Build**: `npm install`
- **Start**: `npm start`
- **Volume**: Mount at `./uploads` (or `/app/uploads`) so images persist across redeploys

## API

- `GET /` – Health check (returns `{ ok: true }`)
- `POST /upload` – Upload file. Requires `X-Storage-Secret` header. Form field: `file`.
- `GET /files/:filename` – Serve uploaded file.
