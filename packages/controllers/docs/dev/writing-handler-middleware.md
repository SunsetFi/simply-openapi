# Writing Handler Middleware

As express middleware provides the ability to wrap future express request handlers, @simply-openapi/controllers allows its own middleware to wrap its handlers.

The main benefit this provides is the ability to trap thrown errors and reinterpret the return values.

## The basics of handler middleware

Handler middleware takes the form of an async function that is called with the context of a request, and itself asynchronously calls the next handler in the chain. It can then reinterpret the results of that call, either returning it to the next handler up the chain, or handling it directly and returning `undefined` to indicate that no further processing is needed.

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
    // Nothing to send.
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

  // We don't know what this is, let the next handler interpret it.
  return result;
}
```
