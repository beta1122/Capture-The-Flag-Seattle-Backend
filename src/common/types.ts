import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core"; 
// Enum for all the stages of the game
export type GameState = "inGame" | "preGame" | "postGame";

// Require type checking of request body.
export type SafeRequest = Request<ParamsDictionary, {}, Record<string, unknown>>;
export type SafeResponse = Response;  

export type Team = "North"| "South"
export type FlagState = "grounded" | "held" |"captured";

export type Error = {
  errorCode: number,
  description: string,
}
export const isError = (x:any): x is Error => {
    if(x == undefined){
      return false;
    }
    return (x.errorCode != undefined && x.description != undefined)
}
// Stores all game events for a replay system at the end of the game.
export type Event =
  | { type: "LOCATION_UPDATE"; time: number; id: string; payload: LocationUpdate }
  | { type: "NEW_CHALLENGE"; time: number; id: string; payload: ChallengeUpdate }
  | { type: "FINISH_CHALLENGE"; time: number; id: string; payload: ChallengeUpdate }
  | { type: "VETO_CHALLENGE"; time: number; id: string; payload: ChallengeUpdate }
  | { type: "FLAG_PICKUP"; time: number; id: string; payload: FlagUpdate }
  | { type: "FLAG_CAPTURE"; time: number; id: string; payload: FlagUpdate }
  | { type: "BUY_ITEM"; time: number; id: string; payload: ItemUpdate}
  | { type: "USE_ITEM"; time: number; id: string; payload: ItemUpdate}
  | { type: "TAGGED"; time: number;id: string;  payload: TagUpdate}
  ;

// Stores all information for a challenge. 
// Challenges should not be created or modified by anyone other than the game.
export type Challenge = {
    title: string,
    description: string,
    coins: number    
}

// Structure for player to send updates to the game to update their position. 
export type LocationUpdate = {
    lat: number,
    lng: number,
}

// Type to store challenge updates, such as veto or complete
// for server logs
export type ChallengeUpdate = {
    challenge: Challenge
}

// Type to store that a player has interacted with an item
export type ItemUpdate = {
    item: Item;
    num: number;
}

export type Item = "Ticket" | "Invisibility Potion" | "Double"

// Type to store a playing being tagged
export type TagUpdate = {
    taggerName: string;
}
//All relevant information for pregame for game to send to players.
export type PreGameUpdate = {
    teamlessPlayers: string[],
    teamNorth: string[],
    teamSouth: string[],
}

// Structure for game to send updates to the player. This will contain 
// all relevant information that the player needs to receive. 
// Should not include anything that the player shouldn't know within the 
// rules of the game. 
// Should be requested by the player to the server. 
export type GameUpdate = {
    playerStatuses: PlayerStatus[],//Other playerstatus
    northFlags: Flag[],//where all the flags are
    southFlags: Flag[],
    northScore: number, //Score
    southScore: number,
    startTime: number, //time stamp of game start
    endTime: number, //time stamp of game end
}

// A separate data type for game updates to only reveal necessary
// information about other players. 
// This should only be used in the game update function. 
export type PlayerStatus = {
    name: string,
    lat: number,
    lng: number,
    timeStamp: number,
    team: Team,
    isTagged: boolean,
    flagHeld?: string, // Title of flag held
}

// Contains all necessary information to get the status of the flags. 
// Should be updated when player sends updates, and in no other case. 
// Each flag can only be picked up by one player. 
export type Flag = {
    title: string,
    lat: number,
    lng: number,
    description: string,
    reward: number,
    flagState: FlagState, // grounded, held, captured
    playerHolding?: string, // Name of player who is holding the flag
}

export type FlagUpdate = {
  title: string,
}

export type VetoChallengeResponse = {
  vetoPeriodEnd: string;
}

export type UseInvisPotResponse = {
  invisibilityEnd: string;
}
export type HandleTagResponse = {
  vetoPeriodEnd: string;
}
export type UpdateCoinsResponse = {
  coins: number
}