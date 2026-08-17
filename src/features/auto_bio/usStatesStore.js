/**
 * us_states.json is large and only needed for US locations, so it is imported on demand
 * and cached here. It used to be a mutable module-level binding in auto_bio.js that two
 * different code paths assigned to, which made it impossible to split them apart.
 */
let USstatesObjArray;

export async function loadUSStates() {
  if (!USstatesObjArray) {
    const module = await import("./us_states.json");
    USstatesObjArray = module.default;
  }
  return USstatesObjArray;
}

export function getUSStates() {
  return USstatesObjArray;
}
