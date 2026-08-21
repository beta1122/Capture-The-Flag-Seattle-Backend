import { Challenge } from "./types"
// Useful helper functions across all files

// Used for type-checking a value against an expected primitive type, or one of the
// custom shapes below. Returns a type guard so callers can narrow without a cast.
export function checkParam<T>(param: any, expectedType: string): param is T {
  if (param === undefined) {
    return false;
  }
  if (expectedType === "LocationUpdate") {
    return isLocationUpdate(param);
  }
  if (expectedType === "Challenge") {
    return isChallenge(param);
  }
  return typeof param === expectedType;
}

// Used for removing a player from teams, mutates array
export function removeString(arr: string[], target: string): void {
  const index = arr.indexOf(target);
  if (index > -1) {
    arr.splice(index, 1); // removes in-place
  }
  return;
}

export const isChallenge = (param: any): param is Challenge => {
  return (
    typeof param === 'object' &&
    param !== null &&
    typeof param.title === 'string' &&
    typeof param.description === 'string' &&
    typeof param.coins === 'number'
  );
};

export const isLocationUpdate = (param: any): boolean => {
  return (
    typeof param === 'object' &&
    param !== null &&
    typeof param.lat === 'number' &&
    typeof param.lng === 'number'
  );
}
