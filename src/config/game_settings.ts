import { Team } from "../common/types";

// DEV
export const VERBOSE: boolean = true;
export const DISABLE_FLAG_LOCATION_CHECK: boolean = true
// CONSTANTS
// Seconds. Currently a dev-friendly 10s for fast testing; set to 1800 for the
// "30 minutes" the original comment here described but the value never matched.
export const vetoPeriodDuration = 10;
export const boundary = 47.6062;
export const tagVetoPeriodDuration = 1800;

export const defender_InvisbilityPotionDuration = 900;//15 minutes
export const attacker_InvisbilityPotionDuration = 300; // 5 minutes
export const gameDuration = 14400 // 4 hours

export const invisibilityPotionPrice = 15;
export const ticketPrice = 5;
export const doublePowerUpPrice = 10;
export const startingCoins = 6;
export const challengeDrawSize = 3;

// Meters. How close a player must be to a flag to pick it up (500 ft ≈ 152m).
export const maxFlagDistance = 152


export const inNorthTerritory = (lat: number, lng: number): boolean =>{
  lng
  return lat>boundary;
}
export const inSouthTerritory = (lat: number, lng: number): boolean =>{
  lng
  return lat<boundary;
}
export const inTeamTerritory = (lat: number, lng: number, team: Team): boolean =>{
  if(team == "North"){
    return inNorthTerritory(lat, lng);
  }
  return inSouthTerritory(lat, lng);
}

