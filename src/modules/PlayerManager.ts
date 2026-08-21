import { Mutex } from "async-mutex";
import { Challenge, Error, HandleTagResponse, isError, Team, UpdateCoinsResponse, UseInvisPotResponse, VetoChallengeResponse } from "../common/types";
import { attacker_InvisbilityPotionDuration, DISABLE_FLAG_LOCATION_CHECK, doublePowerUpPrice, inNorthTerritory, inSouthTerritory, inTeamTerritory, invisibilityPotionPrice, startingCoins, tagVetoPeriodDuration, ticketPrice, VERBOSE, vetoPeriodDuration } from "../config/game_settings";
import { CTFRoomContext } from "../rooms/ctf/CTFRoomContext";
import { FlagManager } from "./FlagManager";

// Manages all the actions a player can take
export class PlayerManager{
    name: string;
    team: Team;
    id: string
    constructor(name: string, team: Team, id: string, getGameContext: () => CTFRoomContext){
        this.name = name;
        this.team = team;
        this.id = id;
        this.getGameContext = getGameContext
    }

    lock: Mutex = new Mutex;
    getGameContext: () => CTFRoomContext;
    // Location
    lat: number = 0;
    lng: number = 0;

    // Visible location
    visible_lat:number = 0;
    visible_lng: number = 0;
    last_visible_time: number = 0;


    coins: number = startingCoins;

    // Push notification extension point: set via a future "registerDevice" client
    // message once APNs/FCM support is added. Scoped to this match/player only, not a
    // persistent account - matches the project's no-accounts design.
    deviceToken?: string;

    // States
    flagHeld?: string //Flag the player is holding
    currChallenge?: Challenge;
    
    // Status effects
    vetoPeriodEnd?:number; 
    invisibilityEnd?: number;
    doubleNextChallenge = false;
    isTagged: boolean = false;   
    

    // updates player, then logs event, then looks for flag and maybe updates,
    async updateLocation(lat: number, lng: number): Promise<Error|undefined>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to update location"};
        }
    
        await this.lock.runExclusive(()=>{
            this.lat = lat;
            this.lng = lng;
            if(!(this.invisibilityEnd && this.invisibilityEnd > Date.now())){
                this.visible_lat = lat;
                this.visible_lng = lng;
                this.last_visible_time = Date.now();
            }
            // if we need to remove a Tagged status, auto remove it if we are in the right territory.
            if(this.isTagged && inTeamTerritory(lat,lng,this.team)){
              this.isTagged=false;
              if(this.coins<6){
                this.coins =6;
              }
            }
        }) // end of player lock

        // Update logs
        this.getGameContext().eventManager.addLocationUpdate(this.id, lat, lng);

        // update flag
        if(this.flagHeld !== undefined){
            let flagManager: FlagManager | undefined; 
            // grab the flag manager
            if(this.team == "North"){
                flagManager = this.getGameContext().southFlags.get(this.flagHeld);
            }else{
                flagManager = this.getGameContext().northFlags.get(this.flagHeld);
            }
            if(flagManager == undefined){
                this.flagHeld = undefined;
                return {
                    errorCode: 403,
                    description: "Flag not found"
                }
            }
            return flagManager.moveFlag(this.name, lat,lng);
        }
        return undefined;
    }
    
    async startChallenge(challengeTitle: string): Promise<Error|Challenge>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to start Challenge"};
        }
        return await this.lock.runExclusive(async ()=>{
            // check our state to see if we can accept a challenge
            if(this.currChallenge!== undefined){
                return {errorCode: 402, description: "You already have a challenge going!"}
            }
            if(this.vetoPeriodEnd!= undefined && Date.now() < this.vetoPeriodEnd){
                return {errorCode: 403, description: 'Veto period not over yet'}
            }
            // See if we can fetch this challenge from the deck
            const errorOrChallenge = await this.getGameContext().challengeManager.pullChallenge(challengeTitle);
            if(isError(errorOrChallenge)){
                return errorOrChallenge;
            }
            
            this.currChallenge = errorOrChallenge;

            // Log the event (no await needed)
            this.getGameContext().eventManager.addNewChallengeUpdate(this.id,this.currChallenge);
            if (VERBOSE){
                console.log(this.name + " has started" + this.currChallenge.title + " at " + new Date().toISOString());
            }
            return this.currChallenge;
        });
    }

    async finishChallenge(): Promise<Error|undefined>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to finish challenge"};
        }
        return await this.lock.runExclusive(async ()=>{
            // check our state to see if we can accept a challenge
            if(this.currChallenge == undefined){
                return {errorCode: 402, description: "You don't have a challenge going!"}
            }
            if(this.vetoPeriodEnd!= undefined && Date.now() < this.vetoPeriodEnd){
                return {errorCode: 403, description: 'Veto period not over yet'}
            }
            // Add challenge back to the deck
            this.getGameContext().challengeManager.addChallenge(this.currChallenge);
            // Log the event (no await needed)
            this.getGameContext().eventManager.addFinishChallengeUpdate(this.id,this.currChallenge);
            if (VERBOSE){
                console.log(this.name + " has finished" + this.currChallenge.title + " at " + new Date().toISOString());
            }

            // cash out
            this.coins += this.currChallenge.coins * (this.doubleNextChallenge ? 2 : 1);
            this.doubleNextChallenge = false;
            this.currChallenge = undefined;
            
            return undefined;
        });
    }

    async vetoChallenge(): Promise<Error|VetoChallengeResponse>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to veto challenge"};
        }
        return await this.lock.runExclusive(async ()=>{
            // check our state to see if we can accept a challenge
            if(this.currChallenge == undefined){
                return {errorCode: 402, description: "You don't have a challenge going!"}
            }
            if(this.vetoPeriodEnd!= undefined && Date.now() < this.vetoPeriodEnd){
                return {errorCode: 403, description: 'Veto period not over yet'}
            }
            // Add challenge back to the deck
            this.getGameContext().challengeManager.addChallenge(this.currChallenge);
            // Log the event (no await needed)
            this.getGameContext().eventManager.addVetoChallengeUpdate(this.id,this.currChallenge);
            if (VERBOSE){
                console.log(this.name + " has vetoed" + this.currChallenge.title + " at " + new Date().toISOString());
            }
            
            // update veto period
            if(this.doubleNextChallenge){

                this.vetoPeriodEnd = Date.now() + vetoPeriodDuration * 2000;
                this.doubleNextChallenge = false;
            }else{
                this.vetoPeriodEnd = Date.now() + vetoPeriodDuration * 1000;
            }
            
            this.currChallenge = undefined;
            const date = new Date(this.vetoPeriodEnd);
            return {vetoPeriodEnd: date.toISOString()};
        });
    }


    async takeFlag(flagName: string): Promise<Error|undefined>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to take flag"};
        }

        return await this.lock.runExclusive(async()=>{
            if(this.flagHeld != undefined){
                return {errorCode: 402, description:"You are already holding a flag. leave some for the rest of us"};
            }
            if(this.isTagged){
                return {errorCode: 406, description: "You got tagged and can't pick up a flag until you return to your territory."}
            }
            // Find flag
            let flag: FlagManager |undefined;
            if(this.team == "North"){
                flag = this.getGameContext().southFlags.get(flagName);
            }else{
                flag = this.getGameContext().northFlags.get(flagName);
            }
            if (flag == undefined){
                return {errorCode: 400, description: "Couldn't find flag"}
            }
            // Call flag manager to take it
            const maybeError = await flag.takeFlag(this.name, this.lat, this.lng);
            if(maybeError !== undefined){
                return maybeError;
            }
            // Update player
            this.flagHeld = flagName;
            
            // Update Logs
            if(VERBOSE){
              console.log("Player " + this.name + " has picked up " + flagName + " at timeStamp "+ new Date().toISOString());
            }
            this.getGameContext().eventManager.addFlagPickupUpdate(this.id,flagName);
            return undefined;
        })
    }

     async captureFlag(): Promise<Error|undefined>{
        if(this.getGameContext().gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to capture flag"};
        }

        return await this.lock.runExclusive(async()=>{
            
            if(this.flagHeld == undefined){
                return {errorCode: 402, description:"Youre not holding a flag. what are you trying to capture, the air?"};
            }
            if(this.isTagged){
                this.flagHeld = undefined;
                return {errorCode: 406, description: "You got tagged! you shouldn't even have a flag right now"}
            }
            // make sure in the right territory
            if(!DISABLE_FLAG_LOCATION_CHECK){
                if(this.team == "North"){
                    if(inSouthTerritory(this.lat, this.lng)){
                        return {errorCode: 408, description: "You need to be in your own territory to capture a flag!"}
                    }
                }else{
                    if(inNorthTerritory(this.lat, this.lng)){
                        return {errorCode: 408, description: "You need to be in your own territory to capture a flag!"}
                    }
                }
            }
            // Find flag
            let flag: FlagManager | undefined;
            if(this.team == "North"){
                flag = this.getGameContext().southFlags.get(this.flagHeld);
            }else{
                flag = this.getGameContext().northFlags.get(this.flagHeld);
            }
            if (flag == undefined){
                this.flagHeld = undefined;
                return {errorCode: 400, description: "Couldn't find flag"}
            }
            // Call flag manager to capture it and update game score
            const maybeError = await flag.captureFlag(this.name);
            if(maybeError!== undefined){
                return maybeError;
            }
            // Update Logs
            if(VERBOSE){
              console.log("Player " + this.name + " has captured " + this.flagHeld + " at timeStamp "+ new Date().toISOString());
            }
            this.getGameContext().eventManager.addFlagCaptureUpdate(this.id,this.flagHeld);

            // Update player
            this.flagHeld = undefined;
            return undefined;
        })
    }


    async handleTag(taggerName: string): Promise<Error|HandleTagResponse>{
        const gameContext = this.getGameContext()
        if(gameContext.gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to take flag"};
        }
        let coinsOwed =0;
        let enemyPlayerManager: PlayerManager | undefined = undefined;
        const errorOrResponse = await this.lock.runExclusive(async()=>{
            // check if tagged already
            if(this.isTagged){
                this.flagHeld = undefined;
                return {errorCode: 406, description: "You already got tagged! You shouldn't be able to get tagged again until you return."}
            }
            // make sure in the right territory
            if(this.team == "North"){
                if(inNorthTerritory(this.lat, this.lng)){
                    return {errorCode: 408, description: "You can't get tagged in your own territory!"}
                }
            }else{
                if(inSouthTerritory(this.lat, this.lng)){
                    return {errorCode: 408, description: "You can't get tagged in your own territory!"}
                }
            }
            
            // If have flag, handle dropping it
            if(this.flagHeld !== undefined){
                let flag: FlagManager | undefined;
                if(this.team == "North"){
                    flag = gameContext.southFlags.get(this.flagHeld);
                }else{
                    flag = gameContext.northFlags.get(this.flagHeld);
                }
                if (flag == undefined){
                    this.flagHeld = undefined;
                    return {errorCode: 400, description: "Illegal state: Couldn't find flag"}
                }
                // Call flag manager to capture it and update game score
                const maybeError = await flag.dropFlag(this.name);
                if(maybeError !== undefined){
                    return maybeError;
                }
            }
            // handle finding enemy and giving them coins
            const enemyID = gameContext.teamManager.playerToID[taggerName];
            if(enemyID == undefined){
                return {errorCode: 407, description: "coudln't find player with that name. please try again."}
            }
        
            const enemyPlayer = gameContext.playerManagers.get(enemyID);
            if(enemyPlayer==undefined){
                return {errorCode: 500, description: "Couldn't find enemy player manager."}
            }
            if(enemyPlayer.team == this.team){
                return {errorCode: 408, description: "You can't get tagged by a player on your own team"};
            }
            // potential for deadlock here unless we deal with this outside the block
            coinsOwed = this.coins;
            enemyPlayerManager = enemyPlayer;
            
            // Update Logs
            if(VERBOSE){
              console.log("Player " + this.name + " has been tagged by " + taggerName + " at timeStamp "+ new Date().toISOString());
            }
            this.getGameContext().eventManager.addTagUpdate(this.id,taggerName);

            // Update player
            this.flagHeld = undefined;
            // Remove any challenges and start veto period
            this.isTagged = true;
            this.coins = 0;
            this.currChallenge = undefined;
            this.vetoPeriodEnd = new Date(Date.now() + tagVetoPeriodDuration * 1000).getTime();
            const date = new Date(this.vetoPeriodEnd);
            return {vetoPeriodEnd: date.toISOString()};
        })

        // explicit type conversion
        if(enemyPlayerManager){
            const mgr = enemyPlayerManager as PlayerManager;
            await mgr.lock.runExclusive(() => {
                mgr.coins += coinsOwed;
            });
        }
        return errorOrResponse;
    }

    async useInvisPot(): Promise<Error|UseInvisPotResponse>{
        const gameContext = this.getGameContext()
        if(gameContext.gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to take flag"};
        }
        return await this.lock.runExclusive(()=>{
            if(this.coins < invisibilityPotionPrice){
                return {errorCode: 403, description: "You need more coins to buy invis pot " + invisibilityPotionPrice}
            }
            this.coins -= invisibilityPotionPrice;  
            this.invisibilityEnd = Date.now()+ attacker_InvisbilityPotionDuration * 1000;
            gameContext.eventManager.addUseItemUpdate(this.id,"Invisibility Potion",1);

            const date = new Date(this.invisibilityEnd);
            return {invisibilityEnd: date.toISOString()};
        })
    }

    async useTicket(num: number): Promise<Error|undefined>{
        const gameContext = this.getGameContext()
        if(gameContext.gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to take flag"};
        }
        return await this.lock.runExclusive(()=>{
            if(this.coins < ticketPrice*num){
                return {errorCode: 403, description: "You need more coins to buy " + num + " tickets: " + (num*ticketPrice)}
            }
            this.coins -= ticketPrice*num;
            gameContext.eventManager.addUseItemUpdate(this.id, "Ticket",num);
            return undefined;
        })
    }

    async useDoublePowerup(): Promise<Error|Challenge>{
        const gameContext = this.getGameContext()
        if(gameContext.gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to do double powerup"};
        }
        return await this.lock.runExclusive(async ()=>{
            if(this.coins < doublePowerUpPrice){
                return {errorCode: 403, description: "You need more coins to buy this double powerup: " + doublePowerUpPrice}
            }
            if(this.doubleNextChallenge){
                return {errorCode: 405, description: "You already have a double next challenge active."}
            }
            // check our state to see if we can accept a challenge
            if(this.currChallenge!== undefined){
                return {errorCode: 402, description: "You already have a challenge going!"}
            }
            if(this.vetoPeriodEnd!= undefined && Date.now() < this.vetoPeriodEnd){
                return {errorCode: 403, description: 'Veto period not over yet'}
            }
            // fetch a random challenge from the deck
            const errorOrChallenge = await this.getGameContext().challengeManager.drawRandomChallenge();
            if(isError(errorOrChallenge)){
                return errorOrChallenge;
            }
            
            this.currChallenge = errorOrChallenge;
            this.coins -= doublePowerUpPrice;
            this.doubleNextChallenge = true;
            gameContext.eventManager.addUseItemUpdate(this.id, "Double",1);
            return errorOrChallenge;
        })
    }

    async updateCoins(): Promise<Error|UpdateCoinsResponse>{
        const gameContext = this.getGameContext()
        if(gameContext.gameState != "inGame"){
            return {errorCode: 400, description: "Not in game while trying to take flag"};
        }
        return await this.lock.runExclusive(()=>{
            return {coins: this.coins}
        })

    } 
}