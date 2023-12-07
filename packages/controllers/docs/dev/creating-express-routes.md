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

## Error handling and Validation

### Handling validation errors

@simply-openapi/controllers performs validation and emits errors by throwing http-error derived errors through the express middleware stack. Express will deal with these errors in a sensible way out of the box, but custom logic can be implemented if desired to handle these by providing an error handler middleware in your express app, or catching the error in a [handler middleware](./writing-handler-middleware.md).

### Handling 4xx errors

@simply-openapi/controllers uses the `http-errors` library to produce thrown errors describing 4xx status codes. These can be captured with [handler middleware](./writing-handler-middleware.md), or by adding an express error handling middleware to the produced route.

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

// Error handler middleware should be added to the router directly.
// Note that @simply-openapi/controllers uses thrown errors from `http-errors` to indicate 4xx response codes,
// which will be picked up by such middleware.  Express will properly handle such errors by default.
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

In @simply-openapi/controllers, `undefined` is carries special meaning when returned by a controller method or a handler middleware function. It indicates that the response has been handled and no further processing is needed. If your handler returns undefined (or a promise to undefined), and you haven't otherwise sent a resopnse, no processing will be performed and the request will be left unanswered.

In order to prevent this from happening accidentally, @simply-openapi/controllers provides a fallback handler middleware which will throw an internal server error if it is reached and the result still has not been sent. If you wish to disable this behavior, you can pass `ensureResponsesHandled: false` as an option to `createRouterFromSpec`.

## Providing global handler middleware

In addition to the controller and method specific `@UseHandlerMiddleware` decorator, the createRouterFromSpec function accepts options for additional middleware to apply to all handlers.

### Handler Middleware

Handler middleware is invoked in the context of the controller library and provides the pipeline with which controller method handler functions are called. They can be used to provide preconditions to execution, validate and transform handler arguments, and reinterpret method results.

{% content-ref url="writing-handler-middleware.md" %}
[writing-handler-middleware.md](writing-handler-middleware.md)
{% endcontent-ref %}

### Express Middleware

Express middleware can be adapted into the @simply-openapi/controllers middleware ecosystem using the `convertExpressMiddleware` function. Note that this only supports standard request middleware; error handling middleware is not supported, and should instead be added to your express application or to the returned router.

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
    convertExpressMiddleware(helmet())
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
