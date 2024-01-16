import { CookieOptions, Response } from "express";
import HttpStatusCodes from "http-status-codes";
import { omit } from "lodash";

export class HandlerResult {
  // These are not marked private so as to be easier to unit test in typescript.
  _bodyRaw: any;
  _bodyJson: any;
  _status: number = HttpStatusCodes.OK;
  _headers: Record<string, string> = {};
  _cookies: Record<string, { value: string } & CookieOptions> = {};

  /**
   * Sets the body for this response.
   */
  static body(value: any): HandlerResult {
    return new HandlerResult().body(value);
  }

  /**
   * Sets the body as a json value for this response.
   * This also sets the Content-Type header to application/json.
   */
  static json(value: any): HandlerResult {
    return new HandlerResult().json(value);
  }

  /**
   * Sets the status code for this response.
   */
  static status(value: number): HandlerResult {
    return new HandlerResult().status(value);
  }

  /**
   * Sets a header for this response.
   */
  static header(key: string, value: string): HandlerResult {
    return new HandlerResult().header(key, value);
  }

  /**
   * Sets a cookie for this response.
   */
  static cookie(
    key: string,
    value: string,
    options?: CookieOptions,
  ): HandlerResult {
    return new HandlerResult().cookie(key, value, options);
  }

  /**
   * Sets the body for this response.
   */
  body(value: any): this {
    this._ensureBodyNotSet();
    this._bodyRaw = value;
    return this;
  }

  /**
   * Sets the body as a json value for this response.
   * This also sets the Content-Type header to application/json.
   */
  json(value: any): this {
    this._ensureBodyNotSet();
    this._bodyJson = value;
    if (this._headers["Content-Type"] === undefined) {
      this._headers["Content-Type"] = "application/json";
    }

    return this;
  }

  /**
   * Sets the status code for this response.
   */
  status(value: number): this {
    this._status = value;
    return this;
  }

  /**
   * Sets a header for this response.
   */
  header(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  /**
   * Sets a cookie for this response.
   */
  cookie(key: string, value: string, options?: CookieOptions): this {
    this._cookies[key] = { value, ...options };
    return this;
  }

  /**
   * Apply this result object to the express response.
   * @param res The express response to apply this result to.
   */
  _apply(res: Response) {
    if (this._status !== undefined) {
      res.status(this._status);
    }

    if (this._headers !== undefined) {
      for (const [key, value] of Object.entries(this._headers)) {
        res.setHeader(key, value);
      }
    }

    if (this._cookies !== undefined) {
      for (const [key, data] of Object.entries(this._cookies)) {
        res.cookie(key, data.value, omit(data, "value"));
      }
    }

    if (this._bodyRaw !== undefined) {
      res.send(this._bodyRaw);
    } else if (this._bodyJson !== undefined) {
      res.json(this._bodyJson);
    }
  }

  private _ensureBodyNotSet() {
    if (this._bodyRaw !== undefined || this._bodyJson !== undefined) {
      throw new Error("Body has already been set.");
    }
  }
}
