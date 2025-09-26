import { SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";

/**
 * A location update from the player to the game. To be 
 * sent periodically by all players in game.
 * 
 * @param req 
 * {
 *  id: string
 *  lat: number,
 *  lng: number
 */
export const sendLocationUpdate = async (req: SafeRequest, res: SafeResponse): Promise<void> => {
  
  // Verify format of api call
  const lat = req.body.lat;
  if (!checkParam<number>(lat, "number", "lat param from send location update endpoint", res)){
      return;
  }
  const lng = req.body.lng;
  if (!checkParam<number>(lng, "number", "lng param from send location update endpoint", res)){
      return;
  }
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from get challenge endpoint", res)){
      return;
  }
  const player = gameController.playerManagers.get(id);
  if(player == undefined){
    res.status(400).send("cannot find player");
    return;
  }
  const errorMaybe = await player.updateLocation(lat, lng);
  if(errorMaybe == undefined){
    res.status(200).send("Success");
    return;
  }
  res.status(errorMaybe.errorCode).send(errorMaybe.description);
}