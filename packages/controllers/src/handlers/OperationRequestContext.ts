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

  getPathParam(name: string): string | string[] | undefined {
    return this.req.params[name];
  }

  getHeader(name: string): string | string[] | undefined {
    return this.req.headers[name.toLowerCase()];
  }

  getQuery(name: string): string | string[] | undefined {
    const value = this.req.query[name];
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      if (value.some((v) => typeof v !== "string")) {
        throw new Error(
          `Unexpected non-string array value for query parameter "${name}".  Are you using a middleware query parser?  @simply-openapi/controllers will perform its own parsing based on the parameter definition.`,
        );
      }

      return value as string[];
    }

    // Under what circumstances does a query return an additional object?
    if (typeof value === "object") {
      throw new Error(
        `Unexpected object in request query ${name}.  Are you using a middleware query parser?  @simply-openapi/controllers will perform its own parsing based on the parameter definition.`,
      );
    }

    return value;
  }

  getCookie(name: string): string | undefined {
    const value = this.req.cookies[name];
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error(
        `Unexpected non-string cookie value for cookie "${name}".  Are you using a middleware cookie parser?  @simply-openapi/controllers will perform its own parsing based on the parameter definition.`,
      );
    }

    return String(value);
  }
}
