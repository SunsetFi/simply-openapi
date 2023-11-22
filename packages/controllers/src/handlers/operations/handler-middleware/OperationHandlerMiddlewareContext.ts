import { OpenAPIObject } from "openapi3-ts/oas31";
import { Request, Response } from "express";

import { RequestMethod } from "../../../types";

import { MethodHandlerContext } from "../MethodHandlerContext";
import { OperationHandlerArgumentDefinitions } from "../types";

export class OperationHandlerMiddlewareContext extends MethodHandlerContext {
  static fromMethodHandlerContext(
    context: MethodHandlerContext,
    req: Request,
    res: Response,
  ) {
    return new OperationHandlerMiddlewareContext(
      context.spec,
      context.path,
      context.method,
      context.controller,
      context.handler,
      context.handlerArgs,
      req,
      res,
    );
  }

  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    controller: object,
    handler: Function,
    handlerArgs: OperationHandlerArgumentDefinitions,
    private _req: Request,
    private _res: Response,
  ) {
    super(spec, path, method, controller, handler, handlerArgs);
  }

  /**
   * The express request.
   */
  get req(): Request {
    return this._req;
  }

  /**
   * The express response.
   */
  get res(): Response {
    return this._res;
  }
}
