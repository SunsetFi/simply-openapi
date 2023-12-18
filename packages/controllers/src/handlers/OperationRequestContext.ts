import { OpenAPIObject } from "openapi3-ts/oas31";
import { Request, Response } from "express";

import { RequestMethod } from "../types";

import { OperationHandlerContext } from "./OperationHandlerContext";
import { OperationHandlerArgumentDefinitions } from "./operations/types";
import { RequestDataKey, isValidRequestDataKey } from "./request-data";

export class OperationRequestContext extends OperationHandlerContext {
  private readonly _requestData = new Map<string, any>();

  static fromOperationHandlerContext(
    context: OperationHandlerContext,
    req: Request,
    res: Response,
  ) {
    return new OperationRequestContext(
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

  hasRequestData(key: RequestDataKey) {
    return this._requestData.has(key);
  }

  getRequestData(key: RequestDataKey) {
    return this._requestData.get(key);
  }

  setRequestData(key: RequestDataKey, value: any) {
    if (!isValidRequestDataKey(key)) {
      throw new Error(
        `Invalid request data key ${key}.  Extension request data should be prefixed with 'x-'.`,
      );
    }

    this._requestData.set(key, value);
  }

  getPathParam(name: string) {
    return this.req.params[name];
  }

  getHeader(name: string) {
    return this.req.headers[name.toLowerCase()];
  }

  getQuery(name: string) {
    return this.req.query[name];
  }

  getCookie(name: string) {
    return this.req.cookies[name];
  }
}
