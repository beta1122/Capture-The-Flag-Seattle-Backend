import { Mutex } from "async-mutex"
import { Team } from "../common/types"

export class ScoreManager{
    
    northScore: number = 0
    northLock = new Mutex()

    southScore: number = 0
    southLock = new Mutex()

    async addScoreToTeam(team: Team, score: number) {
        if(team == "North"){
            await this.northLock.runExclusive(()=>{
                this.northScore+=score;
            })
        }else{
            await this.southLock.runExclusive(()=>{
            this.southScore+=score;
            })
        }
    }
    
}