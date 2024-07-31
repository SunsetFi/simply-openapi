# Advanced Use Cases

The generation and implementation of method handlers can be further customized.

## Resolving controllers

Sometimes, your controller metadata might not be the controller you want to operate on. There are a few use cases for this:

* You may be passing class constructors to `createOpenAPIFromControllers` in an earlier stage and want to use that produced schema to create the router.
* You may be using a dependency injection system, and want to instantiate instances from the controller constructor.
* You may wish to wrap your controllers in custom logic or cross cutting concerns at the time of route creation.

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

* Functions will be used as-is.
* If the method in the schema is a string or symbol, it will be used as a property name on the controller.

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

* An AJV instance
* An options object for the creation of an OpenAPI compatible AJV instance
* A function that takes an [OpenAPI Schema Object](https://spec.openapis.org/oas/latest.html#schema-object), and return a function that validates its first parameter against the schema, returns the object to use, or throws an AJV ValidationError if it does not match.

All keys used in this object will be made available to middleware factories in the `validators` property of [OperationMiddlewareFactoryContext](../api-reference/contexts.md#operationmiddlewarefactorycontext).

By default, there are 3 validators in use by @simply-openapi/controllers that can be overridden as desired:

* `createParameterValidator`: Used to create validators for OpenAPI parameters. By default, this coerses data and applies defaults.
* `createBodyValidator`: Used to create validators for request bodies. By default, this applies defaults, but does not coerce data.
* `createResponseValidator`: Used to create validators for response data if `responseValidation` is set.  By default, this applies defaults but does not coerce data.

When using functions, the returned validator factory function should take an object to validate, and returned the processed object if it is valid.  If desired, this object may have changes from the original (eg: defaults applied, data coersed).  If the value is invalid according to the schema, it should throw an instance of `ValidationError` from the AJV library with the `errors` property describing the errors encountered. If the value is valid, the function should either return the value unchanged, or return a new value to use in its place (for example, with coercion and default values applied).

```typescript
import {
  createOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";
import express from "express";
import Ajv, { ValidationError } from "ajv";
import ajvErrors from "ajv-errors";
import { SchemaObject } from "openapi3-ts/oas31";

import { WidgetsController } from "./widgets";

const controllers = [
  new WidgetsController()
];

const mySpec = createOpenAPIFromControllers(..., controllerTypes);

// Create a new AJV instance that uses the ajv-errors plugin.
const bodyValidatorAjv = new Ajv({
  allErrors: true,
  useDefaults: true,
  coerceTypes: false
});
ajvErrors(ajv);
    
const router = createRouterFromSpec(mySpec, {
  // Enable response validation for our example
  responseValidation: true,
  // Customize our validator factories
  validatorFactories: {
    // Set the parameter AJV options to not use defaults
    createParameterValidator: {
      useDefaults: false,
      coerceTypes: true
    },
    // Use a custom AJV instance with the ajv-errors plugin
    createBodyValidator: bodyValidatorAjv,
    // Supply arbitrary validation
    createResponseValidator: (schema: SchemaObject) => {
      return (value: any) => {
        const errors = myCustomValidation(values);
        if (errors.length > 0) {
          const err = new ValidationError("Validation Failed");
          err.errors = errors;
          throw err;
        }
        return value;
      }
    },
  },
});

const app = express();
app.use(router);
app.listen(8080);
```
