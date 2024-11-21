import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { OperationRequestContext } from "../../../../OperationRequestContext";
import {
  schemaIncludesAnyTypeExcept,
  schemaIncludesType,
} from "../../../../../utils";

export function simpleExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  // HACK: Path param doesnt support arrays.
  if (param.in === "path") {
    // The only difference between this and nonExplode is object, and we currently
    // dont support object parameters.
    return simpleNonExplodeValueDeserializer(ctx, param, schema, rawValue);
  }

  // If we are not a path, then we are a header, according to the OpenAPI docs.

  // Note: The Swagger OpenAPI docs show exploded headers as just being
  // one value with comma seperated values.
  // However, the spec supersedes the docs, and nothing in the spec says
  // headers should NOT be exploded into multiple values.
  // However, I am confused on exactly what the discrepency is, as there
  // seems to be some talk that simple is intended to be ONLY comma seperated.

  // I am choosing to implement a real exploded header system assuming
  // that the swagger docs are wrong.

  // This is a gamble, but if they are identical, and the default is explode false,
  // who is going to try explode true?

  // Express will send multiple identical header values as an array, so
  // this may be an array or single value as the case may be.

  if (
    !Array.isArray(rawValue) &&
    schemaIncludesType(schema, "array") &&
    !schemaIncludesAnyTypeExcept(schema, "array")
  ) {
    // Consumer demands an array
    return [rawValue];
  }

  return rawValue;
}

export function simpleNonExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  if (Array.isArray(rawValue)) {
    throw new Error("Path parameters cannot accept array raw values.");
  }

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

  return rawValue;
}
