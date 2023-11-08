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
  RequestBodyObject,
  SchemaObject,
  ReferenceObject,
} from "openapi3-ts/oas31";
import { NotFound, BadRequest } from "http-errors";
import { isObject, isFunction, mapValues, cloneDeep } from "lodash";
import AJV, { ValidateFunction } from "ajv";

import {
  SECControllerMethodExtensionData,
  SECControllerMethodExtensionName,
  SECControllerMethodHandlerArg,
  SECControllerMethodHandlerBodyArg,
  SECControllerMethodHandlerParameterArg,
  validateSECControllerMethodExtensionData,
} from "../../openapi";
import ajv from "../../ajv";

import { OperationHandlerMiddleware } from "../handler-types";

import { MiddlewareManager } from "./middleware-manager";

export interface MethodHandlerOpts {
  /**
   * The AJV schema validator to use for this method.,
   */
  ajv?: AJV;

  /**
   * Resolve a controller specified in the x-sec-controller-method extension into a controller object.
   * @param controller The controller to resolve.
   * @returns The resolved controller
   */
  resolveController?: (controller: object | string | symbol) => object;

  /**
   * Resolve a method specified in the x-sec-controller-method extension into a method.
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
   * Middleware to apply to the express router.
   */
  expressMiddleware?: RequestHandler[];
}

type ArgumentCollector = (req: Request, res: Response) => any;

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  private _ajv: AJV;

  private _controller: object;
  private _handler: Function;

  private _extensionData: SECControllerMethodExtensionData;
  private _argumentCollectors: ArgumentCollector[];

  constructor(
    private _path: string,
    private _pathItem: PathItemObject,
    private _method: string,
    private _operation: OperationObject,
    private _opts: MethodHandlerOpts
  ) {
    let { resolveController, resolveHandler } = _opts;

    this._ajv = _opts.ajv ?? ajv;

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
      SECControllerMethodExtensionName
    ] as SECControllerMethodExtensionData;

    if (!this._extensionData) {
      throw new Error(
        `Operation ${_operation.operationId} is missing the ${SECControllerMethodExtensionName} extension.`
      );
    }

    if (!validateSECControllerMethodExtensionData(this._extensionData)) {
      throw new Error(
        `Operation ${
          _operation.operationId
        } has an invalid ${SECControllerMethodExtensionName} extension: ${this._ajv.errorsText(
          validateSECControllerMethodExtensionData.errors
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
    if (this._opts.expressMiddleware) {
      this._selfRoute.use(...this._opts.expressMiddleware);
    }

    const invokeHandlerBound = this._invokeHandler.bind(this);
    this._selfRoute.all("/", invokeHandlerBound);
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

      var middlewareManager = new MiddlewareManager(
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
          handlerArgs: args.map((arg, i) => [
            arg,
            this._extensionData.handlerArgs![i],
          ]),
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
    arg: SECControllerMethodHandlerArg,
    op: OperationObject
  ): ArgumentCollector {
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
    arg: SECControllerMethodHandlerParameterArg,
    op: OperationObject
  ): ArgumentCollector {
    // Find the parameter object in the OpenAPI operation
    const param: ParameterObject | undefined = op.parameters?.find(
      (param) => "name" in param && param.name === arg.parameterName
    ) as ParameterObject;

    if (!param) {
      throw new Error(
        `Parameter ${arg.parameterName} not found in operation parameters.`
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

    if (!param.schema) {
      return (req: Request, _res) => {
        const value =
          param.in === "path"
            ? req.params[arg.parameterName]
            : req.query[arg.parameterName];
        checkRequired(value);
        return value;
      };
    }

    if (isReferenceObject(param.schema)) {
      // TODO: Get the full openapi as a reference and resolve this
      // TODO: Log what handler this is for.
      throw new Error(
        `Parameter ${arg.parameterName} has a schema reference.  References are not supported at this time.`
      );
    }

    const validationSchema = {
      type: "object",
      properties: { value: param.schema },
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
    arg: SECControllerMethodHandlerBodyArg,
    op: OperationObject
  ): ArgumentCollector {
    const requestBody = op.requestBody as RequestBodyObject | undefined;
    if (!requestBody) {
      // Return the raw body, as no transformations were applied
      return (req) => req.body;
    }

    if (!("content" in requestBody)) {
      throw new Error(
        `Request body does not have content.  References are not supported at this time.`
      );
    }

    const compileSchema = (
      mimeType: string,
      schema: SchemaObject | ReferenceObject | undefined
    ): ValidateFunction => {
      if (schema === undefined) {
        // We accept it, but didn't define a schema.  Let it through
        return (() => true) as any;
      }

      if (isReferenceObject(schema)) {
        // TODO: Get the full openapi as a reference and resolve this
        // TODO: Log what handler this is for.
        throw new Error(
          `Body type ${mimeType} has a schema reference.  References are not supported at this time.`
        );
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

      let contentType = req.headers["content-type"] ?? null;
      if (contentType) {
        const semicolon = contentType.indexOf(";");
        if (semicolon !== -1) {
          contentType = contentType.substring(0, semicolon);
        }
      }

      let validator: ValidateFunction | undefined;
      if (contentType) {
        validator = validators[contentType];
      }

      if (!validator) {
        validator = validators.default;
      }

      if (!validator) {
        throw new BadRequest(
          `Request body content type ${contentType} is not supported.`
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

function isReferenceObject<T>(obj: any): obj is ReferenceObject {
  return "$ref" in obj;
}
