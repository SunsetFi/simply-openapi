import { SecuritySchemeObject } from "openapi3-ts/oas31";

import {
  SOCAuthenticationExtensionData,
  SOCAuthenticatorExtensionName,
} from "../../../../openapi";

import { OperationRequestContext } from "../../../OperationRequestContext";

export abstract class SecurityRequirementProcessor {
  private _handlerFn: Function;

  constructor(
    public readonly schemeKey: string,
    public readonly scheme: SecuritySchemeObject,
    private readonly _scopes: string[],
  ) {
    const extension: SOCAuthenticationExtensionData =
      scheme[SOCAuthenticatorExtensionName];
    if (!extension) {
      throw new Error(
        `Security scheme "${schemeKey}" does not have a security authenticator extension.`,
      );
    }

    // FIXME: Do this at the router factory so we can apply resolveController/resolveHandler.
    let handler = extension.handler as Function;
    if (typeof handler === "string" || typeof handler === "symbol") {
      handler = (extension.controller as any)[handler];
    }

    this._handlerFn = handler.bind(extension.controller);
  }

  async process(
    ctx: OperationRequestContext,
  ): Promise<Record<string, any> | boolean> {
    const value = this._getValue(ctx);
    if (value === undefined) {
      return false;
    }

    return this._handlerFn(value, this._scopes, ctx);
  }

  protected abstract _getValue(ctx: OperationRequestContext): any;
}
