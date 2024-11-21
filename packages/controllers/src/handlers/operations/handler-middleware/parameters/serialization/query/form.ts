import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { BadRequest } from "http-errors";

import { OperationRequestContext } from "../../../../../OperationRequestContext";
import {
  schemaIncludesAnyTypeExcept,
  schemaIncludesType,
} from "../../../../../../utils";

export function queryFormExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  // Express gives us an array value automatically for exploded query params.

  if (schemaIncludesType(schema, "array")) {
    if (Array.isArray(rawValue)) {
      return rawValue;
    }

    if (!schemaIncludesAnyTypeExcept(schema, "array")) {
      // Do not support non-arrays, and we are a single value.
      // Convert to array
      return [rawValue];
    }
  }

  if (Array.isArray(rawValue)) {
    throw new BadRequest(
      `Only one instance of the query parameter ${param.name} is allowed.`,
    );
  }

  return rawValue;
}

export function queryFormNonExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new BadRequest(
      `Only one instance of the query parameter ${param.name} is allowed.`,
    );
  }

  const values = rawValue.split(",");
  if (
    // We support arrays
    schemaIncludesType(schema, "array") &&
    // We do NOT support non-array items, or we have more than one
    // If we only have one item and the schema supports non-array items,
    // we want to return the value as a one-item.
    (!schemaIncludesAnyTypeExcept(schema, "array") || values.length > 1)
  ) {
    return values;
  }

  return rawValue;
}
