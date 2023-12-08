export class Deferred<T> {
  private _resolved = false;

  private _accept!: (value: T) => void;
  private _reject!: (reason: any) => void;

  readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise((accept, reject) => {
      this._accept = accept;
      this._reject = reject;
    });
  }

  get resolved() {
    return this._resolved;
  }

  resolve(value: T) {
    if (this._resolved) {
      throw new Error("Deferred already resolved");
    }

    this._resolved = true;
    this._accept(value);
  }

  reject(reason: any) {
    if (this._resolved) {
      throw new Error("Deferred already resolved");
    }

    this._resolved = true;
    this._reject(reason);
  }
}
