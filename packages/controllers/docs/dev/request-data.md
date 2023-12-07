# Request Data

A fundimental part of @simply-openapi/controllers is that method handlers should operate on the preprocessed extracted data of a request, and be isolated from the nuances of the nature of web requests. This is accomplished by having middleware extract "request data" from the request object, and register it with the request context for use in the controller method via decorators on the arguments.

Request data is registered with the [RequestContext](../api-reference/contexts.md#requestcontext) using the `setRequestData` method, and can take any value. They are keyed by string values following a specific format.

## Request Data Keys

Request data keys take on a specific format.

The keys provided by this library are:

- `openapi-security-{schemeName}` - Stores the result of an [Authenticator](./adding-authentication.md#defining-authenticators) with the scheme name.
- `openapi-parameter-{paramName}` - Stores the validated and coerced value of the OpenAPI parameter of the given name.
- `openapi-body` - Stores the validated and coerced value of the request body, if any was present.

Additionaly, you may make your own request data keys by prefixing a key with `x-`.

## Implementing your own Request Data

The request data system is extensible, and allows you to define your own request data for consumption by your handlers. This is particularly useful if you have existing express middleware that attaches data to a request object that you wish to expose to your methods without needing to pass them the request object as a whole.

(In practice, authentication is normally done through [OpenAPI security schemes](./adding-authentication.md)).

### Setting the Request Data

Request data is extracted by [handler middleware](./writing-handler-middleware.md). You can use the `setRequestData` method of [RequestContext](../api-reference/contexts.md#requestcontext) to store the value you wish to associate with the request.

```typescript
import { OperationHandlerMiddleware } from "@simply-openapi/controllers";
import { Unauthorized } from "http-errors";

const requestUserAdapterMiddleware: OperationHandlerMiddleware = (
  ctx,
  next,
) => {
  const user = ctx.req.user;
  if (!user) {
    // Note: Any validation you want to perform against the data should be done
    // by your middleware as well.
    throw new Unauthorized();
  }

  ctx.setRequestData("x-user", user);

  // It is important that next() is called and its value is returned, otherwise
  // the request may be orphaned.
  return next();
};
```

### Retrieving the Request Data in a method

Once you have middleware registered and setting request data, you can retrieve it through decorators on the handler method.

Any request data can be retrieved using the `@BindRequestData` decorator, but you may wish to provide a more descriptive api by creating your own decorator with `createRequestDataDecorator`

```typescript

const RequestUser = createRequestDataDecorator("x-user");

...

class WidgetsController {
  @Get("/")
  getWidgets(
    @RequestUser()
    user: any
  ) {
    ...
  }
}
```

### Combining the middleware and request data parameters

Sometimes, request data may only be applicable to certain methods and not make sense when placed in a top-level handler middleware. In such cases, `@UseHandlerMiddleware` would typically be used on the relevant methods.

However, this would require developers to remember to apply the correct middleware for the correct decorators. To avoid this redundancy, you may consider combining both decorators into a single custom decorator:

```typescript
import {
  UseHandlerMiddleware,
  BindRequestData
} from "@simply-openapi/controllers";

function RequireUser() {
  return (target: any, propertyKey: string | symbol, argumentIndex: number) => {
    // Register our middleware for this method.
    UseHandlerMiddleware(requestUserAdapterMiddleware)(target, propertyKey);

    // Bind the argument to the request data.
    BindRequestData("x-user")(target, propertyKey, argumentIndex);
  }
}

class WidgetsController {
  @Get("/")
  getWidgets(
    @RequestUser()
    user: any
  ) {
    ...
  }
}
```

This allows the `@RequestUser` decorator to be used without needing to worry about including the middleware.

Note that if the decorator is used on multiple arguments of the same method, the handler middleware will execute multiple times for the same request. It is recommended to keep request decorator middleware global wherever possible.
