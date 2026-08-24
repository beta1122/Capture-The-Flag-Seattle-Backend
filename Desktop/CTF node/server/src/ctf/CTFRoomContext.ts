import { Mutex } from "async-mutex";
import { GameState } from "../common/types";
import { TeamManager } from "./modules/TeamManager";
import { PlayerManager } from "./modules/PlayerManager";
import { ScoreManager } from "./modules/ScoreManager";
import { ChallengeManager } from "./modules/ChallengeManager";
import { EventManager } from "./modules/EventManager";
import { FlagManager } from "./modules/FlagManager";

// Per-match context passed into CTF managers so they can reach sibling managers.
// One instance per CTFMatchRoom, replacing the old process-wide GameContext/gameController singleton.
export type CTFRoomContext = {
    gameState: GameState,
    gameLock: Mutex,
    teamManager: TeamManager,
    playerManagers: Map<String, PlayerManager>,
    scoreManager: ScoreManager,
    challengeManager: ChallengeManager,
    eventManager: EventManager,
    northFlags: Map<String, FlagManager>,
    southFlags: Map<String, FlagManager>,
    startTime: number,
    endTime: number,
    timeLeft: number,
}
