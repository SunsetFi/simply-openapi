import { MaybePromise } from "../../types";

import { RequestContext } from "../RequestContext";

/**
 * An interface for authentication controllers.
 */
export interface AuthenticationController {
  /**
   * Authenticates the request.
   * @param value The value extracted from the request according to the authentication spec.
   * @param scopes The scopes required for the request.
   * @param ctx The context of the request.
   * @returns `false` if the authentication failed, otherwise an object containing the user information.  Can return synchronously, or return a promise.
   */
  authenticate(
    value: any,
    scopes: string[],
    ctx: RequestContext,
  ): MaybePromise<boolean | object>;
}
