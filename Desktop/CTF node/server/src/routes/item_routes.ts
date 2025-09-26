import { isError, SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";


export const useTicket = async (req: SafeRequest, res: SafeResponse) => {
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from use Ticket endpoint", res)){
      return;
  }
  const num = req.body.num;
  if (!checkParam<number>(num, "number", "num param from use Ticket endpoint", res)){
      return;
  }

  // Make sure this id is actually a player
  const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (useTicket endpoint)");
    return;
    }
    const errorMaybe = await player.useTicket(num);
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send("Success");
}
export const useInvisPot = async (req: SafeRequest, res: SafeResponse) => {
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from use invis pot endpoint", res)){
      return;
  }
  

  // Make sure this id is actually a player
  const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (use invis pot endpoint)");
    return;
    }
    const errorMaybe = await player.useInvisPot();
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send(errorMaybe);
}
export const useDoublePowerup = async (req: SafeRequest, res: SafeResponse) => {
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from use double powerup endpoint", res)){
      return;
  }
  
  // Make sure this id is actually a player
  const player = gameController.playerManagers.get(id);
    if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (use double powerup endpoint)");
    return;
    }
    const errorMaybe = await player.useDoublePowerup();
    if(isError(errorMaybe)){
        res.status(errorMaybe.errorCode).send(errorMaybe.description);
        return;
    }
    res.status(200).send(errorMaybe);
}