# Creating an Express Route from your OpenAPI specification

Once you have generated your annotated OpenAPI spec, you can use the `createRouterFromSpec` to produce a single express router that will implement all validation logic and request handling from your controllers.

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";

const mySpec = createOpenAPIFromControllers(...);

const router = createRouterFromSpec(mySpec);

const app = express();
app.use(router);
app.listen(8080);
```

If you have been following the docs in order, this is the minimum required to produce a fully functional router. This router is now ready to be used directly with express. That's all there is too it, enjoy!

## Enforcing Response Schemas

Response schemas are an important contract in OpenAPI, but their validity is a function of the service itself. In theory, a properly designed service will always return valid objects. However, it may be useful to enforce these contracts in lower environments or during testing to ensure the response data is valid according to the specifications.

The `responseValidation` option can be used to apply such validation to the api. It supports the following values:

- `true` - Validate the response, if a matching media type is found in the specification. Returns an Internal Server Error status code if the response is not valid.
- `"required"` - Validate the response, and returns an Internal Server Error if it fails to validate. If no matching media type is found in the specification, an Internal Server Error is also returned.
- `function` - If the response fails to validate, the function will be called with the AJV ValidationError of the failing validation.
- `{required: true, errorHandler: function}` - Applies the behavior of both `"required"` and `function`.

When using a function, you may want to use the exported `errorObjectsToMessage` utility to stringify the errors property of a ValidationError.

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec,
  errorObjectsToMessage
} from "@simply-openapi/controllers";
import express from "express";

import { WidgetsController } from "./widgets";

const controllers = [
  new WidgetsController()
];

const mySpec = createOpenAPIFromControllers(..., controllerTypes);

const router = createRouterFromSpec(mySpec, {
  responseValidation: {
    required: true,
    errorHandler: (err, ctx) => {
      console.log("Method", ctx.method, "at path", ctx.path, "returned an invalid body:", errorObjectsToMessage(err.errors));
      ctx.res.status(500).end();
    }
  }
});

const app = express();
app.use(router);
app.listen(8080);
```

## Error Handling

@simply-openapi/controllers performs validation on all incoming data against the OpenAPI spec. When this validation fails, an appropriate 4xx error is produced and thrown using the `http-errors` library. Your method handlers may also throw errors in this way if desired.

### Handling 4xx errors

@simply-openapi/controllers uses the `http-errors` library to produce thrown errors describing 4xx status codes. By default, express will handle these in a sensible way. However, if you want to customize the behavior, you can add an express error handler middleware to the produced route.

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";
import { isHttpError } from "http-errors";

import { WidgetsController } from "./widgets";

const controllers = [
  new WidgetsController()
];

const mySpec = createOpenAPIFromControllers(..., controllers);


const router = createRouterFromSpec(mySpec);

// Implement our own error handling to take over from express.
router.use((err, req, res, next) => {
  console.error("Error handling request", err);
  if (isHttpError(err)) {
    res.status(err.statusCode).send(err.message);
  }
  else {
    res.status(500).end();
  }
});

const app = express();
app.use(router);
app.listen(8080);
```

### Orphaned requests

In @simply-openapi/controllers, `undefined` carries special meaning when returned by a controller method or a handler middleware function. It indicates that the response has been handled and no further processing is needed.

However, `undefined` may also crop up if you forget to return a result from your handler method. This will cause the request to be orphaned, and the connecting client to time out.

In order to prevent this from happening accidentally, @simply-openapi/controllers provides a fallback handler middleware which will throw an internal server error if it is reached and the result still has not been sent. If you wish to disable this behavior, you can pass `ensureResponsesHandled: false` as an option to `createRouterFromSpec`.

## Using Middleware

In addition to the controller and method specific `@UseHandlerMiddleware` decorator, the createRouterFromSpec function accepts options for additional middleware to apply to all handlers.

### Handler Middleware

Handler middleware is invoked in the context of the controller library and provides the pipeline with which controller method handler functions are called. They can be used to provide preconditions to execution, validate and transform handler arguments, and reinterpret method results.

{% content-ref url="writing-handler-middleware.md" %}
[writing-handler-middleware.md](writing-handler-middleware.md)
{% endcontent-ref %}

Such middleware can be added globally to all method handlers using the `handlerMiddleware` option of `createRouterFromSpec`

```typescript
const router = createRouterFromSpec(mySpec, {
  handlerMiddleware: [myMiddlewareFunc],
});
```

### Express Middleware

Express middleware can be adapted into the @simply-openapi/controllers middleware ecosystem using the `convertExpressMiddleware` function.

The `convertExpressMiddleware` function expects a function that is either an express handler, or an express error handler. Like the `use` function of express, this converter identifies which one you pass it based on the value of `arguments.length` of the function:

- 4 arguments indicates an error handler. This will be invoked if further middleware or your method handler throws an error. It is assumed that your express middleware will handle the error and send a response, so the resulting handler middleware promise will resolve to undefined when `next()` is called.
- 3 arguments indicates a standard express handler middleware. It will be invoked, and the handler middleware chain will resume when the express middleware calls `next()`.

Note that in practice, error handler middleware will not be called for OpenAPI-driven validation errors due to the position in which user supplied handler middleware are inserted into the chain. It is strongly recommended that all error handling be added at the router or express app level.

```typescript
import {
  convertExpressMiddleware,
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";
import helmet from "helmet";
import { isHttpError } from "http-errors";

import { WidgetsController } from "./widgets";

const controllers = [
  new WidgetsController()
];

const mySpec = createOpenAPIFromControllers(..., controllers);

const router = createRouterFromSpec(mySpec, {
  handlerMiddleware: [
    // Express middleware can be added using this adapter function
    convertExpressMiddleware(helmet()),
    convertExpressMiddleware((err, req, res, next) => {
      if (isHttpError(err)) {
        res.status(err.statusCode).send(err.message);
      }
      else {
        res.status(500).send("Internal Server Error");
      }
    })
  ]
});

const app = express();
app.use(router);
app.listen(8080);
```

---

For more advanced use cases around making routers from controllers, see [Advanced Use Cases](./advanced-use-cases.md).
