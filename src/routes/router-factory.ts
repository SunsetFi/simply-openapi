import { Router, RequestHandler } from "express";
import {
  OpenAPIObject,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { Entries } from "type-fest";
import { isFunction, isObject, pick } from "lodash";

import { SECControllerMethodExtensionName } from "../openapi";
import { RequestMethod, requestMethods } from "../types";

import { MethodHandler } from "./utils/method-handler";

import {
  operationHandlerJsonResponseMiddleware,
  operationHandlerFallbackResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
} from "./handler-middleware";
import { maybeParseJson } from "./express-middleware";
import { OperationHandlerMiddleware } from "./handler-types";

export interface RouteCreationContext {
  openApi: OpenAPIObject;
  path: string;
  pathItem: PathItemObject;
  method: string;
}

export type OperationHandlerFactory = (
  operation: OperationObject,
  ctx: RouteCreationContext
) => RequestHandler | null | undefined;

export interface CreateRouterOptions {
  /**
   * An array of factories to produce handlers for operation in the openapi schema.
   * The first factory to produce a non-null handler will be used.
   *
   * In addition to factories specified here, the last factory will always be one that produces a handler based on
   * the x-sec-controller-method extensions.
   */
  handlerFactories?: OperationHandlerFactory[];

  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   *
   * In addition to the middleware specified here, the last middleware will always be one that
   * processes json responses.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Middleware to apply to the express router.
   */
  expressMiddleware?: RequestHandler[];
}

/**
 * Create an express router to handle routes defined by the OpenAPI spec.
 * @param openApi The spec to create routes for.
 * @param opts Options on spec creation.
 * @returns A router for use in express to route the spec.
 */
export function createRouterFromSpec(
  openApi: OpenAPIObject,
  opts: CreateRouterOptions = {}
): Router {
  const factory = new RouterFromSpecFactory(openApi, opts);
  return factory.createRouterFromSpec();
}

class RouterFromSpecFactory {
  constructor(
    private _openApi: OpenAPIObject,
    private _opts: CreateRouterOptions = {}
  ) {
    if (!_opts.handlerFactories) {
      _opts.handlerFactories = [];
    }

    // Factories run in order, so our default should be last.
    _opts.handlerFactories.push(this._secOperationHandlerFactory.bind(this));

    if (!_opts.expressMiddleware) {
      _opts.expressMiddleware = [];
    }

    _opts.expressMiddleware.push(maybeParseJson);

    if (!_opts.handlerMiddleware) {
      _opts.handlerMiddleware = [];
    }

    // Middleware runs inside out, so our default should be first.
    _opts.handlerMiddleware.unshift(
      operationHandlerFallbackResponseMiddleware,
      operationHandlerJsonResponseMiddleware,
      operationHandlerResponseObjectMiddleware
    );
  }

  createRouterFromSpec(): Router {
    const router = Router({ mergeParams: true });

    for (const [path, pathItem] of Object.entries(this._openApi.paths ?? {})) {
      this._connectRouteHandlers(
        router,
        path,
        pathItem,
        this._openApi,
        this._opts
      );
    }

    return router;
  }

  private _secOperationHandlerFactory(
    operation: OperationObject,
    ctx: RouteCreationContext
  ): RequestHandler | null {
    const metadata = operation[SECControllerMethodExtensionName];
    if (!metadata) {
      return null;
    }

    var handler = new MethodHandler(
      ctx.path,
      ctx.pathItem,
      ctx.method,
      operation,
      this._opts
    );
    return handler.handle.bind(handler);
  }

  private _connectRouteHandlers(
    router: Router,
    path: string,
    pathItem: PathItemObject,
    openApi: OpenAPIObject,
    opts: CreateRouterOptions
  ) {
    for (const [method, operation] of methodsFromPathItem(pathItem)) {
      if (!requestMethods.includes(method as any)) {
        continue;
      }

      if (!operation) {
        continue;
      }

      let handler: RequestHandler | null | undefined;
      for (const handlerFactory of opts.handlerFactories!) {
        handler = handlerFactory(operation, {
          openApi,
          path,
          pathItem,
          method,
        });

        if (handler) {
          break;
        }
      }

      if (!handler) {
        return;
      }

      (router as any)[method](path, handler);
    }
  }
}

function methodsFromPathItem(
  pathItem: PathItemObject
): Entries<Pick<PathItemObject, RequestMethod>> {
  return Object.entries(pick(pathItem, requestMethods)) as Entries<
    Pick<PathItemObject, RequestMethod>
  >;
}
