import { isError, SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";

export const handleTag = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
    const id = req.body.id;
    if(!checkParam<string>(id,"string", "id from handle tag endpoint", res)){
      return;
    }
    const name = req.body.name;
    if(!checkParam<string>(name,"string", "name from handle tag endpoint", res)){
      return;
    }
    const player = gameController.playerManagers.get(id);
    
    if(player == undefined){
        res.status(400).send("Invalid id: could not find that id (takeFlag endpoint)");
        return;
    }

    const errorMaybe = await player.handleTag(name);
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send(errorMaybe);
}