# Reducing interface and schema duplication

While the most obvious way to use this library is to write JSON Schema by hand, this leaves you either without interfaces to describe your types, or requires you to keep your JSON Schema and interfaces in sync.

This is less than ideal, and breaks away from the single source of truth principle this library was built on. Thankfully, there are a multitude of third party libraries that let you write your types once and derive both the schema and interfaces from them.

## @sinclair/typebox

Typebox provides an elegant way to produce both interfaces and JSON Schema from a single source. As it allows you to pass custom JSON Schema at each level, it allows for a full description of your types using JSON Schema and OpenAPI Schema directives that might not be natively available in other schema generators.

```typescript
import { Type, Static } from '@sinclair/typebox'

const widgetIdSchema = Type.Integer({ minimum: 0, description: "The ID of the widget" });
type WidgetId = Static<typeof widgetIdSchema>;

const widgetSchema = Type.Object({
  id: widgetIdSchema,
  name: Type.String({ minLength: 1, description: "The name of the widget" }),
});
type Widget = Static<typeof widgetSchema>;

class WidgetsController {
  @Get("/{widget_id}", , { description: "Gets a widget by ID" })
  @JsonResponse(200, widgetSchema)
  getWidget(
    @PathParam("widget_id", widgetIdSchema, { description: "The ID of the widget to get" })
    widgetId: WidgetId
  ): Promise<Widget> {
    ...
  }
}

```

## Zod

[Zod](https://zod.dev/) also provides a means of producing types and schemas, when paired with the [Zod to Json Schema](https://github.com/StefanTerdell/zod-to-JSON Schema) library.

A benefit of using Zod over Typebox is that Zod is first and formost a validation system. While @simply-openapi/controllers already validates against the JSON Schema defined in the OpenAPI spec, you may wish to retain your own validators for use elsewhere. In this case, zod is a good choice. However, as you cannot specify custom JSON Schema directives, you are limited to those validation rules that `zod-to-JSON Schema` supports.

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-JSON Schema";

export const Widget = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1)
});

export type Widget = z.infer<Widget>();
export const widgetSchema = zodToJsonSchema(Widget);
```
