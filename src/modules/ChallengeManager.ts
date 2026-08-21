import { Mutex } from "async-mutex";
import { Challenge, Error } from "../common/types";
import { gameChallenges } from "../config/challenges";
import { challengeDrawSize } from "../config/game_settings";


export class ChallengeManager {
    ChallengeDeck: Challenge[];
    lock: Mutex = new Mutex();

    constructor() {
        this.ChallengeDeck = [...gameChallenges];
        // Fisher-Yates: sort(() => Math.random() - 0.5) is a statistically biased shuffle.
        for (let i = this.ChallengeDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.ChallengeDeck[i], this.ChallengeDeck[j]] = [this.ChallengeDeck[j], this.ChallengeDeck[i]];
        }
    }

    async viewTop(): Promise<Challenge[]>{
        return await this.lock.runExclusive(()=>{
            return this.ChallengeDeck.slice(0, challengeDrawSize);
        })
    }

    async pullChallenge(challengeTitle: string): Promise<Error|Challenge>{
        const errorOrChallenge = await this.lock.runExclusive(()=>{
            for(const challenge of this.ChallengeDeck.slice(0, challengeDrawSize)){
                if(challenge.title == challengeTitle){
                    // remove
                    const index = this.ChallengeDeck.indexOf(challenge);
                    if (index !== -1) {
                        this.ChallengeDeck.splice(index, 1);
                    }
                    // return the challenge
                    return challenge;
                }
            }
            // If wasn't found
            return {
                errorCode: 406,
                description: "Challenge no longer in deck / not found"
            }
        })
        return errorOrChallenge;
    }

    async drawRandomChallenge(): Promise<Error|Challenge>{
        return await this.lock.runExclusive(()=>{
            if(this.ChallengeDeck.length == 0){
                return {errorCode: 405, description: "Challenge deck is empty"}
            }
            const index = Math.floor(Math.random() * this.ChallengeDeck.length);
            const picked = this.ChallengeDeck.splice(index, 1)[0]; 
            return picked;
        })
    }

    // Adds to the bottom of the deck
    async addChallenge(challenge: Challenge){
        await this.lock.runExclusive(()=>{
            this.ChallengeDeck.push(challenge);
        })
    }

}