import { Mutex } from "async-mutex";
import { Flag, GameState, GameUpdate, PlayerStatus } from "../common/types";
import { PlayerManager } from "./PlayerManager";
import { TeamManager } from "./TeamManager";
import { FlagManager } from "./FlagManager";
import { EventManager } from "./EventManager";
import { ScoreManager } from "./ScoreManager";
import { ChallengeManager } from "./ChallengeManager";

import { randomUUID } from 'crypto';
import { gameDuration } from "../config/game_settings";
import { northFlags, southFlags } from "../config/flags";

export class GameController {
    gameState: GameState = "preGame";
    gameLock = new Mutex();
    gameID = randomUUID();
    

    teamManager: TeamManager = new TeamManager(this.getGameContext.bind(this));
    playerManagers: Map<String,PlayerManager> = new Map();
    eventManager: EventManager = new EventManager();
    scoreManager: ScoreManager = new ScoreManager();
    challengeManager: ChallengeManager = new ChallengeManager();
    // Flags: the flagName is used as an identifier for each flag.
    northFlags: Map<String, FlagManager> = new Map();
    southFlags: Map<String, FlagManager> = new Map();

    // Miliseconds since 1970 of game times
    startTime: number = 0;
    endTime: number = 0;
    timeLeft: number = gameDuration;

    

    async getGameInfo(): Promise<GameUpdate>{

        const playerStatuses: PlayerStatus[] = [];
        // Update player status one by one
        for(const playerManager of this.playerManagers.values()){
            playerStatuses.push({
                name: playerManager.name,
                lat: playerManager.visible_lat,
                lng: playerManager.visible_lng,
                timeStamp: playerManager.last_visible_time,
                team: playerManager.team,
                isTagged: playerManager.isTagged,
                flagHeld: playerManager.flagHeld
            })
        }
        const northFlags: Flag[] = [];
        const southFlags: Flag[] = [];
        for(const flagManager of this.northFlags.values()){
            northFlags.push({
                title: flagManager.title,
                lat: flagManager.lat,
                lng: flagManager.lng,
                description: flagManager.description,
                reward: flagManager.reward,
                flagState: flagManager.flagState,
                playerHolding: flagManager.playerHolding
            })
        }
        for(const flagManager of this.southFlags.values()){
            southFlags.push({
                title: flagManager.title,
                lat: flagManager.lat,
                lng: flagManager.lng,
                description: flagManager.description,
                reward: flagManager.reward,
                flagState: flagManager.flagState,
                playerHolding: flagManager.playerHolding
            })
        }

        return {
            playerStatuses: playerStatuses,//Other playerstatus
            northFlags: northFlags,//where all the flags are
            southFlags: southFlags,
            northScore: this.scoreManager.northScore, //Score
            southScore: this.scoreManager.southScore,
            startTime: this.startTime, //ms of start time
            endTime: this.endTime
        }
    }

    async startGame(): Promise<void>{
        await this.gameLock.runExclusive(async ()=>{
            await this.teamManager.teamManagerLock.runExclusive(async ()=>{
                this.playerManagers = this.teamManager.initializePlayerManagers();
                this.timeLeft = gameDuration;
                this.startTime = Date.now();
                this.endTime = Date.now()+gameDuration*1000
                this.gameState = "inGame";
                this.setFlags();
                
                //Flush every 15 minutes
                // UPDATE ONCE FINISHED WITH EVENT MANAGER
                const flushEventsID = setInterval(()=>{}, 1800_000);
                const updateTimeID = setInterval(()=>{}, 1000);
                    setTimeout(() => {
                    clearInterval(updateTimeID);
                    clearInterval(flushEventsID);
                    console.log("Stopped updating event log after game over.");
                },  gameDuration*1000);

            })
        })
    }
    async setFlags(): Promise<void>{
        for(const flag of northFlags){
            this.northFlags.set(flag.title,new FlagManager(
                flag.title,
                flag.lat,
                flag.lng,
                flag.description,
                flag.reward,
                "North",
                this.getGameContext.bind(this)
            ))
        }
        for(const flag of southFlags){
            this.southFlags.set(flag.title,new FlagManager(
                flag.title,
                flag.lat,
                flag.lng,
                flag.description,
                flag.reward,
                "South",
                this.getGameContext.bind(this)
            ))
        }
    }
    async resetGame(): Promise<void>{
        this.gameState = "preGame";
        this.teamManager= new TeamManager(this.getGameContext.bind(this));
        this.playerManagers = new Map();
        this.eventManager = new EventManager();
        this.scoreManager = new ScoreManager();
        this.challengeManager = new ChallengeManager();
        this.northFlags = new Map();
        this.southFlags = new Map();
    }

    getGameContext (): GameContext {
        return{
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
        }
    }
}

// Type for managers to access other parts of the game
export type GameContext = {
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

// Export a single shared instance
export const gameController = new GameController();