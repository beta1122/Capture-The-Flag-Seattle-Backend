
import { SafeRequest, SafeResponse } from "../common/types";
import { gameController } from "../modules/GameController";

/**
 * 
 * Starts the game
 * Converts the pregame info to ingame formats: populates
 * playerInfo array with initial values, and sets global
 * parameters involving time
 */
export const startGame = async (req: SafeRequest, res: SafeResponse) => {
    req
    await gameController.startGame();
    res.status(200).send("Success");
    console.log("Starting game");
    return;
}


