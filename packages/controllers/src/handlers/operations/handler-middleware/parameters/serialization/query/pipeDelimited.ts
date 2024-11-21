import { ParameterObject, SchemaObject } from "openapi3-ts/oas31";
import { BadRequest } from "http-errors";

import { OperationRequestContext } from "../../../../../OperationRequestContext";

export function queryPipeDelimitedExplodeValueDeserializer(
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  // We absolutely only support arrays in this mode... What do we do about misconfigured
  // schemas???
  // Just return our array and let the validator crash.
  // TODO: We NEED to pre-validate this on the factory step!

  // Express gives us an array value automatically for exploded query params.
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  return [rawValue];
}

export function queryPipeDelimitedNonExplodeValueDeserializer(
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

  const values = rawValue.split("|");
  // space delimited only supports arrays.
  // If the schema doesn't agree, let it choke.
  return values;
}
