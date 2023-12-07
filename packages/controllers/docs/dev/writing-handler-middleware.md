# Writing Handler Middleware

Similar to express middleware, @simply-openapi/controllers provides a middleware system to process requests. All of the library's functionality is built out in this middleware system, allowing you to provide your own middleware to override or alter behavior as-needed.

Middleware in @simply-openapi/controllers has multiple purposes:

- Validate that the request matches the OpenAPI specification
- Extract, preprocess, and transform data from the request object for consumption by the operation handlers.
- Handle operation handler return values, serializing them, and sending them back with the response
- Trapping and handling thrown errors.

## The basics of handler middleware

Handler middleware takes the form of an async function that is called with the context of a request. As with express, it is responsible for calling the next handler in the chain. It can then reinterpret the results of that call, either returning it to the next handler up the chain, or handling it directly and returning `undefined` to indicate that no further processing is needed.

For example, @simply-openapi/controllers provides this default handler, which is responsible for sending json object responses.

```typescript
import {
  RequestContext,
  OperationHandlerMiddlewareNextFunction,
} from "@simply-openapi/controllers";

export async function operationHandlerJsonResponseMiddleware(
  context: RequestContext,
  next: OperationHandlerMiddlewareNextFunction,
) {
  const result = await next();

  if (result === undefined) {
    // An undefined result indicates another middleware already handled the result and there is nothing further to do.
    return;
  }

  if (isJSON(result)) {
    // We understand this result, translate it for express.
    context.res.status(HttpStatusCodes.OK);
    context.res.setHeader("Content-Type", "application/json");
    context.res.json(result);

    // We handled the result, so forward `undefined` to let upstream middleware know the result was handled.
    return undefined;
  }

  // We don't know what this is, let the next handler up the chain interpret it.
  return result;
}
```

## Middleware basics

Middleware functions have a few traits they must abide by:

- A middleware function must be declared to take 2 arguments: A context, and a next function.
  - This must be done at the javascript level so that Function.arguments.length is equal to 2. This is because more advanced middleware forms are differentiated by this count. See [Middleware Factories](#middleware-factories).
- A middleware function must return a promise.

In general, a typical middleware will do prepratory work before the call, call and await next(), then process the returned result. It will then either forward that result as its own return value, or return `undefined` to communicate to up-chain middleware that the result has been handled.

## Middleware factories

Sometimes, middleware might want to do prepratory work on the method it is bound to. This can involve verifying the validity of the OpenAPI schema or pre-compiling json-schema validators so that the actual request is as fast as possible.

In cases like this, you can provide a middleware factory. A middleware factory is called for every operation that uses it at the time of router creation, and returns a middleware function to use for that operation.

Unlike middleware, a middleware factory function has a single context argument, and no next function. As with middleware, the function's arguments.length must be equal to 1 for it to be properly detected as a middleware factory function.
This factory context contains all the information about the schema, the operation, and the class and method being used to process the request. It also contains a `compileSchema` method, which takes a SchemaObject and returns a function that returns the input value coerced to the type, or throws an AJV ValidationError if the type does not match the schema.
