import {
  ParameterObject,
  ParameterStyle,
  SchemaObject,
} from "openapi3-ts/oas31";
import { OperationRequestContext } from "../../../../OperationRequestContext";

export type ValueDeserializerFunction = (
  ctx: OperationRequestContext,
  param: ParameterObject,
  schema: SchemaObject,
  rawValue: string | string[],
) => any | any[] | Record<string, any>;

export interface ValueStyleDeserializers {
  explode: ValueDeserializerFunction;
  nonExplode: ValueDeserializerFunction;
}

export type ValueStyleDeserializersMap = Record<
  ParameterStyle,
  ValueStyleDeserializers
>;
