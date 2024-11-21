import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { NotFound } from "http-errors";

import {
  schemaIncludesAnyTypeExcept,
  schemaIncludesType,
} from "../../../../../../utils";

import { OperationRequestContext } from "../../../../../OperationRequestContext";

export function pathMatrixNonExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new Error("Path parameters cannot accept array raw values.");
  }

  const regex = getParamMatrixRegex(param);
  const matches = rawValue.match(regex);
  if (!matches) {
    throw new NotFound(
      `A possible route was found, but the path parameter "${param.name}" did not match the expected format.`,
    );
  }

  const [_, valueString] = matches;

  const parts = valueString.split(",");
  if (
    // We support arrays
    schemaIncludesType(schema, "array") &&
    // We do NOT support non-array items, or we have more than one
    // If we only have one item and the schema supports non-array items,
    // we want to return the value as a one-item.
    (!schemaIncludesAnyTypeExcept(schema, "array") || parts.length > 1)
  ) {
    return parts;
  }

  // We cannot assume commas here are array seperators and invalid, as they may be valid query data.
  // We return a string because its the validator's job to coerce the type.
  return rawValue;
}

export function pathMatrixExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new Error("Path parameters cannot accept array raw values.");
  }
  const regex = getParamMatrixRegex(param);
  const matches = Array.from(rawValue.matchAll(regex));
  if (matches.length === 0) {
    throw new NotFound(
      `A possible route was found, but the path parameter "${param.name}" did not match the expected "exploded matrix" openapi parameter serialization format.`,
    );
  }

  if (schemaIncludesType(schema, "array")) {
    // We support arrays
    if (!schemaIncludesAnyTypeExcept(schema, "array") || matches.length > 1) {
      // We have more than 1 item, or we only have one item but do not support non-arrays
      return matches.map(([, valueString]) => valueString.split(","));
    }
  }

  return matches[0][1];
}

const matrixParamRegexCache = new WeakMap<object, RegExp>();
function getParamMatrixRegex(param: ParameterObject): RegExp {
  let value = matrixParamRegexCache.get(param);
  if (!value) {
    value = new RegExp(`;${escapeRegex(param.name)}=([^;]+)`);
    matrixParamRegexCache.set(param, value);
  }

  return value;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
