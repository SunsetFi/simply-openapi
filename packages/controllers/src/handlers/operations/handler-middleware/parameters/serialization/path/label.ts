import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { NotFound } from "http-errors";

import {
  schemaIncludesAnyTypeExcept,
  schemaIncludesType,
} from "../../../../../../utils";

import { OperationRequestContext } from "../../../../../OperationRequestContext";

export function pathLabelExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new Error("Path parameters cannot accept array raw values.");
  }

  if (!rawValue.startsWith(".")) {
    // ...Maybe this actually maps to a different path we don't know about?
    // If we wanted to be super risky, we could use `throw undefined`
    // to tell express to try the next matching route.
    // Its a little unusual to complain about formats in a NotFound, but the path
    // technically does not exist as the url is unrecognized.
    throw new NotFound(
      `A possible route was found, but the path parameter "${param.name}" did not match the expected "exploded label" openapi parameter serialization format.`,
    );
  }

  rawValue = rawValue.slice(1);
  const parts = rawValue.split(".");

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

  // Not an array, and we don't support objects (which is enforced earlier).
  return rawValue;
}

export function pathLabelNonExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new Error("Path parameters cannot accept array raw values.");
  }

  if (!rawValue.startsWith(".")) {
    // ...Maybe this actually maps to a different path we don't know about?
    // If we wanted to be super risky, we could use `throw undefined`
    // to tell express to try the next matching route.
    // Its a little unusual to complain about formats in a NotFound, but the path
    // technically does not exist as the url is unrecognized.
    throw new NotFound(
      `A possible route was found, but the ${param.name} path parameter did not match the expected "label" openapi parameter serialization format.`,
    );
  }

  rawValue = rawValue.slice(1);
  // This is the key difference between explode and non-explode labels.
  // Non explode uses commas after the initial dot.
  const parts = rawValue.split(",");

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

  // Not an array, and we don't support objects (which is enforced earlier).
  return rawValue;
}
