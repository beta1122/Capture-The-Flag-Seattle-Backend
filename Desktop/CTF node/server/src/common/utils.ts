import {SafeResponse, Challenge} from "./types"
// Useful helper functions across all files

// Used for type checking request body parameters 
// Takes in a param (any type)
// A type name (string)
// A description for error messages to describe the
// thing being passed in, and a response 
// to write the errors to.
export function checkParam<T>
(
    param: any,
    expectedType: string,
    description: string,
    res: SafeResponse
):  param is T { // Returns a statement for typescript to read :D

  if (param === undefined) {
      res.status(401).send('No parameter found, expected ' + expectedType  + " for " + description );
      return false;
  }
  // custom types
  if (expectedType === "LocationUpdate") {
    if(!isLocationUpdate(param)){
      res.status(401).send('Type of ' + description + " is not " + expectedType);
      return false;
    }
    return true;
  }

  if (expectedType === "Challenge") {
    if(!isChallenge(param)){
      res.status(401).send('Type of ' + description + " is not " + expectedType);
      return false;
    }
    return true;
  }

  if (typeof param !== expectedType) {
    res.status(401).send('Type of ' + description + " is not " + expectedType);
    return false;
  }
  return true;
}

// Used for removing a player from teams, mutates array
export function removeString(arr: string[], target: string): void {
  const index = arr.indexOf(target);
  if (index > -1) {
    arr.splice(index, 1); // removes in-place
  }
  return;
}


// export const isFlag = (param: any): param is Flag => {
//   return (
//     typeof param === 'object' &&
//     param !== null &&
//     typeof param.title === 'string' &&
//     typeof param.lat === 'number' &&
//     typeof param.lng === 'number' &&
//     typeof param.description === 'string' &&
//     typeof param.reward === 'number' &&
//     typeof param.flagState === 'string' &&
//     param.lock instanceof Mutex
//   );
// };


export const isChallenge = (param: any): param is Challenge => {
  return (
    typeof param === 'object' &&
    param !== null &&
    typeof param.title === 'string' &&
    typeof param.description === 'string' &&
    typeof param.coins === 'number'
  );
};


export const isLocationUpdate = (param: any): boolean =>{
  return (
    typeof param === 'object' &&
    param !== null &&
    typeof param.id === 'string' &&
    typeof param.lat === 'number' &&
    typeof param.lng === 'number' && 
    typeof param.timeStamp === 'string' 
  );
}