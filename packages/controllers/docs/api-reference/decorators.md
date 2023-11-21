# Decorators

## Controller Decorators

### @Controller

Marks a controller as auto-generating OpenAPI spec.  Optionally supplies a common web url path and OpenAPI tags to be shared by all contained methods.

This decorator is optional, and can be omitted.

```typescript
import { Controller } from "@simply-openapi/controllers";

@Controller()
class RootController {}

@Controller("/health")
class HealthController {}

@Controller("/widgets", { tags: [ "widgets" ] })
class WidgetsController {}
```

### @BoundController

Marks a controller as being for "bound" methods.  That is, methods that target existing OpenAPI spec as opposed to generating their own.

As bound handlers directly reference existing OpenAPI spec, this decorator takes no arguments.

This decorator is optional.  Bound methods will function without it.  However, its presence will validate against non-bound methods being present inside the controller.
