import { OpenAPIObject } from "openapi3-ts/oas31";

import { RequestMethod } from "../types";

import { OperationContext } from "./OperationContext";
import { OperationHandlerArgumentDefinitions } from "./operations/types";

export class MethodHandlerContext extends OperationContext {
  static fromOperationContext(
    context: OperationContext,
    controller: object,
    handler: Function,
    handlerArgs: OperationHandlerArgumentDefinitions,
  ) {
    return new MethodHandlerContext(
      context.spec,
      context.path,
      context.method,
      controller,
      handler,
      handlerArgs,
    );
  }

  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    private _controller: object,
    private _handler: Function,
    private _handlerArgs: OperationHandlerArgumentDefinitions,
  ) {
    super(spec, path, method);
  }

  /**
   * The controller class that contains the handler.
   * This should be the `this` object of the handler.
   */
  get controller(): object {
    return this._controller;
  }

  /**
   * The handler function that will process the request.
   */
  get handler(): Function {
    return this._handler;
  }

  /**
   * The argument definitions that the handler expects.
   */
  get handlerArgs(): OperationHandlerArgumentDefinitions {
    return this._handlerArgs;
  }
}
