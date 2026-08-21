import {
    Error, GameUpdate, PreGameUpdate, Team, Challenge,
    VetoChallengeResponse, UseInvisPotResponse, HandleTagResponse, UpdateCoinsResponse,
} from "../../common/types";

// Canonical message contract for the CTF game WebSocket connection. Both server and
// any client (Swift, Kotlin, ...) are built against this file directly - it IS the
// protocol spec, documented in human-readable form in docs/PROTOCOL.md.
//
// Every message, either direction, is one JSON text frame: { "type": "...", "payload": ... }

// ---- Client -> Server ----

// Join North or South. Replaces the old POST /api/joinTeam route.
export type CTFJoinTeamPayload = { team: Team };

// Periodic GPS update from an in-game player. Replaces the old POST /api/sendLocationUpdate route.
export type CTFLocationPayload = { lat: number, lng: number };

export type CTFStartChallengePayload = { challengeTitle: string };
export type CTFTakeFlagPayload = { flag: string };
export type CTFTagPayload = { taggerName: string };
export type CTFUseTicketPayload = { num: number };

export type CTFClientMessage =
  | { type: "joinTeam", payload: CTFJoinTeamPayload }
  | { type: "startGame" }
  | { type: "location", payload: CTFLocationPayload }
  | { type: "viewChallenges" }
  | { type: "startChallenge", payload: CTFStartChallengePayload }
  | { type: "finishChallenge" }
  | { type: "vetoChallenge" }
  | { type: "takeFlag", payload: CTFTakeFlagPayload }
  | { type: "captureFlag" }
  | { type: "tag", payload: CTFTagPayload }
  | { type: "useTicket", payload: CTFUseTicketPayload }
  | { type: "useInvisPot" }
  | { type: "useDoublePowerup" }
  | { type: "updateCoins" };

export type CTFClientMessageType = CTFClientMessage["type"];

// ---- Server -> Client ----

type CTFActionResult = Error | { success: true };

export type CTFServerMessage =
  // Lobby roster snapshot. Sent on join and whenever the roster changes.
  // Replaces polled POST /api/getPreGameInfo.
  | { type: "preGameUpdate", payload: PreGameUpdate }
  // Full game-state snapshot, broadcast on an interval once the match is inGame, and
  // once immediately on any (re)connect that happens after preGame.
  // Replaces polled POST /api/getGameInfo.
  | { type: "gameUpdate", payload: GameUpdate }
  // Response to a "joinTeam" message. Replaces the old joinTeam route's response body.
  | { type: "joinTeamResult", payload: CTFActionResult }
  // Response to a "startGame" message. Replaces the old routes_admin startGame response body.
  | { type: "startGameResult", payload: CTFActionResult }
  // Response to a "location" message. Replaces the old sendLocationUpdate route's response body.
  | { type: "locationResult", payload: CTFActionResult }
  // Response to "viewChallenges". Replaces POST /api/viewChallenges.
  | { type: "viewChallengesResult", payload: Challenge[] }
  // Response to "startChallenge". Replaces POST /api/startChallenge.
  | { type: "startChallengeResult", payload: Error | Challenge }
  // Response to "finishChallenge". Replaces POST /api/finishChallenge.
  | { type: "finishChallengeResult", payload: CTFActionResult }
  // Response to "vetoChallenge". Replaces POST /api/vetoChallenge.
  | { type: "vetoChallengeResult", payload: Error | VetoChallengeResponse }
  // Response to "takeFlag". Replaces POST /api/takeFlag.
  | { type: "takeFlagResult", payload: CTFActionResult }
  // Response to "captureFlag". Replaces POST /api/captureFlag.
  | { type: "captureFlagResult", payload: CTFActionResult }
  // Response to "tag". Replaces POST /api/handleTag.
  | { type: "tagResult", payload: Error | HandleTagResponse }
  // Response to "useTicket". Replaces POST /api/useTicket.
  | { type: "useTicketResult", payload: CTFActionResult }
  // Response to "useInvisPot". Replaces POST /api/useInvisibilityPotion.
  | { type: "useInvisPotResult", payload: Error | UseInvisPotResponse }
  // Response to "useDoublePowerup". Replaces POST /api/useDoublePowerup.
  | { type: "useDoublePowerupResult", payload: Error | Challenge }
  // Response to "updateCoins". Replaces POST /api/updateCoins.
  | { type: "updateCoinsResult", payload: Error | UpdateCoinsResponse };

export type CTFServerMessageType = CTFServerMessage["type"];
