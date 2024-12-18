# Reducing interface and schema duplication

While the most obvious way to use this library is to write JSON Schema by hand, this leaves you either without interfaces to describe your types, or requires you to keep your JSON Schema and interfaces in sync.

This is less than ideal, and breaks away from the single source of truth principle this library was built on. Thankfully, there are a multitude of third party libraries that let you write your types once and derive both the schema and interfaces from them.

## @sinclair/typebox

[Typebox](https://www.npmjs.com/package/@sinclair/typebox) provides an elegant way to produce both interfaces and JSON Schema from a single source. Since it allows you to pass custom JSON Schema at each level, it allows for a full description of your types using JSON Schema and OpenAPI Schema directives that might not be natively available in other schema generators.

```typescript
import { Type, Static } from "@sinclair/typebox";

export const widgetIdSchema = Type.Integer({
  description: "The ID of the widget",
  minimum: 0,
});
export type WidgetId = Static<typeof widgetIdSchema>;

export const widgetSchema = Type.Object({
  id: widgetIdSchema,
  name: Type.String({
    description: "The name of the widget",
    minLength: 1,
  }),
});
export type Widget = Static<typeof widgetSchema>;
```

Typebox also allows more concise schema transformation to describe variations of the base schema. Array results, ID-omitting POST bodies, and partial PATCH bodies are all easily described:

```typescript
import { Type, Static } from "@sinclair/typebox";

const widgetArraySchema = Type.Array(widgetSchema);
type WidgetArray = Static<typeof widgetArraySchema>;

const creatableWidgetSchema = Type.Omit(widgetSchema, ["id"]);
type CreatableWidget = Static<typeof creatableWidgetShema>;

const patchableWidgetSchema = Type.Partial(
  Type.Omit(widgetSchema, ["id"])
);
type PatchableWidget = Static<typeof patchableWidgetSchema>;

@Controller("/widgets", { tags: [ "Widgets" ]})
export class WidgetsController {
  @Get("/")
  @JsonResponse(200, widgetArraySchema)
  async getWidgets() {
    ...
  }

  @Post("/")
  @JsonResponse(201, widgetSchema)
  async createWidget(
    @RequiredJsonBody(creatableWidgetSchema)
    body: CreatableWidget
  ) {
    ...
  }

  @Patch("/{widget_id}")
  @JsonResponse(200, widgetSchema)
  async patchWidget(
    @RequiredJsonBody(patchableWidgetSchema)
    body: PatchableWidget
  ) {
    ...
  }
}
```

## Zod

[Zod](https://zod.dev/) also provides a means of producing types and schemas, when paired with the [Zod to Json Schema](https://github.com/StefanTerdell/zod-to-json-schema) library.

A benefit of using Zod over Typebox is that Zod is first and formost a validation system. While @simply-openapi/controllers already validates against the JSON Schema defined in the OpenAPI spec, you may wish to retain your own validators for use elsewhere. In this case, zod is a good choice. However, as it cannot specify custom JSON Schema directives, it is unable to provide OpenAPI descriptions and is limited to those validation rules that `zod-to-json-schema` supports.

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const WidgetValidator = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1)
});

export type Widget = z.infer<WidgetValidator>();
export const widgetSchema = zodToJsonSchema(WidgetValidator);
export function validateWidgetOrThrow(widget: Widget) {
  WidgetValidator.parse(widget);
}
```
