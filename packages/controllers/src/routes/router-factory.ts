import { Router, RequestHandler } from "express";
import { OpenAPIObject, PathItemObject, SchemaObject } from "openapi3-ts/oas31";
import { Entries } from "type-fest";
import { pick, mapValues } from "lodash";

import {
  SOCControllerMethodExtensionData,
  stripSOCExtensions,
} from "../openapi";
import { ControllerInstance, RequestMethod } from "../types";
import { openAPIToExpressPath } from "../urls";
import { createOpenAPIAjv, isAjvInstance } from "../validation/ajv";

import { OperationContext, OperationRequestContext } from "../handlers";
import { responseValidationMiddlewareCreator } from "../handlers/operations/handler-middleware/responses/response-validator";

import {
  ValidatorFactories,
  ValidatorFactoriesCommon,
  ValidatorFactoryOption,
  createValueValidator,
} from "../validation";
import { requestMethods } from "../consts";

import { OperationHandlerFactory, OperationHandlerOptions } from "./types";
import { socOperationHandlerFactory } from "./handler-factories";
import { RouteCreationContext } from "./RouteCreationContext";

export interface ResponseValidationOptions {
  required: boolean;
  errorHandler?(error: Error, ctx: OperationRequestContext): void;
}

export interface CreateRouterOptions extends OperationHandlerOptions {
  /**
   * A collection of validator factory producers for use with validating data.
   */
  validatorFactories?: Record<keyof ValidatorFactories, ValidatorFactoryOption>;

  /**
   * Resolver to convert a controller specified in the x-simply-controller-method extension into an instance of the controller object.
   * This can be used to integrate with DI, Proxy controller objects, or perform other transformations on the controllers.
   *
   * If not specified, the controller will be validated as a javascript object and used as-is.
   * @param controller The controller to resolve.
   * @param ctx The operation context.
   * @returns The resolved controller
   */
  resolveController?: (
    controller: SOCControllerMethodExtensionData["controller"],
    ctx: OperationContext,
  ) => ControllerInstance;

  /**
   * Resolver to convert a method specified in the x-simply-controller-method extension into a function reference for invocation.
   * This can be used to wrap or otherwise transform the controller methods.
   *
   * If not specified, the default resolver will use functions as-is, and will seek to resolve a string to a function by method name on the controller instance.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @param ctx The operation context.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: ControllerInstance,
    method: Function | string | symbol,
    ctx: OperationContext,
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
   * Configures validation of the controller method responses according to the provided OpenAPI operation specification.
   */
  responseValidation?:
    | boolean
    | "required"
    | ((err: Error, ctx: OperationRequestContext) => void)
    | ResponseValidationOptions;
}

/**
 * Create an express router to handle routes defined by the OpenAPI spec.
 * @param openApi The spec to create routes for.
 * @param opts Options on spec creation.
 * @returns A router for use in express to route the spec.
 */
export function createRouterFromSpec(
  openApi: OpenAPIObject,
  opts: CreateRouterOptions = {},
): Router {
  const factory = new RouterFromSpecFactory(openApi, opts);
  return factory.createRouterFromSpec();
}

const defaultValidatorFactories: ValidatorFactoriesCommon = {
  createParameterValidator: (spec: OpenAPIObject) => {
    spec = stripSOCExtensions(spec);
    const ajv = createOpenAPIAjv(spec, {
      coerceTypes: true,
      useDefaults: true,
    });
    return (schema: SchemaObject) => {
      return createValueValidator(ajv, schema);
    };
  },
  createBodyValidator: (spec: OpenAPIObject) => {
    spec = stripSOCExtensions(spec);
    const ajv = createOpenAPIAjv(spec, {
      coerceTypes: false,
      useDefaults: true,
    });
    return (schema: SchemaObject) => {
      return createValueValidator(ajv, schema);
    };
  },
  createResponseValidator: (spec: OpenAPIObject) => {
    spec = stripSOCExtensions(spec);
    const ajv = createOpenAPIAjv(spec, {
      coerceTypes: false,
      useDefaults: false,
    });
    return (schema: SchemaObject) => {
      return createValueValidator(ajv, schema);
    };
  },
};

class RouterFromSpecFactory {
  private _validatorFactores: ValidatorFactories;

  constructor(
    private _openApi: OpenAPIObject,
    private _opts: CreateRouterOptions = {},
  ) {
    // We should use a more concrete type for the key, so that we do not need to `as any`
    // _validatorFactories below.
    // However, typescript is treating `keyof ValidatorFactories` as string | number.
    let validatorFactoriesSources: Record<string, ValidatorFactoryOption> = {
      ...defaultValidatorFactories,
      ...(_opts.validatorFactories ?? {}),
    };

    this._validatorFactores = mapValues(
      validatorFactoriesSources,
      (value, key) => {
        if (typeof value === "function") {
          return value(_openApi);
        } else if (value && typeof value === "object") {
          const ajv = isAjvInstance(value)
            ? value
            : createOpenAPIAjv(stripSOCExtensions(_openApi), value);
          return (schema: SchemaObject) => createValueValidator(ajv, schema);
        } else {
          throw new Error(`Invalid validator factory source for ${key}`);
        }
      },
    ) as any;

    if (!_opts.handlerFactories) {
      _opts.handlerFactories = [];
    }

    // Factories run in order, so our default should be last.
    _opts.handlerFactories.push(socOperationHandlerFactory);

    const responseValidation = this._opts.responseValidation;
    if (responseValidation) {
      const middleware = this._opts.handlerMiddleware
        ? [...this._opts.handlerMiddleware]
        : [];

      const strict =
        responseValidation === "required" ||
        (typeof responseValidation === "object" &&
          responseValidation.required) ||
        false;

      const errorHandler =
        (typeof responseValidation === "object" &&
          responseValidation.errorHandler) ||
        (typeof responseValidation === "function" && responseValidation) ||
        null;

      const responseValidationMiddleware = responseValidationMiddlewareCreator(
        strict,
        errorHandler,
      );

      middleware.unshift(responseValidationMiddleware);

      this._opts.handlerMiddleware = middleware;
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
        this._opts,
      );
    }

    return router;
  }

  private _connectRouteHandlers(
    router: Router,
    path: string,
    pathItem: PathItemObject,
    openApi: OpenAPIObject,
    opts: CreateRouterOptions,
  ) {
    for (const [method, operation] of methodsFromPathItem(pathItem)) {
      if (!requestMethods.includes(method as any)) {
        continue;
      }

      if (!operation) {
        continue;
      }

      const ctx = new RouteCreationContext(
        openApi,
        path,
        method,
        this._validatorFactores,
      );

      let handler: RequestHandler | null | undefined;
      for (const handlerFactory of opts.handlerFactories!) {
        handler = handlerFactory(ctx, this._opts);

        if (handler) {
          break;
        }
      }

      if (!handler) {
        return;
      }

      const expressPath = openAPIToExpressPath(path);

      (router as any)[method](expressPath, handler);
    }
  }
}

function methodsFromPathItem(
  pathItem: PathItemObject,
): Entries<Pick<PathItemObject, RequestMethod>> {
  return Object.entries(pick(pathItem, requestMethods)) as Entries<
    Pick<PathItemObject, RequestMethod>
  >;
}
