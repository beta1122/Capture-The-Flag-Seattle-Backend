import { isError, SafeRequest, SafeResponse } from "../common/types";
import { checkParam } from "../common/utils";
import { gameController } from "../modules/GameController";

// Returns an array of challenges
// at the top of the deck
export const viewChallenges = async (req: SafeRequest, res: SafeResponse): Promise<void> => {
  req
  const Challenges = await gameController.challengeManager.viewTop();
  res.status(200).send(Challenges);
}

// Gets a challenge from the top k of a deck
// id: string, challengeTitle: string
// sends back the challenge
export const startChallenge = async (req: SafeRequest, res: SafeResponse): Promise<void> => {
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from get challenge endpoint", res)){
      return;
  }
  const challengeTitle = req.body.challengeTitle;
  if (!checkParam<string>(challengeTitle, "string", "id param from get challenge endpoint", res)){
      return;
  }
  // Make sure this is an actual player
  const player = gameController.playerManagers.get(id);
  if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (get Challenge endpoint)");
    return;
  }
  const maybeError = await player.startChallenge(challengeTitle);
  if(isError(maybeError)){
    res.status(maybeError.errorCode).send(maybeError.description);
    return;
  }
  res.status(200).send(maybeError);
  return;
}

// Finishes a challenge for a player
// adds coins as necessary and sets player's challenge slot to empty.
export const finishChallenge = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from finish challenge endpoint", res)){
      return;
  }
  // Make sure this id is actually a player
  const player = gameController.playerManagers.get(id);
  if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (finish Challenge endpoint)");
    return;
  }
  const maybeError = await player.finishChallenge();
  if(maybeError!= undefined){
    res.status(maybeError.errorCode).send(maybeError.description);
    return;
  }
  res.status(200).send("Success");
}

// Finishes a challenge for a player
// adds coins as necessary and sets player's challenge slot to empty.
export const vetoChallenge = async (req: SafeRequest, res: SafeResponse): Promise<void> =>{
  // Verify parameters
  const id = req.body.id;
  if (!checkParam<string>(id, "string", "id param from veto challenge endpoint", res)){
      return;
  }
  // Make sure this id is actually a player
  const player = gameController.playerManagers.get(id);
  if(player == undefined){
    res.status(400).send("Invalid id: could not find that id (get Challenge endpoint)");
    return;
  }
  const maybeError = await player.vetoChallenge();
  if(isError(maybeError)){
    res.status(maybeError.errorCode).send(maybeError.description);
    return;
  }
  res.status(200).send(maybeError);
}