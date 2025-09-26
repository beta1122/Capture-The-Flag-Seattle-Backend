import { isError, SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";

/**
 * Pickup flag for a player
 * Updates the player and flag fields to show it is being picked up
 * Requires the player currently doesn't have a flag
 * Requires that the flag doesn't have a player holding it (grounded, playerHodling = undefined)
 * Requires that the flag is on the enemy team
 * requires that player is not currently tagged.
 * 
 * @param req: {id: string, flag: string}
 * @param res different status codes
 * 200: success
 * 400: game state error, could not find player from id,cant find flag on enemy team
 * 401: param issue
 * 402: player has flag already
 * 403: flag params: not grounded/ playerholding not undefined
 * 405: flag not close enough
 * 406: currently tagged
 */
export const takeFlag = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
    const id = req.body.id;
    const flagTitle = req.body.flag;
    if(!checkParam<string>(id,"string", "id from pickupFlag endpoint", res) || 
    !checkParam<string>(flagTitle,"string", "flag from pickupFlag endpoint", res)){
      return;
    }
    const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (takeFlag endpoint)");
    return;
    }
    const errorMaybe = await player.takeFlag(flagTitle);
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send("Success");
}

/**
 * Capture flag at target area
 * Updates the team scoring with the flag score
 * Set flag to captured.
 * Makes major push notification. (TO DO)
 * 
 * @param req {id: string}
//  **/
export const captureFlag = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
    const id = req.body.id;
    if(!checkParam<string>(id,"string", "id from captureFlag endpoint", res)){
      return;
    }
    const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (takeFlag endpoint)");
    return;
    }
    const errorMaybe = await player.captureFlag();
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send("Success");
}