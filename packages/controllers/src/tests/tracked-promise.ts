const trackedPromiseHooks: Function[] = [];

let isTracking = false;
beforeEach(() => {
  trackedPromiseHooks.length = 0;
  isTracking = false;
});

afterEach(() => {
  if (trackedPromiseHooks.length > 0 && !isTracking) {
    throw new Error("Promise hooks were registered but no promise was tracked");
  }
});

export function trackPromise<T>(factoryFunction: () => Promise<T>): Promise<T> {
  if (isTracking) {
    throw new Error(
      "Cannot track a promise while tracking is already in progress",
    );
  }

  isTracking = true;

  const promise = factoryFunction().then((result) => {
    trackedPromiseHooks.forEach((func) => func(result));
    return result;
  });
  return promise;
}

export function tapPromise(tapFunction: (result: any) => void) {
  trackedPromiseHooks.push(tapFunction);
}
