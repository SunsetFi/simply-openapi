# Reducing interface and schema duplication with Zod

[Zod](https://zod.dev/) and its ecosystem is an excellent library that can allow you to produce both typescript typings and openapi schema objects from a single schema declaration. Schemas can be defined with its fluent declaration API, and it can then be induced to produce typescript typings from this. Then, the [Zod to Json Schema](https://github.com/StefanTerdell/zod-to-json-schema) library can produce our schema objects.

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const Widget = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1)
});

export type Widget = z.infer<Widget>();
export const widgetSchema = zodToJsonSchema(Widget);
```

Note: JSON-Schema, while very close to the OpenAPI SchemaObject spec, is not identical to it. While this is not a problem for @simply-openapi/controllers, whose validator supports both, this may be a problem with the documentation integrity and third party consumption of your OpenAPI specification.

Care should be taken that the json-schema produced by zod is compatible with the [OpenAPI spec](https://swagger.io/docs/specification/data-models/).

The conversion of json-schema to OpenAPI is a candidate to a further library in the @simply-openapi family of packages.
