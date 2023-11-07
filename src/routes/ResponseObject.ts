import { Response } from "express";
import HttpStatusCodes from "http-status-codes";
import { JsonValue } from "type-fest";

// TODO: Its been a while, see if this is still valid for express.
// Probably want to drop this and use Omit and Partial<> on the real objectr.

/**
 * Configuration options for setting cookies.
 *
 * Values inherited from express api.
 */
export interface CookieSettings {
  /**
   * Sets the domain of the cookie.  Defaults to the app's domain name.
   */
  domain?: string;

  /**
   * Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie.
   */
  expires?: Date;

  /**
   * Flags the cookie to be accessible only by the web server.
   */
  httpOnly?: boolean;

  /**
   * Convenient option for setting the expiry time relative to the current time in milliseconds.
   */
  maxAge?: number;

  /**
   * Path for the cookie. Defaults to “/”.
   */
  path?: string;

  /**
   * Marks the cookie to be used with HTTPS only.
   */
  secure?: boolean;

  /**
   * Indicates if the cookie should be signed.
   */
  signed?: boolean;

  /**
   * Value of the “SameSite” Set-Cookie attribute.
   * More information at https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1.
   */
  sameSite?: boolean | "lax" | "strict" | "none";
}

export class ResponseObject {
  // These are not marked private so as to be open to unit testing.
  _body: any;
  _status: number = HttpStatusCodes.OK;
  _headers: Record<string, string> = {};
  _cookies: Record<string, { value: string } & CookieSettings> = {};

  static body(value: any): ResponseObject {
    return new ResponseObject().body(value);
  }

  static json(value: JsonValue): ResponseObject {
    return new ResponseObject().json(value);
  }

  static status(value: number): ResponseObject {
    return new ResponseObject().status(value);
  }

  static header(key: string, value: string): ResponseObject {
    return new ResponseObject().header(key, value);
  }

  static cookie(
    key: string,
    value: string,
    settings?: CookieSettings
  ): ResponseObject {
    return new ResponseObject().cookie(key, value, settings);
  }

  body(value: any): this {
    this._body = value;
    return this;
  }

  json(value: JsonValue): this {
    this._body = value;
    this._headers["Content-Type"] = "application/json";
    return this;
  }

  status(value: number): this {
    this._status = value;
    return this;
  }

  header(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  cookie(key: string, value: string, settings?: CookieSettings): this {
    this._cookies[key] = { value, ...settings };
    return this;
  }

  _apply(res: Response) {
    if (this._status !== undefined) {
      res.status(this._status);
    }

    if (this._headers !== undefined) {
      for (const [key, value] of Object.entries(this._headers)) {
        res.set(key, value);
      }
    }

    if (this._cookies !== undefined) {
      for (const [key, value] of Object.entries(this._cookies)) {
        res.cookie(key, value.value, value);
      }
    }

    if (this._body !== undefined) {
      res.send(this._body);
    }
  }
}
