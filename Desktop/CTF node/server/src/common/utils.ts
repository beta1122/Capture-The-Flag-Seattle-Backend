// Useful helper functions across all files

// Used for removing a player from teams, mutates array
export function removeString(arr: string[], target: string): void {
  const index = arr.indexOf(target);
  if (index > -1) {
    arr.splice(index, 1); // removes in-place
  }
  return;
}
