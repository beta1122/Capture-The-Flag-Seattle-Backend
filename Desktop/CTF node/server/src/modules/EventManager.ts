import { Mutex } from "async-mutex";
import { Event, PlayerStatus, Challenge, Item} from "../common/types";

export class EventManager{
    // Array of latest updates from players.
    statusUpdates: PlayerStatus[] = []

    // All status updates, used to make replay at the end.

    gameEvents: Event[] = [];
    gameEventLock = new Mutex();

    async addLocationUpdate(playerID: string, lat: number, lng: number){
        const newEvent:Event = {
            type: "LOCATION_UPDATE",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                lat: lat,
                lng: lng,
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }

    async addNewChallengeUpdate(playerID: string,challenge: Challenge){
        const newEvent:Event = {
            type: "NEW_CHALLENGE",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                challenge: challenge
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    async addFinishChallengeUpdate(playerID: string,challenge: Challenge){
        const newEvent:Event = {
            type: "FINISH_CHALLENGE",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                challenge: challenge
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    async addVetoChallengeUpdate(playerID: string,challenge: Challenge){
        const newEvent:Event = {
            type: "VETO_CHALLENGE",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                challenge: challenge
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    async addFlagPickupUpdate(playerID: string,flagTitle: string){
        const newEvent:Event = {
            type: "FLAG_PICKUP",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                title: flagTitle
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    async addFlagCaptureUpdate(playerID: string,flagTitle: string){
        const newEvent:Event = {
            type: "FLAG_CAPTURE",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                title: flagTitle
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }

    async addUseItemUpdate(playerID: string, item: Item, num: number){
        const newEvent:Event = {
            type: "USE_ITEM",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                item: item,
                num: num,
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    
    async addTagUpdate(playerID: string, taggerName: string){
        const newEvent:Event = {
            type: "TAGGED",
            id: playerID,
            time: new Date().getTime(),
            payload: {
                taggerName: taggerName
            }
        }
        await this.gameEventLock.runExclusive(()=>{
            this.gameEvents.push(newEvent);
        })
    }
    

}