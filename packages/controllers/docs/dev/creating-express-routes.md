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

## Advanced use cases

Beyond the customizations listed above, there are more advanced options available for use.

### Resolving controllers

Sometimes, your controller metadata might not be the controller you want to operate on. This can occur if you are passing DI symbols or class constructors to `createOpenAPIFromControllers`. In cases like this, you can use the resolveController option to pass a function that will resolve the controller instance for you.

For example, you could use this function to instantiate the types if you passed constructors to the spec creation function rather than live instances:

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";

import { WidgetsController } from "./widgets";

const controllerTypes = [
  WidgetsController
];

const mySpec = createOpenAPIFromControllers(..., controllerTypes);

const router = createRouterFromSpec(mySpec, {
  resolveController: (controller) => new Controller()
});

const app = express();
app.use(router);
app.listen(8080);
```

Other uses of this function include DI usage. For example, your controller may be a self-bound DI dependency. In which case, you would use your DI container to resolve the controller class into an instance. Here is a minimal example with Inversify:

```typescript
import { Container, Injectable } from "inversify"
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";

@Injectable()
class MyController {
  ...
}

const container = new Container();
container.bind(MyController).toSelf();

const controllerTypes = [
  MyController
];

const mySpec = createOpenAPIFromControllers(..., controllerTypes);

const router = createRouterFromSpec(mySpec, {
  resolveController: (controller) => container.get(controller)
});

const app = express();
app.use(router);
app.listen(8080);
```

This can also be useful to implement cross-cutting concerns, for example returning a proxy object onto the controller with built-in logging and monitoring for its methods.

### Resolving Handlers

If needed, you can reinterpret the way handlers are obtained from the controllers. You may use this as another way to implement cross-cutting concerns on your controllers.

By default, @simply-openapi/controllers will resolve metadata about methods as either a function, or a string naming a function on the controller. The default implementation of `createOpenAPIFromControllers` will opt for string names, but it is best to handle both cases in your handler resolver.

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";

import { WidgetsController } from "./widgets";

const controllers = [
  new WidgetsController()
];

const mySpec = createOpenAPIFromControllers(..., controllerTypes);

const router = createRouterFromSpec(mySpec, {
  resolveHandler: (controller, method) => {
    return (...args: any[]) => {
      console.log(`Method ${method} called.`);
      if (typeof method === "string") {
        return controller[method](...args);
      }
      else {
        return method(...args);
      }
    }
  }
});

const app = express();
app.use(router);
app.listen(8080);
```
