import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  OperationObject,
  ParameterObject,
  PathItemObject,
  SchemaObject,
  ReferenceObject,
  OpenAPIObject,
  isReferenceObject,
} from "openapi3-ts/oas31";
import { NotFound, BadRequest } from "http-errors";
import { isObject, isFunction, mapValues, cloneDeep } from "lodash";
import AJV, { ValidateFunction } from "ajv";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  SOCControllerMethodHandlerArg,
  SOCControllerMethodHandlerBodyArg,
  SOCControllerMethodHandlerParameterArg,
  validateSOCControllerMethodExtensionData,
} from "../../openapi";
import { resolveReference, isNotNull } from "../../utils";

import { OperationHandlerMiddleware } from "../handler-types";

import { OperationHandlerMiddlewareManager } from "./OperationHandlerMiddlewareManager";

export interface MethodHandlerOpts {
  /**
   * Resolve a controller specified in the x-simply-controller-method extension into a controller object.
   * @param controller The controller to resolve.
   * @returns The resolved controller
   */
  resolveController?: (controller: object | string | symbol) => object;

  /**
   * Resolve a method specified in the x-simply-controller-method extension into a method.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: object,
    method: Function | string | symbol
  ) => Function;

  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   *
   * In addition to the middleware specified here, the last middleware will always be one that
   * processes json responses.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Middleware to apply to the express router before the request.
   */
  preExpressMiddleware?: RequestHandler[];

  /**
   * Middleware to apply to the express router after the request.
   */
  postExpressMiddleware?: RequestHandler[];
}

type ArgumentCollector = (req: Request, res: Response) => any;

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  private _controller: object;
  private _handler: Function;

  private _extensionData: SOCControllerMethodExtensionData;
  private _argumentCollectors: ArgumentCollector[];

  // Note: We have some redundancy here, in that we must get passed the spec to handle our own resolutions,
  // but we are also passed an external ajv instance that ALSO must have the spec registered with it to handle $refs
  // We currently have router-factory handle the spec registration in ajv, as we are sharing an instance.
  // We could opt to create an ajv instance internally, but that would produce a lot of duplicated instances
  // and it is probably more efficient to share just one.
  constructor(
    private _spec: OpenAPIObject,
    private _path: string,
    private _pathItem: PathItemObject,
    private _method: string,
    private _operation: OperationObject,
    private _ajv: AJV,
    private _opts: MethodHandlerOpts
  ) {
    let { resolveController, resolveHandler } = _opts;

    if (!resolveController) {
      resolveController = (controller) => {
        if (!isObject(controller)) {
          throw new Error(
            `Controller for operation ${
              _operation.operationId
            } handling \"${_method} ${_path}\" is not an object (got ${String(
              this._extensionData.controller
            )}).`
          );
        }

        return controller;
      };
    }

    if (!resolveHandler) {
      resolveHandler = (controller, method) => {
        if (
          (typeof method === "string" || typeof method === "symbol") &&
          typeof (controller as any)[method] === "function"
        ) {
          method = (controller as any)[method];
        }

        if (!isFunction(method)) {
          throw new Error(
            `Handler for operation \"${
              _operation.operationId
            }\" handling \"${_method} ${_path}\" is not a function (got ${String(
              this._extensionData.handler
            )}).`
          );
        }

        return method;
      };
    }

    this._extensionData = _operation[
      SOCControllerMethodExtensionName
    ] as SOCControllerMethodExtensionData;

    if (!this._extensionData) {
      throw new Error(
        `Operation ${_operation.operationId} is missing the ${SOCControllerMethodExtensionName} extension.`
      );
    }

    if (!validateSOCControllerMethodExtensionData(this._extensionData)) {
      throw new Error(
        `Operation ${
          _operation.operationId
        } has an invalid ${SOCControllerMethodExtensionName} extension: ${this._ajv.errorsText(
          validateSOCControllerMethodExtensionData.errors
        )}}`
      );
    }

    this._controller = this._opts.resolveController
      ? this._opts.resolveController(this._extensionData.controller)
      : (this._extensionData.controller as any);

    this._handler = resolveHandler(
      this._controller,
      this._extensionData.handler
    );

    this._argumentCollectors = (this._extensionData.handlerArgs ?? []).map(
      (arg) => this._buildArgumentCollector(arg, _operation)
    );

    // We use a router to handle the complex process of performing the middleware composition for us.
    if (this._opts.preExpressMiddleware) {
      this._selfRoute.use(...this._opts.preExpressMiddleware);
    }

    const invokeHandlerBound = this._invokeHandler.bind(this);
    this._selfRoute.use(invokeHandlerBound);

    if (this._opts.postExpressMiddleware) {
      this._selfRoute.use(...this._opts.postExpressMiddleware);
    }
  }

  handle(req: Request, res: Response, next: NextFunction) {
    this._selfRoute(req, res, next);
  }

  private async _invokeHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const args = this._argumentCollectors.map((collector) =>
        collector(req, res)
      );

      var middlewareManager = new OperationHandlerMiddlewareManager(
        this._handler.bind(this._controller)
      );
      // TODO: Is this order right?  We want to run our local middleware closer to the handling than the external middleware.
      middlewareManager.use(
        ...(this._extensionData.handlerMiddleware ?? []),
        ...(this._opts.handlerMiddleware ?? [])
      );

      // Call the handler function with the arguments
      // Our middleware will handle return values as needed.
      const result = await middlewareManager.run(
        {
          controller: this._controller,
          handler: this._handler,
          handlerArgs: args.map((arg, i) => {
            const handlerArg = this._extensionData.handlerArgs?.[i];
            if (!handlerArg) {
              return undefined;
            }
            return [arg, handlerArg];
          }),
          path: this._path,
          pathItem: this._pathItem,
          method: this._method,
          operation: this._operation,
          req,
          res,
        },
        args
      );

      if (result !== undefined) {
        throw new Error(
          `Handler returned a result of type ${typeof result} that was not consumed by a handler middleware.  Are you missing a handler middleware to handle the result type?`
        );
      }
    } catch (err: any) {
      next(err);
      return;
    }
  }

  private _buildArgumentCollector(
    arg: SOCControllerMethodHandlerArg | undefined,
    op: OperationObject
  ): ArgumentCollector {
    if (arg === undefined) {
      return () => undefined;
    }

    // TODO: Parameter interceptor.
    switch (arg.type) {
      case "request-raw":
        return (req: Request, _res) => req;
      case "response-raw":
        return (_req, res: Response) => res;
      case "openapi-parameter":
        return this._buildParameterCollector(arg, op);
      case "request-body":
        return this._buildBodyCollector(arg, op);
      default:
        throw new Error(`Unknown handler argument type ${(arg as any).type}.`);
    }
  }

  private _buildParameterCollector(
    arg: SOCControllerMethodHandlerParameterArg,
    op: OperationObject
  ): ArgumentCollector {
    // Find the parameter object in the OpenAPI operation
    const resolvedParams = (op.parameters ?? [])
      .map((param) => resolveReference(this._spec, param))
      .filter(isNotNull);

    const param: ParameterObject | undefined = resolvedParams.find(
      (param) => param.name === arg.parameterName
    ) as ParameterObject;

    if (!param) {
      throw new Error(
        `Parameter ${arg.parameterName} not found in operation parameters.  Either it was not defined or its $ref failed to resolve.`
      );
    }

    const checkRequired = (value: any) => {
      if (value === undefined) {
        if (param.in === "path") {
          throw new NotFound();
        } else if (param.required) {
          throw new BadRequest(
            `Query parameter ${arg.parameterName} is required.`
          );
        }
      }
    };

    let schema = param.schema;

    if (!schema) {
      return (req: Request, _res) => {
        const value =
          param.in === "path"
            ? req.params[arg.parameterName]
            : req.query[arg.parameterName];
        checkRequired(value);
        return value;
      };
    }

    if (isReferenceObject(schema)) {
      const ref = schema;
      schema = resolveReference(this._spec, schema)!;
      if (!schema) {
        throw new Error(
          `Could not resolve schema reference ${ref["$ref"]} of parameter ${param.name}.`
        );
      }
    }

    const validationSchema = {
      type: "object",
      properties: { value: schema },
    };
    const validator = this._ajv.compile(validationSchema);

    return (req: Request, _res) => {
      const value =
        param.in === "path"
          ? req.params[arg.parameterName]
          : req.query[arg.parameterName];

      checkRequired(value);

      const data = { value };

      if (!validator(data)) {
        if (param.in === "path") {
          throw new NotFound();
        } else {
          throw new BadRequest(
            `Query parameter ${
              arg.parameterName
            } is invalid: ${this._ajv.errorsText(validator.errors)}.`
          );
        }
      }

      return data.value;
    };
  }

  private _buildBodyCollector(
    arg: SOCControllerMethodHandlerBodyArg,
    op: OperationObject
  ): ArgumentCollector {
    if (!op.requestBody) {
      // Return the raw body, as no transformations were applied
      return (req) => req.body;
    }

    const requestBody = resolveReference(this._spec, op.requestBody);
    if (!requestBody) {
      throw new Error(
        `Could not resolve requestBody reference ${
          (op.requestBody as any)["$ref"]
        }.`
      );
    }

    if (!("content" in requestBody)) {
      // No specification of content, just return as-is
      return (req) => req.body;
    }

    const compileSchema = (
      mediaType: string,
      schema: SchemaObject | ReferenceObject | undefined
    ): ValidateFunction => {
      if (schema === undefined) {
        // We accept it, but didn't define a schema.  Let it through
        return (() => true) as any;
      }

      if (isReferenceObject(schema)) {
        const ref = schema;
        schema = resolveReference(this._spec, ref)!;
        if (!schema) {
          throw new Error(
            `Could not resolve schema reference ${ref["$ref"]} for requestBody media type ${mediaType}.`
          );
        }
      }

      return this._ajv.compile({
        type: "object",
        properties: { value: schema },
      });
    };

    const validators: Record<string, ValidateFunction> = mapValues(
      requestBody.content,
      ({ schema }, key) => compileSchema(key, schema)
    );

    return (req) => {
      if (requestBody.required && !req.body) {
        throw new BadRequest(`Request body is required.`);
      }

      const contentType = req.headers["content-type"] ?? "";

      const validator = pickContentType(contentType, validators);
      if (!validator) {
        if (contentType === "") {
          throw new BadRequest(`The Content-Type header is required.`);
        }

        throw new BadRequest(
          `Request body content type ${contentType} is not supported.  Supported content types: ${Object.keys(
            validators
          ).join(", ")}`
        );
      }

      // We will mutate the body through coersion, so clone it to avoid interfering
      // with the outside world.
      // Body might be a string or other primitive, so we need to wrap it for cocersion.
      const validateObj = { value: cloneDeep(req.body) };

      if (!validator(validateObj)) {
        throw new BadRequest(
          `Request body is invalid: ${this._ajv.errorsText(validator.errors)}.`
        );
      }

      return validateObj.value;
    };
  }
}

function pickContentType<T>(
  contentType: string | null,
  values: Record<string, T>
): T | null {
  if (contentType === "") {
    contentType = null;
  }

  if (contentType) {
    const semicolon = contentType.indexOf(";");
    if (semicolon !== -1) {
      contentType = contentType.substring(0, semicolon);
    }
  }

  if (!contentType) {
    return values["*/*"] ?? null;
  }

  const contentTypeParts = contentType.split("/");
  let chosen: T | null = null;
  let wildcardsUsed = 0;
  for (const [type, value] of Object.entries(values)) {
    const typeParts = type.split("/");
    if (typeParts[0] !== "*" && typeParts[0] !== contentTypeParts[0]) {
      continue;
    }

    if (typeParts[1] !== "*" && typeParts[1] !== contentTypeParts[1]) {
      continue;
    }

    let localWildcards =
      (typeParts[0] === "*" ? 1 : 0) + (typeParts[1] === "*" ? 1 : 0);
    if (!chosen || localWildcards < wildcardsUsed) {
      wildcardsUsed = localWildcards;
      chosen = value;
      if (localWildcards === 0) {
        break;
      }
    }
  }

  return chosen;
}
