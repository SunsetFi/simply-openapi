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

In general, a typical middleware will do prepratory work before the call, extract and register data for the controller method arguments, call and await next(), then process the returned result. It will then either forward that result as its own return value, or return `undefined` to communicate to up-chain middleware that the result has been handled.

### The Middleware Context

The first argument to the middleware, its context, contains all the information needed to proces the response, as well as functions to influence the execution of the controller method that will handle it. Some useful properties are:

- `req` - The express request.
- `res` - The express response.
- `spec` - The top level OpenAPI specification.
- `method` - The request / operation method.
- `path` - The request / operation path (as it exists in the OpenAPI spec).
- `operation` - The OpenAPI [Operation Object](https://swagger.io/specification/#operation-object) for the method of this request.
- `getRequestData` - A method to get data registered for use with method decorators.
- `setRequestData` - A method to set data registerd for use with method decorators.

Many more properties and methods are available to further simplify interacting with the request. For a full list, see docuemntation for the [RequestContext](../api-reference/contexts.md#requestcontext).

### Request Data

A fundimental part of @simply-openapi/controllers is that method handlers should operate on the preprocessed extracted data of a request, and be isolated from the nuances of the nature of web requests. This is accomplished by having middleware extract "request data" from the request object, and register it with the execution context for use in the controller method via decorators on the arguments.

Request data is registered with the request context using the `setRequestData` method, and can take any value. They are keyed by string values following a specific format.

The default request data keys supported by this library are:

- `openapi-security-{schemeName}` - Stores the result of an [Authenticator](./adding-authentication.md#defining-authenticators), and is accessed by `@RequireAuthentication` and `@BindSecurity`.
- `openapi-parameter-{paramName}` - Stores the validated and coerced value of a parameter declared in the OpenAPI spec. It is accessed by `@BindParam`, `@QueryParam`, `@PathParam`, `@HeaderParam`, and `@CookieParam`
- `openapi-body` - Stores the validated and coersed body of the request. Accessed by `@Body` and variants.

Additionaly, you may make your own request data keys by prefixing a key with `x-`, and access them with `@BindRequestData`.

## Middleware factories

Sometimes, middleware might want to do prepratory work on the method it is bound to. This can involve verifying the validity of the OpenAPI schema or pre-compiling json-schema validators so that the actual request is as fast as possible.

In cases like this, you can provide a middleware factory. A middleware factory is called for every operation that uses it at the time of router creation, and returns a middleware function to use for that operation.

Unlike middleware, a middleware factory function has a single context argument, and no next function. As with middleware, the function's arguments.length must be equal to 1 for it to be properly detected as a middleware factory function.
This factory context contains all the information about the schema, the operation, and the class and method being used to process the request. It also contains a `compileSchema` method, which takes a SchemaObject and returns a function that returns the input value coerced to the type, or throws an AJV ValidationError if the type does not match the schema.

## Default middleware

All of the default behavior of @simply-openapi/controllers is implemented through middleware and middleware factories. The default middleware performs the following in order:

- Processes the global and operation-specific `security` OpenAPI directives. Improper requests are denied, and proper requests have their authentication result registered as request data for the `@RequireAuthentication` and `@BindSecurity` decorators.
- Processes the path and operation `parameters` OpenAPI directives. Invalid requests are rejected, and values are coerced and registered for the various parameter-centric decorators (`@QueryParam`, `@PathParam`, and similar).
- Process the `requestBody` OpenAPI directive. Data is validated and coersed according to its media type, and registered for the `@Body` decorator and its variants.
- If no further middleware has processed the handler result, the handler result is checked to see if it is a JSON object. If so, it is sent as the response body and the Content-Type header is set to `application/json` .
- If no further middleware has processed the handler result, and the handler result is an instance of the `HandlerResult` class, handling of the result is delegated to that class.
