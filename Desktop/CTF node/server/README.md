# Capture the Flag (Seattle) — server

A backend for a location-based, real-world Capture the Flag game. Players GPS-track
their position, pick up and capture the enemy team's physical flags, complete
scavenger-hunt style challenges for coins, buy items (tickets, invisibility potions,
double-reward powerups), and tag opposing players caught in their territory.

## Architecture

- **Multi-match**: any number of matches can run concurrently, each in its own
  `CTFMatchRoom` instance. There's no global game state — a match's players, teams,
  flags, and score all live on that match's room object, keyed by a short room code.
- **Real-time, not polled**: clients connect over a single WebSocket per match and
  receive push updates (a full game-state broadcast every ~2s while a match is live,
  plus an immediate reply to every action) instead of polling REST endpoints.
- **Own wire protocol**: plain JSON messages over `ws`, no external multiplayer
  framework or binary framing — see [`docs/PROTOCOL.md`](docs/PROTOCOL.md) for the full
  connection flow and message contract. That doc (and its source of truth,
  [`src/ctf/protocol.ts`](src/ctf/protocol.ts)) is what a mobile client
  (iOS, Android, or otherwise) is built against.
- **Generic room layer**: `src/rooms/GameRoom.ts` is a game-agnostic base class (WebSocket
  connection handling, send/broadcast, dispose lifecycle); everything CTF-specific lives
  under `src/ctf/`. A future second game mode would extend `GameRoom` without
  touching the transport or room registry.
- **No user accounts**: players join a match by name. Internally, every player still
  gets a stable UUID (separate from their display name) that all game logic keys off,
  so accounts could be added later without restructuring anything.
- **Match history**: each match's event log (location updates, flag pickups/captures,
  challenge activity, item purchases, tags) is written to SQLite when the match ends,
  for replay/debugging. Not currently exposed over the API.

## Project structure

```
src/
  index.ts              Express (REST matchmaking) + ws (game WebSocket) on one server
  common/                Shared types, the geo-distance helper, validation utils
  config/                Game tuning constants, flag locations, challenge definitions
  modules/               Core game logic: PlayerManager, TeamManager, FlagManager,
                          ScoreManager, ChallengeManager, EventManager
  rooms/
    GameRoom.ts           Generic per-match room base class
    roomRegistry.ts        Game-agnostic room lookup/creation by room code
    ctf/                   Everything CTF-specific: CTFMatchRoom, the message protocol,
                            and one handler file per group of actions (team, location,
                            flags, challenges, items, tagging)
  persistence/            SQLite match/event log storage
  test/                   Mocha test suite (one file per handler group)
docs/PROTOCOL.md         Full WebSocket API reference for client implementers
```

## Getting started

```bash
npm install
npm test              # run the test suite
npm run start          # dev server: rebuilds and restarts on file changes
```

For a one-off run without the watcher: `npm run build && npm run server`.

### Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8088` | HTTP/WebSocket listen port |
| `HOST` | `0.0.0.0` | Listen address |
| `CTF_DB_PATH` | `./data/ctf.db` | SQLite file location for match history (`:memory:` for an ephemeral DB, used automatically by the test suite) |

## API

- `POST /api/createMatch` → `{ roomCode }`
- `POST /api/joinMatch` `{ roomCode, playerName }` → `{ playerId, roomCode, isHost }`
- Then connect to `wss://<host>/ws?roomCode=<roomCode>&playerId=<playerId>` for everything
  else (joining a team, starting the game, sending location, flags, challenges, items,
  tagging). Full details in [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

## Running on your local network

For testing with a real phone (GPS doesn't work in a simulator), run the server on your
dev machine and point the phone at your machine's LAN IP instead of `localhost`.

1. **Find your machine's LAN IP.** On macOS: `ipconfig getifaddr en0` for Wi-Fi (try `en1`
   if that's empty), or System Settings → Wi-Fi → Details → TCP/IP. It'll look like
   `192.168.x.x` or `10.x.x.x`.
2. **Start the server.** `HOST` already defaults to `0.0.0.0`, which binds to every
   network interface (not just `localhost`) — so no extra config is needed on the server
   side:
   ```bash
   npm run start
   ```
3. **Allow the connection through the firewall.** macOS will likely prompt "Do you want
   the application 'node' to accept incoming network connections?" the first time —
   click Allow. If you don't see the prompt, check System Settings → Network → Firewall.
4. **Make sure both devices are on the same network.** Phone and dev machine need to be
   on the same Wi-Fi. Some networks (guest Wi-Fi, some public/campus/corporate networks)
   enable client isolation, which blocks device-to-device traffic even on the "same"
   network — if connections mysteriously fail, this is the first thing to suspect. A
   phone hotspot with your laptop connected to it is a reliable fallback.
5. **Point the client at that IP.** e.g. `http://192.168.1.23:8088/api/createMatch` and
   `ws://192.168.1.23:8088/ws?...` instead of `localhost`. See the client integration
   notes below for the platform-specific gotcha this triggers (plain HTTP/WS is blocked
   by default on both iOS and Android).

## Running across different networks (tunnel)

The LAN setup above only works if the client is on the *same* Wi-Fi as the dev machine —
`192.168.x.x` addresses aren't reachable from a different network or from cellular data at
all. For that, tunnel the server through [ngrok](https://ngrok.com) instead: it opens an
outbound connection from your machine to ngrok's relay, and gives you back a public
`https://...ngrok-free.app` hostname that forwards to your local port - no router
config, no port forwarding, and it terminates real TLS for you (which also means no more
ATS/cleartext exceptions needed on the client, see below).

1. **One-time setup**: install the ngrok CLI (`brew install ngrok` on macOS, or download
   from ngrok.com), sign up for a free account, then run
   `ngrok config add-authtoken <your-authtoken>` (from your ngrok dashboard). This writes
   to `~/.ngrok2/ngrok.yml` / `~/Library/Application Support/ngrok/ngrok.yml` - not part of
   this repo, so it's a per-machine step, not something to commit.
2. **Run it**: `npm run start:tunnel` - starts the dev server and an ngrok tunnel to it
   side by side in one terminal.
3. **Grab the forwarding URL** from the ngrok output (`Forwarding  https://abcd1234.ngrok-free.app -> http://localhost:8088`)
   and point the client at it instead of a LAN IP: `https://abcd1234.ngrok-free.app/api/joinMatch`
   for REST, `wss://abcd1234.ngrok-free.app/ws?roomCode=...&playerId=...` for the WebSocket.
   Use `wss://`, not `ws://` - ngrok terminates TLS at the tunnel.

Caveats: the free ngrok tier gives you a new random hostname every time you restart the
tunnel (a paid plan or a Cloudflare Tunnel with your own domain gets a stable one), and the
tunnel - like the server itself in this setup - only stays up as long as your machine and
that terminal do. For anything that needs to run unattended, this isn't a substitute for
an actual deployment (a VPS/PaaS with its own domain).

## Client integration guide

There's no official SDK for this protocol on any platform (it's a plain WebSocket +
JSON contract we own, not a framework) — a client is normal networking code against
[`docs/PROTOCOL.md`](docs/PROTOCOL.md). The shape is the same regardless of platform:

1. `POST /api/createMatch` or `/api/joinMatch` (plain JSON HTTP, whatever your platform's
   normal HTTP client is) to get `{ playerId, roomCode }`.
2. Persist `roomCode` and `playerId` locally (Keychain/UserDefaults on iOS, EncryptedSharedPreferences/DataStore on Android) — reconnecting after a dropped connection or app relaunch is just reopening the WebSocket with the same two values, no re-join call needed.
3. Open a WebSocket to `ws://<host>/ws?roomCode=<roomCode>&playerId=<playerId>`.
4. Send/receive JSON text frames shaped `{ "type": "...", "payload": {...} }` per the
   message tables in `docs/PROTOCOL.md`. Model each message type as a `Codable` struct
   (Swift) or `data class` (Kotlin) mirroring [`src/ctf/protocol.ts`](src/ctf/protocol.ts) — that file is the source of truth if this doc and the code ever drift.
5. Handle the very first message after connecting being *either* `preGameUpdate` or
   `gameUpdate` (depends on whether the match has started yet) — don't assume it's
   always the lobby snapshot.

### iOS (Swift)

- Use `URLSessionWebSocketTask` (built into Foundation, no third-party dependency needed)
  for the WebSocket connection, and `URLSession`/`JSONDecoder`/`JSONEncoder` for the two
  REST calls and message bodies.
- **App Transport Security will block plain `http://`/`ws://` by default.** For local-
  network testing (see above), add an ATS exception to `Info.plist` — either scope it to
  local networking only, or use `NSAllowsArbitraryLoads` for development builds:
  ```xml
  <key>NSAppTransportSecurity</key>
  <dict>
      <key>NSAllowsLocalNetworking</key>
      <true/>
  </dict>
  ```
  Don't ship this to the App Store pointed at plain `ws://` for a real deployment — use
  `wss://` (TLS) once the server has a real domain/certificate.
- iOS 14+ will also prompt the user for **local network permission** the first time the
  app tries to reach a device on the LAN (a different prompt from ATS) — this is expected
  and required for local-network testing to work at all.

### Android (Kotlin)

- Use OkHttp's `WebSocket` support (`okhttp3.WebSocket`) for the connection, and either
  OkHttp or `HttpURLConnection` for the two REST calls; `kotlinx.serialization` or Gson
  for JSON (de)serialization.
- **Cleartext (non-HTTPS/WSS) traffic is blocked by default since Android 9 (API 28).**
  For local-network testing, add a network security config allowing cleartext to your
  dev machine's IP (or broadly for development builds only):
  ```xml
  <!-- res/xml/network_security_config.xml -->
  <network-security-config>
      <domain-config cleartextTrafficPermitted="true">
          <domain includeSubdomains="true">192.168.1.23</domain>
      </domain-config>
  </network-security-config>
  ```
  referenced from `AndroidManifest.xml` via `android:networkSecurityConfig`. As with iOS,
  switch to `wss://` for anything beyond local testing.

## Status

Server-side gameplay is complete and tested. Not yet built: real user accounts, push
notifications (there's a reserved extension point, see `docs/PROTOCOL.md`), and the
mobile client apps themselves.
