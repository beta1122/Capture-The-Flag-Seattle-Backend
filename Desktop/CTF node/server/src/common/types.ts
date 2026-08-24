// Enum for all the stages of the game
export type GameState = "inGame" | "preGame" | "postGame";

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
