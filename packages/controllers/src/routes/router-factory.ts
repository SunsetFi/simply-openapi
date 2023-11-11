import { Router, RequestHandler } from "express";
import {
  OpenAPIObject,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { Entries } from "type-fest";
import { pick } from "lodash";
import AJV, { Options as AjvOptions } from "ajv";
import addAjvFormats from "ajv-formats";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../openapi";
import { ControllerInstance, RequestMethod } from "../types";
import { requestMethods } from "../utils";

import { MethodHandler } from "./utils/method-handler";

import {
  operationHandlerJsonResponseMiddleware,
  operationHandlerFallbackResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
} from "./handler-middleware";
import { maybeParseJson } from "./express-middleware";
import { OperationHandlerMiddleware } from "./handler-types";
import { openAPIToExpressPath } from "../urls";

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
   * Options to pass to the AJV instance used to validate requests.
   */
  ajvOptions?: AjvOptions;

  /**
   * Resolver to convert a controller specified in the x-simply-controller-method extension into an instance of the controller object.
   * This can be used to integrate with DI, Proxy controller objects, or perform other transformations on the controllers.
   *
   * If not specified, the controller will be validated as a javascript object and used as-is.
   * @param controller The controller to resolve.
   * @returns The resolved controller
   */
  resolveController?: (
    controller: SOCControllerMethodExtensionData["controller"]
  ) => ControllerInstance;

  /**
   * Resolver to convert a method specified in the x-simply-controller-method extension into a function reference for invocation.
   * This can be used to wrap or otherwise transform the controller methods.
   *
   * If not specified, the default resolver will use functions as-is, and will seek to resolve a string to a function by method name on the controller instance.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: ControllerInstance,
    method: Function | string | symbol
  ) => Function;

  /**
   * An array of factories to produce handlers for operation in the openapi schema.
   * The first factory to produce a non-null handler will be used.
   *
   * In addition to factories specified here, the last factory will always be one that produces a handler based on
   * the x-simply-controller-method extensions.
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
   * Middleware to apply to the express router before the handler.
   */
  preExpressMiddleware?: RequestHandler[];

  /**
   * Middleware to apply to the express router after the handler.
   */
  postExpressMiddleware?: RequestHandler[];

  /**
   * If true, ensure that all responses are handled by the handler.
   * If false, no such check will be performed, and handlers that return undefined may leave requests hanging open.
   * @default true
   */
  ensureResponsesHandled?: boolean;
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
  private _ajv: AJV;
  constructor(
    private _openApi: OpenAPIObject,
    private _opts: CreateRouterOptions = {}
  ) {
    this._ajv = new AJV(
      _opts.ajvOptions ?? { useDefaults: true, coerceTypes: true }
    );
    addAjvFormats(this._ajv);

    // Add the full openapi schema for $ref resolution.
    this._ajv.addSchema(_openApi);

    if (!_opts.handlerFactories) {
      _opts.handlerFactories = [];
    }

    // Factories run in order, so our default should be last.
    _opts.handlerFactories.push(this._socOperationHandlerFactory.bind(this));

    if (!_opts.preExpressMiddleware) {
      _opts.preExpressMiddleware = [];
    }

    _opts.preExpressMiddleware.push(maybeParseJson);

    if (!_opts.handlerMiddleware) {
      _opts.handlerMiddleware = [];
    }

    _opts.handlerMiddleware.unshift(
      operationHandlerJsonResponseMiddleware,
      operationHandlerResponseObjectMiddleware
    );

    if (_opts.ensureResponsesHandled !== false) {
      _opts.handlerMiddleware.unshift(
        operationHandlerFallbackResponseMiddleware
      );
    }
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

  private _socOperationHandlerFactory(
    operation: OperationObject,
    ctx: RouteCreationContext
  ): RequestHandler | null {
    const metadata = operation[SOCControllerMethodExtensionName];
    if (!metadata) {
      return null;
    }

    var handler = new MethodHandler(
      this._openApi,
      ctx.path,
      ctx.pathItem,
      ctx.method,
      operation,
      this._ajv,
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

      const expressPath = openAPIToExpressPath(path);

      // Not working, routes arent registered.
      (router as any)[method](expressPath, handler);
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
