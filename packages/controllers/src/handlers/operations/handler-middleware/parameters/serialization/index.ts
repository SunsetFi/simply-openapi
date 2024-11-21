import {
  ParameterLocation,
  ParameterObject,
  ParameterStyle,
  SchemaObject,
} from "openapi3-ts/oas31";

import { resolveReference } from "../../../../../utils";

import { OperationRequestContext } from "../../../../OperationRequestContext";

import { nameOperationFromContext } from "../../../utils";

import { ValueStyleDeserializersMap } from "./types";

import {
  simpleExplodeValueDeserializer,
  simpleNonExplodeValueDeserializer,
} from "./simple";

import {
  pathLabelExplodeValueDeserializer,
  pathLabelNonExplodeValueDeserializer,
  pathMatrixExplodeValueDeserializer,
  pathMatrixNonExplodeValueDeserializer,
} from "./path";

import {
  queryFormExplodeValueDeserializer,
  queryFormNonExplodeValueDeserializer,
  queryPipeDelimitedExplodeValueDeserializer,
  queryPipeDelimitedNonExplodeValueDeserializer,
  querySpaceDelimitedExplodeValueDeserializer,
  querySpaceDelimitedNonExplodeValueDeserializer,
} from "./query";

const deserializers: ValueStyleDeserializersMap = {
  simple: {
    explode: simpleNonExplodeValueDeserializer,
    nonExplode: simpleExplodeValueDeserializer,
  },
  label: {
    explode: pathLabelExplodeValueDeserializer,
    nonExplode: pathLabelNonExplodeValueDeserializer,
  },
  matrix: {
    explode: pathMatrixExplodeValueDeserializer,
    nonExplode: pathMatrixNonExplodeValueDeserializer,
  },
  form: {
    explode: queryFormExplodeValueDeserializer,
    nonExplode: queryFormNonExplodeValueDeserializer,
  },
  spaceDelimited: {
    explode: querySpaceDelimitedExplodeValueDeserializer,
    nonExplode: querySpaceDelimitedNonExplodeValueDeserializer,
  },
  pipeDelimited: {
    explode: queryPipeDelimitedExplodeValueDeserializer,
    nonExplode: queryPipeDelimitedNonExplodeValueDeserializer,
  },
  deepObject: {
    explode: () => {
      throw new Error(
        "Deep object parameters are not supported.  Please put in a feature request on the github.",
      );
    },
    nonExplode: () => {
      throw new Error(
        "Deep object parameters are not supported.  Please put in a feature request on the github.",
      );
    },
  },
};

const defaultParamStyles: Record<ParameterLocation, ParameterStyle> = {
  path: "simple",
  query: "form",
  header: "simple",
  cookie: "form",
};

export function desieralizeParameterValue(
  ctx: OperationRequestContext,
  param: ParameterObject,
  rawValue: string | string[],
): any | any[] | Record<string, any> {
  // FIXME: Heavy resolving stuff as we parse.  This should be made to cache.
  // We can either cache it in the factory, or have resolveReference cache its results.
  const schema = resolveReference(
    ctx.spec,
    param.schema ?? ({ type: "string" } as SchemaObject),
  );
  if (!schema) {
    throw new Error(
      `Could not resolve parameter schema reference for ${param.in} parameter ${
        param.name
      } in operation ${nameOperationFromContext(ctx)}.`,
    );
  }

  let style: ParameterStyle | undefined = param.style;
  if (!style) {
    style = defaultParamStyles[param.in];
  }

  let explode: boolean | undefined = param.explode;
  if (explode === undefined) {
    // This contradics the docs, but is true to the spec:
    // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-use-with-schema
    explode = style === "form";
  }

  // TODO: allowReserved for query.
  // Can we even implement this?  I think express might supercede us and perform
  // translations anyway.

  const deserializerSet = deserializers[style];
  const deserializer = explode
    ? deserializerSet.explode
    : deserializerSet.nonExplode;

  return deserializer(ctx, param, schema, rawValue);
}
