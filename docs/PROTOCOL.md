# CTF match protocol

This is the wire contract for talking to a CTF match. It's a plain WebSocket connection
carrying JSON text frames - no custom binary framing, no MessagePack. The source of truth
is [`src/rooms/ctf/protocol.ts`](../src/rooms/ctf/protocol.ts); this document is a
human-readable rendering of it, kept in sync by hand.

## Connection flow

1. **Create a match** - `POST /api/createMatch` (empty body). Response: `{ "roomCode": "AB12" }`.
2. **Join a match** - `POST /api/joinMatch` with `{ "roomCode": string, "playerName": string }`.
   Response: `{ "playerId": string, "roomCode": string, "isHost": boolean }`.
   - `playerName` must be unique within the match (case-sensitive), or this returns an error
     status with a plain-text description (matching the old REST error convention: an HTTP
     status code plus a description string, not a JSON body).
   - The first player to join a match becomes its host (`isHost: true`). Only the host can
     start the game.
3. **Open the WebSocket** - connect to `wss://<host>/ws?roomCode=<roomCode>&playerId=<playerId>`
   using the values from step 2. No further handshake is needed once the connection opens -
   you'll immediately receive either a `preGameUpdate` or `gameUpdate` message (see below).

## Reconnection

There is no separate session token and no grace-window timer. **`playerId` itself is the
connection credential** - it's an unguessable UUID minted only for the player who
legitimately joined that match, the same role the old REST API's `id` played. To reconnect
after a dropped connection (phone locked, walked out of signal, backgrounded and killed,
etc.), just open a new WebSocket to the same
`wss://<host>/ws?roomCode=<roomCode>&playerId=<playerId>` URL - no re-join call needed. The
server accepts the connection as long as that `playerId` is still known to the match (which
it is for the entire lifetime of the match, whether the game is preGame, inGame, or
postGame).

**Important for client implementers:** on every successful connect - first connect or a
reconnect - the server immediately sends one state snapshot, but *which* message type
depends on where the match currently is:
- If the match is still `preGame`, you get a `preGameUpdate`.
- If the match is `inGame` or `postGame`, you get a `gameUpdate` instead.

A client must be able to handle either message arriving as the very first thing after
connecting - don't assume it's always `preGameUpdate` just because that's what happens on a
fresh join before anyone starts the game.

Persist `roomCode` and `playerId` locally (e.g. Keychain/UserDefaults on iOS) as soon as you
get them from `/api/joinMatch`, so a reconnect after an app relaunch doesn't require
rejoining as a new player.

## Message envelope

Every message, either direction, is one JSON text frame:

```json
{ "type": "<messageType>", "payload": { ... } }
```

`startGame` (client to server) has no payload field at all.

## Client -> Server messages

| type | payload | replaces (old REST) |
|---|---|---|
| `joinTeam` | `{ "team": "North" \| "South" }` | `POST /api/joinTeam` |
| `startGame` | *(none)* | `POST /api/startGame` (host-only; rejected for anyone else) |
| `location` | `{ "lat": number, "lng": number }` | `POST /api/sendLocationUpdate` |
| `viewChallenges` | *(none)* | `POST /api/viewChallenges` |
| `startChallenge` | `{ "challengeTitle": string }` | `POST /api/startChallenge` |
| `finishChallenge` | *(none)* | `POST /api/finishChallenge` |
| `vetoChallenge` | *(none)* | `POST /api/vetoChallenge` |
| `takeFlag` | `{ "flag": string }` | `POST /api/takeFlag` |
| `captureFlag` | *(none)* | `POST /api/captureFlag` |
| `tag` | `{ "taggerName": string }` | `POST /api/handleTag` - sent by the *tagged* player, naming who tagged them |
| `useTicket` | `{ "num": number }` | `POST /api/useTicket` |
| `useInvisPot` | *(none)* | `POST /api/useInvisibilityPotion` |
| `useDoublePowerup` | *(none)* | `POST /api/useDoublePowerup` |
| `updateCoins` | *(none)* | `POST /api/updateCoins` |

## Server -> Client messages

| type | payload | replaces (old REST) |
|---|---|---|
| `preGameUpdate` | `{ gameState, playersWithoutTeams: string[], teamNorth: string[], teamSouth: string[] }` | polled `POST /api/getPreGameInfo` - now pushed on join and whenever the roster changes |
| `gameUpdate` | full match snapshot: `{ playerStatuses[], northFlags[], southFlags[], northScore, southScore, startTime, endTime }` | polled `POST /api/getGameInfo` - now broadcast every ~2s while `inGame`, plus once immediately on any (re)connect |
| `joinTeamResult` | `Error \| { success: true }` | old `joinTeam` route's response body |
| `startGameResult` | `Error \| { success: true }` | old `routes_admin` `startGame` response body |
| `locationResult` | `Error \| { success: true }` | old `sendLocationUpdate` route's response body |
| `viewChallengesResult` | `Challenge[]` | old `viewChallenges` route's response body |
| `startChallengeResult` | `Error \| Challenge` | old `startChallenge` route's response body |
| `finishChallengeResult` | `Error \| { success: true }` | old `finishChallenge` route's response body |
| `vetoChallengeResult` | `Error \| { vetoPeriodEnd: string }` | old `vetoChallenge` route's response body |
| `takeFlagResult` | `Error \| { success: true }` | old `takeFlag` route's response body |
| `captureFlagResult` | `Error \| { success: true }` | old `captureFlag` route's response body |
| `tagResult` | `Error \| { vetoPeriodEnd: string }` | old `handleTag` route's response body |
| `useTicketResult` | `Error \| { success: true }` | old `useTicket` route's response body |
| `useInvisPotResult` | `Error \| { invisibilityEnd: string }` | old `useInvisibilityPotion` route's response body |
| `useDoublePowerupResult` | `Error \| Challenge` | old `useDoublePowerup` route's response body |
| `updateCoinsResult` | `Error \| { coins: number }` | old `updateCoins` route's response body |

`Error` is `{ errorCode: number, description: string }` - unchanged from the original REST
API's error shape, just delivered as a message payload instead of an HTTP status/body.

## Event log persistence

Every match's logged events (location updates, flag pickups/captures, challenge starts/
finishes/vetoes, item purchases, tags) are written to SQLite once, when the match ends -
either naturally (the 4-hour game timer) or if the room is disposed early. This is server-
side only and not exposed over the WebSocket/REST API to clients (no "match history"
endpoint exists yet) - it's for replay/debugging. See `src/persistence/` if you need to
query it directly (`matches` and `events` tables, DB file at `./data/ctf.db` by default,
overridable via `CTF_DB_PATH`).

## Push notifications (not yet implemented)

`PlayerManager` has a `deviceToken?: string` field reserved for this, but there is no
`registerDevice` client message yet and no APNs/FCM integration. When it's added, the
design is: the client requests notification permission, gets a device token from the OS,
and sends `{ type: "registerDevice", payload: { deviceToken: string } }` once connected -
the server stores it on that player's `PlayerManager` for the duration of the match (not a
persistent account, consistent with the rest of this project's no-accounts design) and can
push things like "match starting" or "you've been tagged" while the app is backgrounded.

## Known gameplay-affecting notes for client implementers

- **Flag pickup radius is currently unenforced.** `game_settings.ts`'s `DISABLE_FLAG_LOCATION_CHECK`
  dev flag is `true`, so `takeFlag` never actually checks how close you are to the flag. This
  was already true before the rewrite (the old check was buggy/inert); the underlying check
  itself is now correctly implemented (`src/common/geo.ts`'s `distanceMeters`, a real
  haversine calculation, gated on `maxFlagDistance` = 152m), it's just switched off. Flip
  `DISABLE_FLAG_LOCATION_CHECK` to `false` before relying on proximity being enforced.
- **`tag` is sent by the tagged player, not the tagger** - if your character gets tagged,
  your client sends `{ type: "tag", payload: { taggerName: "<name of whoever tagged you>" } }`.
  This mirrors the original REST API's design (there's no server-side proximity/hit detection
  for tags - it's currently an honor-system report from the tagged player's client).
