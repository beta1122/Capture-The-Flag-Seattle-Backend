import { Team } from "../common/types";

// DEV
export const VERBOSE: boolean = true;
export const DISABLE_FLAG_LOCATION_CHECK: boolean = true
// CONSTANTS
// 30 minutes
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

export const maxFlagDistance = 100 // 500 ft =  0.001449


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

