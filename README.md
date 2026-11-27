# Has Tope Been There?

Real-time birthday party game for Tope's 40th. Guests join on their phones, a TV shows the spinning globe, and the host runs the night from a private control page.

| Who | URL |
|---|---|
| Welcome page | `https://party.kylodo.com/` |
| Host (password protected) | `https://party.kylodo.com/host` |
| TV / projector | `https://party.kylodo.com/screen/TOPE40` |
| Guests (the QR code points here) | `https://party.kylodo.com/j/TOPE40` |

## How it's built

- **Server:** Node 22, Express, Socket.IO. All game logic runs on the server (`server/game.js`); clients send commands and receive full snapshots with a rising `version`.
- **Storage:** SQLite through Node's built-in `node:sqlite` (no native build step). Every change is written straight away. On boot the rooms are reloaded and any interrupted spin or reveal finishes on its own.
- **Front end:** Vite + React. The prototype's inline styles are kept almost verbatim, so the screens stay pixel-close. The TV is a 16:9 container sized in `cqw`.
- **Self-hosted assets:** fonts (`@fontsource`), world map (`world-atlas`), flags (`flag-icons`) and the QR code are all bundled, so nothing loads from a CDN on the night.

### Privacy
`visited` answers and the country order never leave the server, except to the logged-in host. The public snapshot only reveals the destination from the questioning stage onwards, and the truth only once the round is revealed.

## Environment

| Variable | Example | Notes |
|---|---|---|
| `PUBLIC_BASE_URL` | `https://party.kylodo.com` | Used for the QR code and join link. |
| `HOST_PASSWORD` | a long passphrase | Needed to open `/host`. |
| `DATABASE_URL` | `file:/data/htbt.sqlite` | Keep `/data` on a persistent volume. |
| `PORT` | `3000` | |
| `TRUST_PROXY` | `true` | Behind Traefik, Caddy or Nginx. |

## Deploying on Dokploy

1. Create an **Application**. Source: this Git repo, branch `main`. Build type: **Dockerfile**.
2. **Environment:** set `PUBLIC_BASE_URL`, `HOST_PASSWORD`.
3. **Advanced → Volumes:** add a volume mount. Name it `htbt-data` and set the mount path to `/data`.
4. **Domains:** host `party.kylodo.com`, container port `3000`, HTTPS on, certificate provider Let's Encrypt. Point an `A` record for `party` at the server first.
5. Deploy. Traefik handles WebSocket upgrades on its own.

## Other ways to run it

```bash
# Docker Compose
HOST_PASSWORD=... docker compose up -d --build

# Plain Node (22.13+)
npm ci && npm run build
PUBLIC_BASE_URL=https://party.kylodo.com HOST_PASSWORD=... npm start
```
`deploy/` has a systemd unit, a Caddyfile and an Nginx config with the WebSocket headers.

## Backup

Everything lives in one SQLite file, `/data/htbt.sqlite`. Copy it while the app is stopped, or use `sqlite3 htbt.sqlite ".backup backup.sqlite"` while it runs. Finished games are kept in the `games` table.

## On the night

1. Open `/host`, sign in, check the countries, then press **Ready to launch**. This opens the lobby.
2. Open `/screen/TOPE40` on the TV. Click **Go full screen + sound** once so the browser allows audio.
3. Guests scan the QR code. If a phone dies, use **Enter their guess** on the host page, or add people without phones to the queue.
4. A phone that reloads keeps its place, because the session token is stored on the device.

## Local development

```bash
npm install
npm run assets
HOST_PASSWORD=dev npm run dev:server   # :3000
npm run dev                            # Vite on :5173, proxies /api and /socket.io
```
