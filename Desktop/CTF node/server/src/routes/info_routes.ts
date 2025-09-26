import { isError, SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";

export const getGameInfo = async (req: SafeRequest, res: SafeResponse)=>{
    req
    const info = await gameController.getGameInfo();
    res.status(200).send(info);
    return;
}

export const updateCoins = async (req: SafeRequest, res: SafeResponse)=>{
    const id = req.body.id;
    if(!checkParam<string>(id,"string", "id from updateCoins endpoint", res)){
        return;
    }
    const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (updateCoins)");
    return;
    }
    const errorMaybe = await player.updateCoins();
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send(errorMaybe)
}