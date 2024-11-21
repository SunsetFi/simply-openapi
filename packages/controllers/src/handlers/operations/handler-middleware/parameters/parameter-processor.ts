import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { NotFound, BadRequest } from "http-errors";
import { capitalize } from "lodash";
import { ValidationError } from "ajv";

import { resolveReference, schemaIncludesType } from "../../../../utils";

import {
  ValueValidatorFunction,
  errorObjectsToMessage,
} from "../../../../validation";

import { OperationRequestContext } from "../../../OperationRequestContext";

import { nameOperationFromContext } from "../../utils";
import {
  OperationMiddlewareFactory,
  OperationMiddlewareNextFunction,
} from "../types";
import { OperationMiddlewareFactoryContext } from "../OperationMiddlewareFactoryContext";

import { desieralizeParameterValue } from "./serialization";

export const parametersProcessorMiddlewareFactory: OperationMiddlewareFactory =
  (ctx) => {
    const processors = collectParameterProcessors(ctx);
    return (
      reqCtx: OperationRequestContext,
      next: OperationMiddlewareNextFunction,
    ) => {
      processParameters(reqCtx, processors);
      return next();
    };
  };

function collectParameterProcessors(ctx: OperationMiddlewareFactoryContext) {
  const parameters = ctx.parameters;

  const compileParamSchema = (param: ParameterObject) => {
    if (!param.schema) {
      return (value: any) => value;
    }

    const schema = resolveReference(ctx.spec, param.schema);
    if (!schema) {
      throw new Error(
        `Could not resolve parameter schema reference for ${
          param.in
        } parameter ${param.name} in operation ${nameOperationFromContext(
          ctx,
        )}.`,
      );
    }

    validateParameterDefinition(param, schema);

    // TODO: Validate we have a valid mapping of style and explode bot against
    // our schema and for our parameter location.
    /// https://swagger.io/docs/specification/v3_0/serialization/

    try {
      return ctx.validators.createParameterValidator(schema);
    } catch (e: any) {
      e.message = `Failed to compile schema for parameter ${param.in} ${
        param.name
      } in operation ${nameOperationFromContext(ctx)}: ${e.message}`;
      throw e;
    }
  };

  const processors = parameters.reduce(
    (acc, param) => {
      const processor = compileParamSchema(param);
      acc[param.name] = processor;
      return acc;
    },
    {} as Record<string, ValueValidatorFunction>,
  );

  return processors;
}

function validateParameterDefinition(
  param: ParameterObject,
  schema: SchemaObject,
) {
  if (schemaIncludesType(schema, "object")) {
    throw new Error(
      `Object parameters are not supported at this time.  Please file a github feature request.`,
    );
  }

  if (param.style === "deepObject") {
    throw new Error(
      `Deep object parameters are not supported at this time.  Please file a github feature request.`,
    );
  }
}

function processParameters(
  ctx: OperationRequestContext,
  processors: Record<string, ValueValidatorFunction>,
) {
  for (const param of ctx.parameters) {
    const processor = processors[param.name];

    const rawValue = getParameterValue(ctx, param);
    if (rawValue == null) {
      throwIfRequired(param);
      ctx.setRequestData(`openapi-parameter-${param.name}`, undefined);
      continue;
    }

    let deserializedValue = desieralizeParameterValue(ctx, param, rawValue);

    let validatedValue: any;
    try {
      validatedValue = processor(deserializedValue);
    } catch (e: any) {
      if (e instanceof ValidationError) {
        if (param.in === "path") {
          // Invalid paths are always "Not Found", as they are not a match.
          // Note: We might have a case where we have two paths with differing parameter patterns.
          // We MIGHT consider doing `throw undefined` to make express search for the next matching route.
          throw new NotFound();
        }

        let addend = "";
        if (e.errors) {
          addend = `: ${errorObjectsToMessage(e.errors)}`;
        }

        throw new BadRequest(
          `${capitalize(param.in)} parameter "${
            param.name
          }" is invalid${addend}.`,
        );
      }
    }

    ctx.setRequestData(`openapi-parameter-${param.name}`, validatedValue);
  }
}

function getParameterValue(
  ctx: OperationRequestContext,
  param: ParameterObject,
) {
  switch (param.in) {
    case "path":
      return ctx.getPathParam(param.name);
    case "query":
      return ctx.getQuery(param.name);
    case "cookie":
      return ctx.getCookie(param.name);
    case "header":
      return ctx.getHeader(param.name);
    default:
      throw new Error(`Unsupported parameter location: ${param.in}`);
  }
}

function throwIfRequired(param: ParameterObject) {
  if (!param.required && param.in !== "path") {
    return;
  }

  if (param.in === "path") {
    throw new NotFound();
  } else {
    throw new BadRequest(
      `${capitalize(param.in)} parameter "${param.name}" is required.`,
    );
  }
}
