# Advanced use cases

The generation and implementation of method handlers can be further customized.

## Resolving controllers

Sometimes, your controller metadata might not be the controller you want to operate on. There are a few use cases for this:

- You may be passing class constructors to `createOpenAPIFromControllers` in an earlier stage and want to use that produced schema to create the router.
- You may be using a dependency injection system, and want to instantiate instances from the controller constructor.
- You may wish to wrap your controllers in custom logic or cross cutting concerns at the time of route creation.

For such cases, you can use the `resolveController` option of `createRouterFromSpec` to pass a function that will resolve the instance of the controller given the passed controller symbol.

For example, the following code will instantiate class constructors that were used to build the spec:

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

## Resolving Handler Methods

If needed, you can reinterpret the way handler methods are obtained from the controllers in `createRouterFromSpec`. You may use this as another way to implement cross-cutting concerns on your controllers.

By default, @simply-openapi/controllers will resolve the following types of method data in the specification:

- Functions will be used as-is.
- If the method in the schema is a string or symbol, it will be used as a property name on the controller.

The default implementation of `createOpenAPIFromControllers` will opt for using property names, but it is best to handle both cases in your handler resolver.

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
      const methodName = typeof method === "function" ? method.name : method;
      console.log(`Method ${methodName} called.`);
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

## Modifying Schema Validation

The schema validation system of @simply-openapi/controllers can be customized or replaced as needed. Additionally, the validation system can be extended with other validation methods for use in middleware.

The `validatorFactories` option of `createRouterFromSpec` provides a means of both overriding the existing validator factories and producing new ones.

The properties of this object should be one of the following values:

- An AJV instance
- An options object for the creation of an OpenAPI compatible AJV instance
- A function that takes an [OpenAPI Schema Object](https://spec.openapis.org/oas/latest.html#schema-object), and return a function that validates its first parameter against the schema, returns the object to use, or throws an AJV ValidationError if it does not match.

All keys used in this object will be made available to middleware factories in the `validators` property of [OperationMiddlewareFactoryContext](../api-reference/contexts.md#operationmiddlewarefactorycontext).

By default, there are 3 validators in use by @simply-openapi/controllers that can be overridden as desired:

- `createParameterValidator`: Used to create validators for OpenAPI parameters. By default, this coerses data and applies defaults.
- `createBodyValidator`: Used to create validators for request bodies. By default, this coerses data and applies defaults.
- `createResponseValidator`: Used to create validators for response data if

The value of this option should be factory functions that take the OpenAPI specification, and return a validator factory function.

The validator factory function returned by the above factory should take an [OpenAPI Schemas](https://spec.openapis.org/oas/v3.1.0#schema-object), and return a value validation function.

The value validation function should take an object to validate. If the value is invalid, it should throw an instance of `ValidationError` from the AJV library with the `errors` property describing the errors encountered. If the value is valid, the function should either return the value unchanged, or return a new value to use in its place (for example, with coercion and default values applied).
