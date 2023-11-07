# SEC - Simply Express Controllers

No heavy frameworks, no IOC, just a simple robust express controller library using modern ES6 decorators.

Simply Express Controllers is an OpenAPI-First controller library. It produces fully robust method handlers on controllers by consuming an OpenAPI 3.1 specification and calling your handlers
with all data pre-validated and coerced according to your specification.

Don't have OpenAPI specs? No problem! SEC also provides decorators for your classes and methods that will create the openapi spec for you according to your handler usage and declaration.

SEC is designed to be a single-purpose library. It solves the use case of producing robust controllers and methods for web request handling, and does not dictate any design patterns beyond what it needs to do its job.  
It is highly extensible, supporting both the typical express middleware, plus its own middleware for method handlers, allowing you to integrate with the method creation for customizing both the inputs and outputs of your controller methods.

## OpenAPI is definitive, everything else follows

The philosophy of SEC is that the OpenAPI spec (either self-provided or described in-code by decorators) should be the definitive form of the service, and the handlers should conform to it. In practice, that means
every declarative statement the spec can make will be enforced in your methods:

- Parameters and bodies will be validated against their schema. If the schema doesn't match, your method will not be called and the appropriate error will be returned
- Parameters and bodes will be coerced to the schema. The schema type indicates a number? If the parameter is a valid number, it will be casted before being forwarded to the controller. Your body schema includes default values? Those defaults will be populated.
- [TODO] Response contracts are still contracts! Optional support is provided for validating all outgoing data to ensure your service is responding with what it is documented as responding. This can be enforced in development, and log warnings in production.

This is in contrast to many other controller libraries, that try to generate openapi spec ad-hoc from the controllers and do not make an effort to enforce compliance.

## Write once

OpenAPI provides a definitive description of the service, and so no additional code should be needed. Unlike other controller libraries where writing an openapi spec decorator on your method provides no functional benefit aside from
documentation, SEC uses OpenAPI as the source of truth for how all methods should behave. Write the OpenAPI docs describing the expected inputs and outputs of your method, and SEC guarentees your method is never called in a way that violates that schema. No additional type guards, validation pipes, or documentation schema is needed. Provide the docs and you are good to go.

## Pluggable everywhere

Need a different serialization type? Need additional transformations on inputs before passing them to your methods? A middleware system for handlers is provided, allowing both the inputs to your methods as well as the method responses to be tweaked, transformed, and handled with ease. Middleware can be injected at the global level, [TODO] class level, [TODO] methods, or [TODO] even individual parameters. SEC even uses this system for its own default handling; anything it does by default can be replaced.

## Usage

There are 3 ways to use SEC:

- [Produce routers from predefined OpenAPI schema and annotated controllers](#producing-routers-from-existing-openapi-specs)
- [Produce both routers and OpenAPI schema from controllers with HTTP-descriptive decorators](#producing-routers-and-openapi-specs-from-decorator-annotated-controllers)
- Produce routers from OpenAPI schema adorned with `x-sec` extensions

### Producing routers from existing OpenAPI specs

When you have OpenAPI specs already written and you just want to attach controllers, you can do so using the `@BindOperation` decorator.
This decorator allows you to attach controller methods to arbitrary OpenAPI Operation by their operation id.

When using this decorator, it is important to use `@BindParam` and `@BindBody` decorators instead of the typical `@PathParam`, `@QueryParam`, and `@Body` decorators, as the latter will try to redefine
openapi specs. If this mixup occurs, SEC will throw an error.

The original OpenAPI Schema:

```ts
const mySpec = {
  "openapi": "3.1.0",
  "info": {...},
  "paths": {
    "/add": {
      "post": {
        "operationId": "post-add",
        "parameters": [
          {
            "in": "query",
            "name": "a",
            "schema": {
              "type": "number"
            }
          },
          {
            "in": "query",
            "name": "b",
            "schema": {
              "type": "number"
            }
          }
        ],
        "response": {
          "application/json": { "type": "number" }
        }
      }
    }
  }
}
```

The controller you would like to bind:

```ts
class MyController {
  @BindOperation("post-add")
  getHelloWorld(@BindParam("a") a: number, @BindParam("b") b: number): number {
    return a + b;
  }
}
```

With this combination, you can produce a functional express route in two steps.

First, we need to take our openapi spec and annotate it with the extensions that describe our controller.

```ts
import { attachBoundControllersToOpenAPI } from "simply-openapi-controllers";

const annotatedSpec = attachBoundControllersToOpenAPI(mySpec, [
  new MyController(),
]);
```

This will create a new OpenAPI spec that contains metadata describing our controllers and handlers. Note that during this process, if one of your controllers asks for an operation or binding parameter that is not defined in the openapi spec, an error will be thrown describing the issue.

Now that we have our annotated spec, we can create an express router that implements it:

```ts
const routerFromSpec = createRouterFromSpec(annotatedSpec);
```

You are now ready to use the router in your app. See [Using the produced router](#using-the-produced-router).

### Producing routers and OpenAPI specs from decorator-annotated controllers

If you want to focus on the code and leave the OpenAPI specs to be auto-generated, you can produce both the routers and the specs entirely from decorators adorning Controller classes

```ts
@Controller("/v1")
class MyController {
  @Post("/add", { tags: ["Addition", "Math"], summary: "Adds two numbers" })
  @JsonResonse(200, "The sum of the two numbers", { type: number })
  addNumbers(
    @QueryParam("a", { type: "number" }) a: number,
    @QueryParam("b", { type: "number" }) b: number
  ) {
    return a + b;
  }
}
```

This is sufficient to create a fully formed OpenAPI specification, although more decorators exist to further annotate the document if desired. See [Decorator reference](#decorator-reference).

You can then produce the OpenAPI spec out of your controller with:

```ts
const openApiSpec = createOpenAPIFromControllers([new MyController()]);
```

Note that if you are integrating into an existing app and already have existing OpenApi specs, you can produce only the path object with `createOpenAPIPathsFromControllers`, which takes the same signature.

Once you have produced the spec, creating a router to handle it is simple:

```ts
const routerFromSpec = createRouterFromSpec(annotatedSpec);
```

You are now ready to use the router in your app. See [Using the produced router](#using-the-produced-router).

## Using the produced router

The routers produced by SEC are miniamlistic and only cover mapping openapi requests to handlers. SEC stays out of the way of building your express app so you can configure it however you like, including additional routing, error handling, static resources, and any other features you desire.

This does mean that there are some areas left uncovered, and up to you to provide. These are

- error handling
- body parsing
- authentication and security

Body parsing is of particular importance as SEC expects json object bodies.
Additionally, SEC uses http-errors to communicate error states upstream. These must be handled for proper operation.

Note that previous versions of this library provided both an internal body-parser and internal error handling, but this was removed in favor of more flexibility for the implementor.

A good basis for an express app using SEC is provided below:

```ts
import bodyParser from "body-parser";

...

app.use(bodyParser.json({strict: true}), routerFromSpec);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    console.error(
      err,
      `An error occured request \"${req.url}\" after headers have been sent: ${err.message}`,
    );
    res.end();
    return;
  }

  if (isHttpErrorLike(err)) {
    if (!err.expose) {
      console.error(
        err,
        `Internal error handling request \"${req.url}\": ${err.message}`,
      );
      res
        .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" })
        .end();
    } else {
      console.error(
        err,
        `Error ${err.statusCode} handling request \"${req.url}\": ${err.message}`,
      );
      res.status(err.statusCode).json({ message: err.message }).end();
    }
  } else {
    console.error(
      err,
      `An unknown error was thrown handling request \"${req.url}\": ${err.message}`,
    );
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" })
      .end();
  }
})

```

Note how the types of both parameters are numbers, not strings. This is because the OpenAPI doc typed the query parameters as numbers, and SEC obediently casted the values to javascript numeric values before passing it to the handler function.
If this method was to be called with non-number query values, SEC's handler will return a 400 Bad Request explaining the invalid value and the handler will not be called.

Also note that the response is typed as number. You may optionally enforce this at runtime. See [Enforcing return types at runtime](#enforcing-return-types-at-runtime)

## Returning status codes, headers, cookies, and non-json bodies.

From time to time, greater control is needed over the exact response sent by your handler. For example, you might send a Location header with the location of a newly created resource, or you may need to choose a status code
based on the action taken by the handler. For this, the `ResponseObject` exists.

This object provides a testable and mockable abstraction over the usual operations done to the express Response object. It can be used as a stand-in for injecting the express response, and is handled internally by an operation handler middleware provided by default.

(Note: If you need further customization, you can supply your own operation handler middleware to intercept and work with this object directly, or you can create your own return types and middleware).

Usage:

```ts
@Controller("/widgets")
class MyController {
  @Put("/")
  putWidget(@Body({ ...widgetSchema }) body: Widget) {
    const existingWidget = repository.findItemById(body.id);
    if (existingWidget) {
      return ResultObject.status(200).json(existingWidget);
    }

    const newWidget = repository.createItem(body);
    return ResultObject.status(201)
      .header("Location", `http://widgetfactory.biz/widgets/${newWidget.id}`)
      .json(newWidget);
  }
}
```

## Escaping SEC and using raw express requests and responses

Accessing express requests and responses directly can cause complications for large robust applications as unit testing them is very finicky and they hide the declarative nature of what your method is doing.

However, no library can cover all use cases, so both the request and response objects can be made available to handlers using the `@Req` and `@Res` parameter decorators.

## Enforcing return types at runtime

TODO

## Decorator reference

TODO
