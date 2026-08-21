import { Mutex } from "async-mutex";
import { Event, Challenge, Item} from "../common/types";

export class EventManager{
    // All logged events for this match, used to build a replay at the end.
    gameEvents: Event[] = [];
    gameEventLock = new Mutex();
    private flushed = false;

    // Returns all logged events exactly once - a second call returns undefined, so a
    // room can safely call this from both a natural game-end and a dispose() safety net
    // without double-writing to persistence.
    flush(): Event[] | undefined {
        if (this.flushed) return undefined;
        this.flushed = true;
        return this.gameEvents;
    }

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