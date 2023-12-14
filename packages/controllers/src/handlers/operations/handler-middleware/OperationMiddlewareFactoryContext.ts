import { OpenAPIObject } from "openapi3-ts/oas31";

import { RequestMethod } from "../../../types";
import { ValidatorFactories } from "../../../validation";

import { MethodHandlerContext } from "../../MethodHandlerContext";

import { OperationHandlerArgumentDefinitions } from "../types";

export class OperationMiddlewareFactoryContext extends MethodHandlerContext {
  static fromMethodHandlerContext(
    context: MethodHandlerContext,
    validators: ValidatorFactories,
  ) {
    return new OperationMiddlewareFactoryContext(
      context.spec,
      context.path,
      context.method,
      context.controller,
      context.handler,
      context.handlerArgs,
      validators,
    );
  }

  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    controller: object,
    handler: Function,
    handlerArgs: OperationHandlerArgumentDefinitions,
    private _validators: ValidatorFactories,
  ) {
    super(spec, path, method, controller, handler, handlerArgs);
  }

  /**
   * Gets a collection of validator factories for use with validating data.
   */
  get validators() {
    return this._validators;
  }
}
