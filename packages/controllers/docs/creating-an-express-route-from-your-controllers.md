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

If you have been following the tutorials, this is the minimum required to produce a fully functional router.  This router is now ready to be used directly with express. That's all there is too it, enjoy!

## Error handling and Validation

### Handling validation errors

@simply-openapi/controllers performs validation and emits errors by throwing http-error derived errors through the express middleware stack.  Express will deal with these errors in a sensible way out of the box, but custom logic can be implemented if desired to handle these by providing an error handler middleware in your express app or as a `postExpressMiddleware` entry to `createRouterFromSpec`.

### Orphaned requests

In @simply-openapi/controllers, `undefined` is used as a handler and handler middleware result to indicate that the response has been handled and no further processing is needed.  If your handler returns undefined (or a promise to undefined), no processing will be performed and the request will be left dangling.

In order to prevent this from happening, @simply-openapi/controllers has one last emergency fallback handler middleware which will throw an internal server error if it is reached and the result still has not been sent.  If you wish to disable this behavior, you can pass `ensureResponsesHandled: false` as an option to `createRouterFromSpec`, and this middleware will be disabled.

## Providing global middleware

The createRouterFromSpec function accepts options for additional middleware to apply to all routes.

Note that middleware can also be provided at a per-controller and per-method level as well.  In relation to those, global middleware will run first, then controller, then method.

### Handler Middleware

Handler middleware is invoked in the context of the controller library and provides the pipeline with which controller method handler functions are called.  They can be used to provide preconditions to execution as well as to reinterpret method results.

As handlers can be asynchronous, all handler middleware must support asynchronous operation.

For example, we can make a middleware that interprets `null` responses as a `201 No Content` response

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

const mySpec = createOpenAPIFromControllers(..., controllers);

const router = createRouterFromSpec(mySpec, {
  handlerMiddleware: [
    async (ctx, next) => {
      const handlerResult = await next();
      if (handlerResult === null) {
        ctx.res.status(201).end();
        // By convention, returning undefined to the next middleware indicates
        // that the response was handled and no further action is needed on the part
        // of the web request.
        return undefined;
      }
      
      // Pass the result on for other middlewares to handle.
      return handlerResult;
    }
  ]
});

const app = express();
app.use(router);
app.listen(8080);
```

For more information, see [Writing Handler Middleware](writing-handler-middleware.md).

### Express Middleware

Middleware can be injected both prior to the handler, and after the handler executes.  These can be passed by the `preExpressMiddleware` and `postExpressMiddleware` options respectively.  Note that in practice, postExpressMiddleware is only called on an error condition, when a handler throws an error.  If the handler succeeds, it will not call its next() function and the post middleware will not be executed.

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

const mySpec = createOpenAPIFromControllers(..., controllers);

const router = createRouterFromSpec(mySpec, {
  preExpressMiddleware: [
    (req, res, next) => {
       console.log(`Got request to ${req.url}`);
       next();
    }
  ],
  postExpressMiddleware: [
    (err, req, res, next) => {
      console.error("Error handling request", err);
      res.status(500).end();
    }
  ]
});

const app = express();
app.use(router);
app.listen(8080);
```

## Advanced use cases

Beyond the customizations listed above, there are more advanced options available for use.

### Resolving controllers

Sometimes, your controller metadata might not be the controller you want to operate on.  This can occur if you are passing DI symbols or class constructors to `createOpenAPIFromControllers`.  In cases like this, you can use the resolveController option to pass a function that will resolve the controller instance for you.

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

Other uses of this function include DI usage.  For example, your controller may be a self-bound DI dependency.  In which case, you would use your DI container to resolve the controller class into an instance.  Here is a minimal example with Inversify:

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

If needed, you can reinterpret the way handlers are obtained from the controllers.  You may use this as another way to implement cross-cutting concerns on your controllers.

By default, @simply-openapi/controllers will resolve metadata about methods as either a function, or a string naming a function on the controller.  It's default implementation of the specification resolver will opt for string names, but it is best to handle both cases in your handler resolver.

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
