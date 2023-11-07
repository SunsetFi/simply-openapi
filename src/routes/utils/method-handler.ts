import { NextFunction, Request, Response, Router } from "express";
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

import ajv from "../../ajv";

import {
  SECControllerMethodExtensionData,
  SECControllerMethodExtensionName,
  SECControllerMethodHandlerArg,
  SECControllerMethodHandlerBodyArg,
  SECControllerMethodHandlerParameterArg,
  validateSECControllerMethodExtensionData,
} from "../../openapi/extensions/SECControllerMethod";
import { MiddlewareManager } from "./middleware-manager";
import { CreateRouterOptions } from "../router-factory";
import { request } from "http";
import { ValidateFunction } from "ajv";

type ArgumentCollector = (req: Request, res: Response) => any;

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  private _controller: object;
  private _handler: Function;

  private _extensionData: SECControllerMethodExtensionData;
  private _argumentCollectors: ArgumentCollector[];

  constructor(
    private _path: string,
    private _pathItem: PathItemObject,
    private _method: string,
    private _operation: OperationObject,
    private _opts: CreateRouterOptions
  ) {
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
        } has an invalid ${SECControllerMethodExtensionName} extension: ${ajv.errorsText(
          validateSECControllerMethodExtensionData.errors
        )}}`
      );
    }

    this._controller = this._opts.resolveController
      ? this._opts.resolveController(this._extensionData.controller)
      : (this._extensionData.controller as any);
    if (!isObject(this._controller)) {
      throw new Error(
        `Controller for operation ${_operation.operationId} (${String(
          this._extensionData.controller
        )}) is not an object.`
      );
    }

    this._handler = this._opts.resolveHandler
      ? this._opts.resolveHandler(this._controller, this._extensionData.handler)
      : (this._extensionData.handler as any);

    if (!isFunction(this._handler)) {
      throw new Error(
        `Handler for operation ${_operation.operationId} (${String(
          this._extensionData.handler
        )}) is not a function.`
      );
    }

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
      case "http-request":
        return (req: Request, _res) => req;
      case "http-response":
        return (_req, res: Response) => res;
      case "openapi-parameter":
        return this._buildParameterCollector(arg, op);
      case "http-body":
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
    const validator = ajv.compile(validationSchema);
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
            `Query parameter ${arg.parameterName} is invalid: ${ajv.errorsText(
              validator.errors
            )}.`
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

    function compileSchema(
      mimeType: string,
      schema: SchemaObject | ReferenceObject | undefined
    ): ValidateFunction {
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
      return ajv.compile(schema);
    }

    const validators: Record<string, ValidateFunction> = mapValues(
      requestBody.content,
      ({ schema }, key) => compileSchema(key, schema)
    );

    return (req) => {
      const contentType = req.headers["content-type"] ?? "*/*";
      const validator = validators[contentType] ?? validators["*/*"];
      if (!validator) {
        throw new BadRequest(
          `Request body content type ${contentType} is not supported.`
        );
      }

      // We will mutate the body through coersion, so clone it to avoid interfering
      // with the outside world.
      const body = cloneDeep(req.body);

      if (!validator(body)) {
        throw new BadRequest(
          `Request body is invalid: ${ajv.errorsText(validator.errors)}.`
        );
      }

      return body;
    };
  }
}

function isReferenceObject<T>(obj: any): obj is ReferenceObject {
  return "$ref" in obj;
}
