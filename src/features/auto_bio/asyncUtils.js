export async function promiseWithTimeout(promise, ms, label = "") {
  let timeoutId;

  const guarded = Promise.resolve(promise).catch((error) => {
    error.timedOut = false;
    error.promise = promise;
    error.label = label;
    throw error;
  });

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Promise${label ? ` (“${label}”)` : ""} timed out after ${ms} ms`);
      error.timedOut = true;
      error.promise = promise;
      error.label = label;
      reject(error);
    }, ms);
  });

  return Promise.race([guarded, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}
