/* utils/fieldLocks.js -------------------------------------------- */
export function setIfVacant(obj, key, value) {
  if (value == null) return; // nothing to set
  if (obj[key] === undefined) obj[key] = value;
}

export function lock(obj, key, value) {
  if (value == null) return;
  obj[key] = value; // overwrite once …
  obj._locks ??= new Set();
  obj._locks.add(key); // … and mark as locked
}

export function safeSet(obj, key, value) {
  if (value == null) return;
  if (obj._locks?.has(key)) return; // already locked ⇒ hands off
  obj[key] = value;
}
