import { Challenge } from "./types"

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
