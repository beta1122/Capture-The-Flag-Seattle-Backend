import { Mutex } from "async-mutex";
import { Error, FlagState, Team } from "../common/types";
import { CTFRoomContext } from "../rooms/ctf/CTFRoomContext";
import { DISABLE_FLAG_LOCATION_CHECK, maxFlagDistance } from "../config/game_settings";
import { distanceMeters } from "../common/geo";

// Flag manager is not responsible for reporting events as it has no knowledge of any game state

export class FlagManager{
    title: string;
    lat: number;
    lng: number;
    description: string;
    reward: number;
    flagState: FlagState = "grounded"; // grounded, held, captured
    lock: Mutex = new Mutex();
    playerHolding?: string;
    team: Team;

    constructor(title: string, lat: number, lng: number, description: string, reward: number, team: Team,
        private getGameContext: () => CTFRoomContext
    ){
        this.title = title;
        this.lat = lat;
        this.lng = lng;
        this.description = description;
        this.reward = reward;
        this.team = team;
    }
    
    async takeFlag(playerName: string, lat: number, lng: number): Promise<Error| undefined>{
        const errorOrUndefined = await this.lock.runExclusive(async ()=>{
            if(this.playerHolding != undefined){
                return {
                    errorCode: 403,
                    description: "Flag already has a player holding."
                }
            }
            if(this.flagState != "grounded"){
                return {
                    errorCode: 406,
                    description: "Flag is either captured or held by a player"
                }
            }
            if(!DISABLE_FLAG_LOCATION_CHECK && distanceMeters(this.lat, this.lng, lat, lng) > maxFlagDistance){
              return {
                errorCode: 405,
                description: "You're not close enough to the flag yet!"
              }
            }
            this.playerHolding = playerName;
            this.flagState = "held";
            return undefined;
        })
        return errorOrUndefined;
    }

    async moveFlag(playerName: string, lat: number, lng: number): Promise<Error| undefined>{
        const errorOrUndefined = await this.lock.runExclusive(async ()=>{
            if(this.playerHolding != playerName){
                return {
                    errorCode: 403,
                    description: "Player not registered to have this flag."
                }
            }
            if(this.flagState != "held"){
                return {
                    errorCode: 500,
                    description: "Flag error: player is registered to have flag but flag is not held"
                }
            }
            this.lat = lat;
            this.lng = lng;
            return undefined;
        })
        
        return errorOrUndefined;
    }

    async dropFlag(playerName: string): Promise<Error| undefined>{
        const errorOrUndefined = await this.lock.runExclusive(async ()=>{
            if(this.playerHolding != playerName){
                return {
                    errorCode: 403,
                    description: "Player not registered to have this flag."
                }
            }
            if(this.flagState != "held"){
                return {
                    errorCode: 500,
                    description: "Flag error: player is registered to have flag but flag is not held"
                }
            }
            this.playerHolding = undefined;
            this.flagState = "grounded";
            return undefined;
        })
        return errorOrUndefined;
    }

    async captureFlag(playerName: string): Promise<Error| undefined>{
        const errorOrUndefined = await this.lock.runExclusive(async ()=>{
            if(this.playerHolding != playerName){
                return {
                    errorCode: 403,
                    description: "Player not registered to have this flag."
                }
            }
            if(this.flagState != "held"){
                return {
                    errorCode: 500,
                    description: "Flag is either grounded or captured"
                }
            }

            this.playerHolding = undefined;
            this.flagState = "captured";
            // Update score
            
            if(this.team == "North"){
                this.getGameContext().scoreManager.addScoreToTeam("South", this.reward);
            }else if(this.team == "South"){
                this.getGameContext().scoreManager.addScoreToTeam("North", this.reward);
            }
            
            return undefined;
        })
        return errorOrUndefined;
    }
}