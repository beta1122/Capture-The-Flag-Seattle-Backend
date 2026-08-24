import { randomUUID } from "crypto";
import { Mutex } from "async-mutex";
import { GameState } from "../common/types";
import { GameUpdate, Flag, PlayerStatus } from "./types";
import { GameRoom } from "../rooms/GameRoom";
import { CTFRoomContext } from "./CTFRoomContext";
import { TeamManager } from "./modules/TeamManager";
import { PlayerManager } from "./modules/PlayerManager";
import { ScoreManager } from "./modules/ScoreManager";
import { ChallengeManager } from "./modules/ChallengeManager";
import { EventManager } from "./modules/EventManager";
import { FlagManager } from "./modules/FlagManager";
import { gameDuration } from "./config/game_settings";
import { northFlags as northFlagConfigs, southFlags as southFlagConfigs } from "./config/flags";
import { getDb } from "./persistence/db";
import { flushMatch } from "./persistence/eventLogRepository";
import { CTFClientMessage, CTFServerMessage } from "./protocol";
import { handleJoinTeam, handleStartGame } from "./handlers/teamHandlers";
import { handleLocation } from "./handlers/locationHandlers";
import { handleTakeFlag, handleCaptureFlag } from "./handlers/flagHandlers";
import { handleViewChallenges, handleStartChallenge, handleFinishChallenge, handleVetoChallenge } from "./handlers/challengeHandlers";
import { handleUseTicket, handleUseInvisPot, handleUseDoublePowerup, handleUpdateCoins } from "./handlers/itemHandlers";
import { handleTag } from "./handlers/tagHandlers";

const GAME_UPDATE_INTERVAL_MS = 2000;

// One instance per CTF match. Owns all game state for that match - this is what
// replaces the old process-wide GameController singleton, allowing multiple matches
// (of this or any other game mode) to run concurrently.
export class CTFMatchRoom extends GameRoom<CTFServerMessage> {
    readonly matchId = randomUUID();
    gameState: GameState = "preGame";
    gameLock = new Mutex();
    hostPlayerId?: string;

    teamManager: TeamManager;
    playerManagers: Map<String, PlayerManager> = new Map();
    eventManager: EventManager = new EventManager();
    scoreManager: ScoreManager = new ScoreManager();
    challengeManager: ChallengeManager = new ChallengeManager();
    northFlags: Map<String, FlagManager> = new Map();
    southFlags: Map<String, FlagManager> = new Map();

    startTime: number = 0;
    endTime: number = 0;
    timeLeft: number = gameDuration;

    private gameUpdateInterval?: ReturnType<typeof setInterval>;
    private gameEndTimeout?: ReturnType<typeof setTimeout>;

    constructor(roomCode: string) {
        super(roomCode);
        this.teamManager = new TeamManager(this.getContext.bind(this));
    }

    getContext(): CTFRoomContext {
        return {
            gameState: this.gameState,
            gameLock: this.gameLock,
            teamManager: this.teamManager,
            playerManagers: this.playerManagers,
            scoreManager: this.scoreManager,
            challengeManager: this.challengeManager,
            eventManager: this.eventManager,
            northFlags: this.northFlags,
            southFlags: this.southFlags,
            startTime: this.startTime,
            endTime: this.endTime,
            timeLeft: this.timeLeft,
        };
    }

    protected onDisconnect(playerId: string): void {
        if (this.gameState === "preGame") {
            void this.teamManager.removePlayerFromGame(playerId).then(() => this.broadcastPreGameUpdate());
        }
    }

    protected handleMessage(playerId: string, message: unknown): void {
        const msg = message as CTFClientMessage;
        switch (msg.type) {
            case "joinTeam":
                void handleJoinTeam(this, playerId, msg.payload);
                return;
            case "startGame":
                void handleStartGame(this, playerId);
                return;
            case "location":
                void handleLocation(this, playerId, msg.payload);
                return;
            case "takeFlag":
                void handleTakeFlag(this, playerId, msg.payload);
                return;
            case "captureFlag":
                void handleCaptureFlag(this, playerId);
                return;
            case "viewChallenges":
                void handleViewChallenges(this, playerId);
                return;
            case "startChallenge":
                void handleStartChallenge(this, playerId, msg.payload);
                return;
            case "finishChallenge":
                void handleFinishChallenge(this, playerId);
                return;
            case "vetoChallenge":
                void handleVetoChallenge(this, playerId);
                return;
            case "tag":
                void handleTag(this, playerId, msg.payload);
                return;
            case "useTicket":
                void handleUseTicket(this, playerId, msg.payload);
                return;
            case "useInvisPot":
                void handleUseInvisPot(this, playerId);
                return;
            case "useDoublePowerup":
                void handleUseDoublePowerup(this, playerId);
                return;
            case "updateCoins":
                void handleUpdateCoins(this, playerId);
                return;
        }
    }

    broadcastPreGameUpdate(): void {
        this.broadcast({ type: "preGameUpdate", payload: this.teamManager.getPreGameInfo() });
    }

    async startGame(): Promise<void> {
        await this.gameLock.runExclusive(async () => {
            await this.teamManager.teamManagerLock.runExclusive(async () => {
                this.playerManagers = this.teamManager.initializePlayerManagers();
                this.timeLeft = gameDuration;
                this.startTime = Date.now();
                this.endTime = Date.now() + gameDuration * 1000;
                this.gameState = "inGame";
                this.setFlags();

                this.gameUpdateInterval = setInterval(() => this.broadcastGameUpdate(), GAME_UPDATE_INTERVAL_MS);
                this.gameEndTimeout = setTimeout(() => this.endGame(), gameDuration * 1000);
            });
        });
    }

    private endGame(): void {
        this.gameState = "postGame";
        if (this.gameUpdateInterval !== undefined) clearInterval(this.gameUpdateInterval);
        this.persistMatch();
        this.broadcastGameUpdate();
    }

    // Flushes the event log to SQLite exactly once per match - safe to call from both
    // the natural postGame transition and dispose() (EventManager.flush() guards against
    // a double write). No-ops for a match that never actually started.
    private persistMatch(): void {
        if (this.gameState === "preGame") return;
        const events = this.eventManager.flush();
        if (events === undefined) return;
        flushMatch(getDb(), {
            matchId: this.matchId,
            roomCode: this.roomCode,
            startTime: this.startTime,
            endTime: this.endTime,
            northScore: this.scoreManager.northScore,
            southScore: this.scoreManager.southScore,
        }, events);
    }

    setFlags(): void {
        for (const flag of northFlagConfigs) {
            this.northFlags.set(flag.title, new FlagManager(
                flag.title, flag.lat, flag.lng, flag.description, flag.reward, "North", this.getContext.bind(this)
            ));
        }
        for (const flag of southFlagConfigs) {
            this.southFlags.set(flag.title, new FlagManager(
                flag.title, flag.lat, flag.lng, flag.description, flag.reward, "South", this.getContext.bind(this)
            ));
        }
    }

    getGameUpdate(): GameUpdate {
        const playerStatuses: PlayerStatus[] = [];
        for (const playerManager of this.playerManagers.values()) {
            playerStatuses.push({
                name: playerManager.name,
                lat: playerManager.visible_lat,
                lng: playerManager.visible_lng,
                timeStamp: playerManager.last_visible_time,
                team: playerManager.team,
                isTagged: playerManager.isTagged,
                flagHeld: playerManager.flagHeld,
            });
        }
        const northFlags: Flag[] = [];
        for (const flagManager of this.northFlags.values()) {
            northFlags.push({
                title: flagManager.title,
                lat: flagManager.lat,
                lng: flagManager.lng,
                description: flagManager.description,
                reward: flagManager.reward,
                flagState: flagManager.flagState,
                playerHolding: flagManager.playerHolding,
            });
        }
        const southFlags: Flag[] = [];
        for (const flagManager of this.southFlags.values()) {
            southFlags.push({
                title: flagManager.title,
                lat: flagManager.lat,
                lng: flagManager.lng,
                description: flagManager.description,
                reward: flagManager.reward,
                flagState: flagManager.flagState,
                playerHolding: flagManager.playerHolding,
            });
        }
        return {
            playerStatuses,
            northFlags,
            southFlags,
            northScore: this.scoreManager.northScore,
            southScore: this.scoreManager.southScore,
            startTime: this.startTime,
            endTime: this.endTime,
        };
    }

    broadcastGameUpdate(): void {
        this.broadcast({ type: "gameUpdate", payload: this.getGameUpdate() });
    }

    dispose(): void {
        super.dispose();
        if (this.gameUpdateInterval !== undefined) clearInterval(this.gameUpdateInterval);
        if (this.gameEndTimeout !== undefined) clearTimeout(this.gameEndTimeout);
        this.persistMatch();
    }
}
