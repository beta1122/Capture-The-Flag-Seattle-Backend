import { Mutex } from "async-mutex";
import { CTFRoomContext } from "../rooms/ctf/CTFRoomContext";
import { Error, Team } from "../common/types";
import { randomUUID } from 'crypto';
import { VERBOSE } from "../config/game_settings";
import { removeString } from "../common/utils";
import { PlayerManager } from "./PlayerManager";

// Manages adding players to teams switching teams, the pregame stuff
export class TeamManager {

    constructor(
        private getGameContext: () => CTFRoomContext
    ){}
    
    teamManagerLock = new Mutex();
    // All players who signed up for team north
    teamNorth: string[] = [];
    // All players who signed up for team south
    teamSouth: string[] = [];
    // Players who have not selected a team yet
    playersWithoutTeams: string[] = [];

    // Initialize these when a player joins
    // ID's will be used to identify who is calling an endpoint
    // for future use.
    IDToPlayer: {[key: string]: string} = {}
    playerToID: {[key: string]: string } = {}
    
    nameAlreadyInGame = (name: string): boolean =>{
        return this.teamSouth.includes(name) || this.teamNorth.includes(name) || this.playersWithoutTeams.includes(name);
    }

    async addPlayerToGame(playerName: string): Promise<Error | string> {

        // Put everything in teamManagerLock, because game won't start until teamManagerLock has been released.
        const errorOrId = await this.teamManagerLock.runExclusive(async () => {
            const gameContext = this.getGameContext();
            if (gameContext.gameState === "inGame" || gameContext.gameState === "postGame") {
                return { errorCode: 402, description: "The game has already started. You cannot join" };
            }
            
            if (this.nameAlreadyInGame(playerName)) {
                return { errorCode: 401, description: "There already is a player with this name in the game." };
            }

            // Add player safely inside the mutex
            this.playersWithoutTeams.push(playerName);
            const id = randomUUID();
            this.playerToID[playerName] = id;
            this.IDToPlayer[id] = playerName;

            if (VERBOSE) console.log(playerName + " has joined the game.");

            return id; // success
        });

        return errorOrId;
    }

    async removePlayerFromGame(playerID: string): Promise<Error | undefined> {
        
        const errorOrUndefined = await this.teamManagerLock.runExclusive(async () => {
            
            const name = this.IDToPlayer[playerID];
            if(name == undefined){
                return { errorCode: 403, description: "ID not registered in game" }
            }

            const gameContext = this.getGameContext();
            if (gameContext.gameState === "inGame" || gameContext.gameState === "postGame") {
                return { errorCode: 402, description: "The game has already started. You cannot remove a player from the game." };
            }
            // Remove player from player list
            removeString(this.teamNorth, name);
            removeString(this.teamSouth, name);
            removeString(this.playersWithoutTeams, name);

            delete this.playerToID[name];
            delete this.IDToPlayer[playerID];
            
            if(VERBOSE){
                console.log(name + " has leave the game.")
            }
            // Remove from maps
            return undefined; 
        });

        return errorOrUndefined;
    }

    async movePlayerIntoTeam(playerID: string, team: Team): Promise<Error|undefined> {
        // Work with all mutable variables in the lock.
        const errorOrUndefined = await this.teamManagerLock.runExclusive(async () => {
            const gameContext = this.getGameContext();
            // First, check if the gameStatus is correct
            if(gameContext.gameState === "inGame" || gameContext.gameState === "postGame"){
                return {errorCode: 402,description:`The game has already 
                    started. You cannot join any teams`}; 
            }
            const name: string | undefined = this.IDToPlayer[playerID];

            if(name == undefined){

                return {errorCode: 401,description:`ID not found`};
            }
        
            // Check if name is registered.
            if (!this.nameAlreadyInGame(name)){
                return {errorCode: 401, description: `Invalid call to joinTeam: No player with name: "` + name +`" in game.`}
            }
    
            // Remove from current team
            removeString(this.teamNorth, name);
            removeString(this.teamSouth, name);
            removeString(this.playersWithoutTeams, name);
    
            // Add to team
            if (team == "North") {
                this.teamNorth.push(name);
                if(VERBOSE){
                    console.log(name + " has joined the North team.")
                }
                return undefined;
            }
            if (team == "South") {
                this.teamSouth.push(name);
                if(VERBOSE){
                    console.log(name + " has joined the South team.")
                }
                return undefined;
            }
            this.playersWithoutTeams.push(name);
           
            return {errorCode: 201, description: "please specify a team: North or South"}
        })
        return errorOrUndefined;
    }

    // SHould be run inside this class' lock
    initializePlayerManagers(): Map<String, PlayerManager>{
        const map: Map<String, PlayerManager> = new Map();

        for(const playerName of this.teamNorth){
            const id = this.playerToID[playerName]?? "";
            const playerManager = new PlayerManager(playerName, "North",  id, this.getGameContext)
            map.set(this.playerToID[playerName],playerManager);
        }
        for(const playerName of this.teamSouth){
            const id = this.playerToID[playerName]?? "";
            const playerManager = new PlayerManager(playerName, "South", id, this.getGameContext)
            map.set(this.playerToID[playerName],playerManager);
        }

        return map;
    }
    async resetPreGame(){
        this.playersWithoutTeams = [];
        this.teamNorth = [];
        this.teamSouth = [];
        this.playerToID = {};
        this.IDToPlayer = {};
    }

    
    getPreGameInfo() {
        return {
                    gameState: this.getGameContext().gameState,
                    playersWithoutTeams: this.playersWithoutTeams,
                    teamNorth: this.teamNorth,
                    teamSouth: this.teamSouth
                }
    }


}