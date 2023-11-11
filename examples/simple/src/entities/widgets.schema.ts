import { SchemaObject } from "openapi3-ts/oas31";
import { Opaque } from "type-fest";

import { nonEmptyStringSchema, omitProperties } from "../json-schema";

export type WidgetId = Opaque<string, "WidgetId">;
const widgetIdRegex =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
export const widgetIdSchema: SchemaObject = {
  type: "string",
  format: "uuid",
};
export function widgetId(id: string): WidgetId {
  if (!widgetIdRegex.test(id)) {
    throw new Error(`Invalid widget ID: ${id}`);
  }
  return id as WidgetId;
}

export type WidgetDisposition = "happy" | "sad";
export const widgetDispositionSchema: SchemaObject = {
  type: "string",
  enum: ["happy", "sad"],
};

export interface Widget {
  id: WidgetId;
  name: string;
  disposition: WidgetDisposition;
}

export const widgetSchema: SchemaObject = {
  type: "object",
  properties: {
    id: widgetIdSchema,
    name: nonEmptyStringSchema,
    disposition: widgetDispositionSchema,
  },
  required: ["id", "name", "disposition"],
};

export type CreatableWidget = Omit<Widget, "id">;
export const creatableWidgetSchema = omitProperties(widgetSchema, "id");
