# Decorators

## Controller Decorators

### @Authenticator

Marks a controller as an authentication provider.

Authentication providers provide both OpenAPI specifications for security schemes, as well as handling implementations those specifications.

Note that as of the current version, a controller cannot be both an Authenticator, and a Controller or BoundController.

For more information, see [Adding Authentication](../dev/adding-authentication.md).

```typescript
import {
  Authenticator,
  AuthenticationController,
  RequestContext,
} from "@simply-openapi/controllers";

@Authenticator("MyAuthentication", {
  type: "http",
  scheme: "basic",
})
class MyAuthentication implements AuthenticationController {
  authenticate(value: any, scopes: string[], ctx: RequestContext) {
    if (value.username === "myself" && value.password === "swordfish") {
      return true;
    }

    return false;
  }
}
```

### @BoundController

Marks a controller as being for "bound" methods. That is, methods that target existing OpenAPI spec as opposed to generating their own.

As bound handlers directly reference existing OpenAPI spec, this decorator takes no arguments.

This decorator is optional. Bound methods will function without it. However, its presence will validate against non-bound methods being present inside the controller.

```typescript
import { BoundController } from "@simply-openapi/controllers";

@BoundController()
class WidgetsController {}
```

### @Controller

Marks a controller as auto-generating OpenAPI spec. Optionally supplies a common web url path and OpenAPI tags to be shared by all contained methods.

This decorator is optional, and can be omitted.

```typescript
import { Controller } from "@simply-openapi/controllers";

@Controller()
class RootController {}

@Controller("/health")
class HealthController {}

@Controller("/widgets", { tags: ["widgets"] })
class WidgetsController {}
```

### @OpenAPI

Applies a fragment of OpenAPI specification to the resulting spec generated from `createOpenAPIFromControllers` `addendOpenAPIFromControllers`.

This decorator allows you to specify custom OpenAPI specification that will be added to the root spec when this controller is used.
This decorator takes a partial spec at the root level. The specification does not need to be related to the controller this decorator is placed on.

The final specification will be a merger of all specification sources. This includes the `@OpenAPI` decorator, as well as all other decorators that may contribute their own specification.
Note that the merger method will concatenate arrays, so two specs targeting the same array property will result in the concatenation of both arrays.

It is important to note that the OpenAPI provided in this decorator will have no direct connection to the controller it is attached to. However, if you define specification
for schemas, paths, parameters, or other constructs that have handlers attached, that specification will still be interpreted and validated against for those handlers.

Note: This decorator is also valid for individual handler methods, but as with controllers, it will still only target the global spec and not be contextual to the method.

```typescript
import { OpenAPI, Get, JsonResponse } from "@simply-openapi/controllers";

@OpenAPI({
  components: {
    schemas: {
      WidgetSchema: {
        type: "object",
      },
    },
  },
})
class WidgetsController {
  @Get("/")
  @JsonResponse(200, { type: "array", items: { $ref: "#/components/schemas/WidgetSchema" }})
  async getWidgets() {
    ...
  }
}
```

### @UseHandlerMiddleware

Defines a handler middleware to be used for a controller.

Handler middleware is similar to express middleware, but is invoked wrapping your method handler calls, and can be used to reinterpret responses from handlers. It is useful for adding conditional
execution logic, or reinterpreting responses based on http concerns such as Accept headers.

Using this decorator on a controller will apply the middleware to all methods in that controller.
This decorator can also be applied to individual methods, to restrict the middleware to only those methods.

For more information, see [Writing Handler Middleware](../dev/writing-handler-middleware.md).

```typescript
import { Controller, UseHandlerMiddleware } from "@simply-openapi-controllers";

@UseHandlerMiddleware(async (ctx, next) => {
  const result = await next();
  if (ctx.headers["accept"] === "text/xml") {
    const asXml = jsonToXml(result);
    ctx.res.setHeader("Content-Type", "text/xml")
    ctx.res.send(asXml);
    return undefined;
  }

  return result;
})
class WidgetsController {
  ...
}
```

## Method Decorators

### @Get, @Post, @Put, @Patch, @Delete, @Head, @Options, @Trace

This family of decorators describes a new path and method in the OpenAPI spec.

The first argument is required, and takes the path this method will exist on. This path will be appended to the path of the containing controller, if present, and any other path specified by routers preceeding
the auto-generated router. The path may include both express style params, and OpenAPI style params (`:path_param` and `{path_param}` respectively).

The second argument is optional, and takes a partial [OpenAPI Operation](https://swagger.io/docs/specification/paths-and-operations/) object to append to this method. In general, this is intended
to be used for tags and descriptions. However this can take anything including parameters, request bodies, and response content. If such things are specified here, they will still be validated and used by the generated router.

```typescript
import { Get } from "@simply-openapi/controllers"

class WidgetsController {
  @Get("/widgets/{widget_id}", { tags: ["Widgets"], description: "Gets a widget by id" })
  getWidgetById(...) {
    ...
  }
}
```

### @BindOperation

Specifies that the decorated method is a handler for the pre-existing operation defined in the OpenAPI specification.

The one and only argument should be the operationId of the operation this method should handle.

See also:

- [@BindParam](#@BindParam) - receive parameters from the bound operation.

```typescript
import { BindOperation } from "@simply-openapi/controllers";

class WidgetsController {

  @BindOperation("widgets.get")
  getWidgets() {
    ...
  }
}
```

### @OpenAPI

Applies a fragment of OpenAPI specification to the resulting spec generated from `createOpenAPIFromControllers` `addendOpenAPIFromControllers`.

This is the same decorator as for controllers. Both take a root partial OpenAPI object to merge, and neither are scoped to the class or method they are attached to.

If you want to target the operation object of a method, you may want to use [@OpenAPIOperation](#OpenAPIOperation) instead.

### @OpenAPIOperation

Applies a fragment of an [OpenAPI Operation](https://swagger.io/docs/specification/paths-and-operations/) to the operation defined by this method. This can be used to further document the method,
or to add additional validation not specified by other decorators on the method.

Note that any specification added by this decorator that can be validated, will be validated by the router. This means if you add a required parameter using this decorator, that parameter will be required and validated
even if no other decorator references it.

```typescript
import { Get, OpenAPIOperation } from "@simply-openapi/controllers";

class WidgetsController {
  @Get("/")
  @OpenAPIOperation({
    externalDocs: {
      description: "Learn more about user operations provided by this API.",
      url: "http://api.example.com/docs/user-operations/"
    }
  })
  getWidgets() {
    ...
  }
}
```

### @RequireAuthentication

Specify that the user must be authorized with a given security scheme in order to make use of this operation.

The first argument takes a name of a security scheme, or a constructor of an authorization controller (a controller decorated with `@Authorization`). The second argument takes an array of scopes that must be met for this method to be used.

The generated router will authenticate the user against this authentication scheme, and only invoke the handler if the user is authorized. If the user is unauthorized, a 401 will be returned (or any other http-error thrown by the authenticator.)

```typescript
import { Get, RequireAuthentication } from "@simply-openapi/controllers"

class WidgetsController {
  @Get("/")
  @RequireAuthentication("MyAuthentication", ["widgets.read"])
  getWidgets() {
    ...
  }
}
```

### @Response

Describe an available response from this method.

This decorator is a catch-all for any sort of response you want to describe in the OpenAPI schema. There are easier to use, more specific response decorators available:

- [@JsonResponse](#@JsonResponse) - For JSON type responses.
- [@EmptyResponse](#@EmptyResponse) - For responses without any return body.

The first argument to `@Response` is the status code of the response to document.

The second argument is an object mapping content-types to their documentation. This is done in the form of [Response Media Types](https://swagger.io/docs/specification/describing-responses/).

The third argument is optional, and takes a partial OpenAPI response object to merge at the response level.

```typescript
import { Get, Response } from "@simply-openapi/controllers"

class WidgetsController {
  @Get("/")
  @Response(
    200,
    {
      "application/json": {
        schema: {
          type: "array",
        }
      },
    },
    { description: "All widgets" }
  )
  getAllWidgets() {
    ...
  }
}
```

### @JsonResponse

Describes a json response from this method.

This is a helper decorator for the simplified use case where you want to document a JSON return type.

The first argument is the status code to document.

The second argument is an [OpenAPI SchemaObject](https://swagger.io/docs/specification/data-models/) describing the response.

The third argument is optional, and takes a partial OpenAPI response object to merge at the response level.

```typescript
import { Get, JsonResponse } from "@simply-openapi/controllers"

class WidgetsController {
  @Get("/")
  @JsonResponse(
    200,
    { type: "array" }
    { description: "All widgets" }
  )
  getAllWidgets() {
    ...
  }
}
```

### @EmptyResponse

Describes a response that has no content.

This is a helper decorator for the simplified use case where you have a response that returns no content.

The first argument is the status code to document.

The second argument is optional, and takes a partial OpenAPI response object to merge at the response level.

```typescript
import { Post, EmptyResponse } from "@simply-openapi/controllers"

class WidgetsController {
  @Post("/")
  @EmptyResponse(
    201,
    { description: "The widget has been created" }
  )
  createWidget(...) {
    ...
  }
}
```
