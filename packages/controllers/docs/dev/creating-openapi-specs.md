# Creating OpenAPI specs from Controllers

@simply-openapi/controllers treats OpenAPI specs as the source of truth for router generation, so the first step to functional code will be to generate this specification. You can do this either from scratch, or by amending an existing OpenAPI spec you may already have.

## Creating a new OpenAPI spec

If you do not have an existing OpenAPI spec, you can produce a new spec in its entirety by using `createOpenAPIFromControllers`

```typescript
import { createOpenAPIFromControllers } from "@simply-openapi/controllers";

import WidgetController from "./controllers/WidgetController";

const controllers = [new WidgetController()];

const spec = createOpenAPIFromControllers(
  {
    title: "My widget server",
    version: "1.0.0",
  },
  controllers,
);
```

You now have a full OpenAPI specification defining all of your API requirements, with additional metadata that can be used to produce an express router.

## Extending existing OpenAPI specs with controllers

In some cases, you will already have OpenAPI spec you want to link to controllers. For example, you may use references to predefined schemas, or you may be using the direct binding decorators to attach your controllers to existing spec.

In this case, use `addendOpenAPIFromControllers`

```typescript
import { addendOpenAPIFromControllers } from "@simply-openapi/controllers";
import { OpenAPIObject } from "openapi3-ts/oai31";

import WidgetController from "./controllers/WidgetController";

import { widgetSchema } from "./widgets";

const controllers = [new WidgetController()];

const existingSpec: OpenAPIObject = {
  openapi: "3.1.0",
  info: {
    title: "My widget server",
    version: "1.0.0",
  },
  components: {
    schemas: {
      Widget: widgetSchema,
    },
  },
};

const spec = addendOpenAPIFromControllers(existingSpec, controllers);
```

With this method, you can supply additional spec that might be consumed or referenced by the controllers. This is also the only way to use bound controllers and bound methods.

## Creating spec from constructors

It is not always easy to get instances of your classes, especially if you want to build your spec as a build time step or in a CI pipeline. In such cases, it would typically be necessary to mock out or stub services that these controllers depend on. This can get particularly gnarly in a DI environment or when controllers have constructor arguments that must be set to be instantiated.

To support easier generation of specs in these conditions, both functions support being passed the constructors of your controllers rather than instances.

```typescript
import { createOpenAPIFromControllers } from "@simply-openapi/controllers";

import WidgetController from "./controllers/WidgetController";

const controllerTypes = [WidgetController];

const spec = createOpenAPIFromControllers(
  {
    title: "My widget server",
    version: "1.0.0",
  },
  controllerTypes,
);
```

Note however that if you produce specs in this way, the metadata in the spec will point to the constructors and not to the instances. Because of this, extra effort will be needed on the route generation phase to configure the generator with information on how to produce instances of your classes. See [Resolving controllers](./creating-express-routes.md#resolving-controllers).

## Caveat: Empty controllers

To assist in detecting bugs, both functions will emit an error if they get passed an object that does not have any controller or web request decorators present. This is to catch issues where the wrong class or instance is passed in.

This behavior can be disabled by using the `ignoreEmptyControllers` option. The class will instead be ignored, and no information will be generated for it in the spec.

```typescript
import { createOpenAPIFromControllers } from "@simply-openapi/controllers";

import WidgetController from "./controllers/WidgetController";

class EmptyController {}

const controllers = [
  new WidgetController(),
  new EmptyController()
];

const spec = createOpenAPIFromControllers(
  {
    title: "My widget server",
    version: "1.0.0"
  },
  controllers
  { ignoreEmptyControllers: true }
);
```

## Next steps

Now that we have an OpenAPI spec, we can create a router, or export it for documentation.

{% content-ref url="creating-express-routes.md" %}
[creating-express-routes.md](creating-express-routes.md)
{% endcontent-ref %}

{% content-ref url="publishing-openapi-specs.md" %}
[publishing-openapi-specs.md](publishing-openapi-specs.md)
{% endcontent-ref %}
