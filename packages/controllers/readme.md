# Simply OpenAPI Controllers
Simply OpenAPI Controllers is an ExpressJS compatible OpenAPI-First controller library. It produces fully robust method handlers on controllers by consuming an OpenAPI 3.1 specification and calling your handlers
with all data pre-validated and coerced according to your specification.

It exposes its handlers as a single express middleware / router, allowing integration with express itself or with any library or framework that wraps it.

Don't have OpenAPI specs? No problem! SOC also provides decorators for your classes and methods that will create the openapi spec for you according to your handler usage and declaration.

SOC is designed to be a single-purpose library. It solves the use case of producing robust controllers and methods for web request handling, and does not dictate any design patterns beyond what it needs to do its job.  
It is highly extensible, supporting both the typical express middleware, plus its own middleware for method handlers, allowing you to integrate with the method creation for customizing both the inputs and outputs of your controller methods.

At its heart, this library provides two complementary systems:

- The ability to take decorated classes and methods, and produce robust complete OpenAPI specifications from them
- The ability to take OpenAPI specifications and wire them up to handlers, with all the boilerplate validation taken care of automatically.

## Forward: OpenAPI and its endpoint definitions

Before getting into the specifics of this library, its important to know what makes OpenAPI so powerful as a source to derive our handlers from.

OpenAPI is very expressive when it comes to the specification of the inputs and outputs of handler functions. OpenAPI specs can define the exact shape and requirements of parameters, bodies, and even response types differing across status codes and content types. All of this information encapsulates declarative instructions that normally would be implemented by the developers: Type checks, null checks, coersion, casting, default values, and error handling all provide a great amount of boilerplate that must be written for all endpoint handlers. However, since OpenAPI already defines all of this, why not derive it programmically and automate away such boilerplate?

This is the core concept of simply-openapi-controllers.

For example, let's take this simple OpenAPI example:

```json
{
  "openapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Swagger Petstore",
    "license": {
      "name": "MIT"
    }
  },
  "servers": [
    {
      "url": "http://petstore.swagger.io/v1"
    }
  ],
  "paths": {
    "/pets/{petId}": {
      "get": {
        "summary": "Info for a specific pet",
        "operationId": "showPetById",
        "tags": ["pets"],
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "required": true,
            "description": "The id of the pet to retrieve",
            "schema": {
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Expected response to a valid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pet"
                }
              }
            }
          },
          "default": {
            "description": "unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "tag": {
            "type": "string"
          }
        }
      },
      "Pets": {
        "type": "array",
        "maxItems": 100,
        "items": {
          "$ref": "#/components/schemas/Pet"
        }
      },
      "Error": {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

Encapsulated in this document is a significant amount of data about how our endpoint should function. The philosophy of simply-openapi-controllers is that this OpenAPI spec (either externally provided or described by developers in-code with decorators) should be the definitive form of the service, and the handlers should conform to it. In practice, that means every declarative statement the spec can make will be enforced in your methods.

In practice, with this example schema, this means:
For /pets/:petId

- The value of the petId parameter must be a number
- If the response code is 200, it should return a valid Pet object according to the defined schema, and only the application/json content type is supported.
- For any other response code, it should return an Error object according to the defined schema, and only the application/json content type is supported.

All of this would normally have to be adhered to by the developers writing the server. However, since we have the OpenAPI spec, we have a definitive 'source of truth' for as to how the handler should be validated, both for incoming and outgoing data. simply-openapi-controllers both provides this validation and maps the request into easy to write handler methods.

- Path parameters, query parameters, and request bodies will be validated against their schema. If the schema doesn't match, the handling method will not be called and the appropriate http error will be returned.
- Parameters and bodes will be coerced to the schema. If schema type of a path parameter indicates an integer, then it will not only accept only valid integers, but the string paramter will be casted to a number before being forwarded to the controller.
- Default values supplied by the will be populated, so optional body objects that supply defaults will have those defaults when it reaches the handler method.
- Response contracts are still contracts! Optional support is provided for validating all outgoing data to ensure your service is responding with what it is documented as responding. This can be enforced in development, and log warnings in production.

## Pluggable everywhere

Need a different serialization type? Need additional transformations on inputs before passing them to your methods? Have custom schema properties that need validation? Want to integrate with your own DI server? All of these things are supported in simply-openapi-controllers through its highly extensible plugin and middleware system.

At the basics, express middleware is supported out of the box. Not only can you simply include your express middleware in your own express app before using the route generated by this library, but you can also add middleware to all controllers, specific controllers, and even specific methods.

A middleware system for handlers is provided, allowing both the inputs to your methods as well as the method responses to be tweaked, transformed, and handled with ease. As with express middlewares, these middlewares can be injected at the global level, class level, and individual methods.

SOC even uses this middleware system for its own core features, meaning any middleware you provide can override any default behavior of SOC. Need specialized handling of your method response to your express response? Need customized error handling? Want to return DTOs from your methods and serialize them dependent on request content types? No problem! Provide a handler middleware you are good to go!

## Usage

There are 2 ways to use SOC:

- [Produce both routers and OpenAPI schema from controllers and handler methods using decorators](#producing-routers-and-openapi-specs-from-controller-and-handler-decorators)
  Use this method if you do not wish to write your own OpenAPI specification and want to focus on writing handlers.

- [Produce routers from predefined OpenAPI schema and annotated controllers](#producing-routers-from-existing-openapi-specs)
  Use this method if you want to have strongly declared API contracts that are auditable from outside the code.

### Producing Routers and OpenAPI specs from controller and handler decorators

If you want to focus on the code and leave the OpenAPI specs to be auto-generated, you can produce both the routers and the specs entirely from decorators adorning Controller classes

```ts
@Controller("/math", { tags: ["Math"] })
class MyController {
  @Post("/add", { summary: "Adds two numbers", tags: ["Addition"] })
  @JsonResonse(200, "The sum of the two numbers", { type: "number" })
  addNumbers(
    @QueryParam("a", "number", { description: "The first number" }) a: number,
    @QueryParam("b", "number", { description: "The second number" }) b: number
  ) {
    return a + b;
  }
}
```

This is sufficient to create a fully formed OpenAPI specification with the same level of detail as the manually-written OpenAPI spec above.
If desired, even more detail could be added through additional decorators. See [Decorator reference](#decorator-reference).

Since simply-openapi-controllers derives its routers from openapi, we must first create our OpenAPI specification from our controllers:

```ts
const openApiSpec = createOpenAPIFromControllers({ title: "My Application" }, [
  new MyController(),
]);
```

Once you have produced the spec, creating a router to handle it done the same way as the manual example:

```ts
const routerFromSpec = createRouterFromSpec(annotatedSpec);
```

You are now ready to use the router in your app. See [Using the produced router](#using-the-produced-router).

### Producing routers from existing OpenAPI specs

When you have OpenAPI specs already written and you just want to attach controllers, you can do so using the `@BindOperation` decorator.
This decorator allows you to attach controller methods to arbitrary OpenAPI Operation by their operation id.

When using this decorator, it is important to use `@BindParam` and `@BindBody` decorators instead of the typical `@PathParam`, `@QueryParam`, and `@Body` decorators, as the latter will try to redefine
openapi specs. If this mixup occurs, SOC will throw an error.

As an example, lets take this OpenAPI specification and make a handler for it.

```ts
const mySpec = {
  "openapi": "3.1.0",
  "info": {...},
  "paths": {
    "/v1/add": {
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
          "200": {
            "content": {
              "application/json": {
                "schema": {"type": "number" }
              }
            }
          }
        }
      }
    }
  }
}
```

Our controller to bind to `/v1/add` would then look like this.

```ts
@BoundController()
class MyController {
  @BindOperation("post-add")
  getHelloWorld(@BindParam("a") a: number, @BindParam("b") b: number): number {
    return a + b;
  }
}
```

Note how the types of both parameters are numbers, not strings. This is because the OpenAPI doc typed the query parameters as numbers, and SOC obediently casted the values to javascript numeric values before passing it to the handler function.
If this method was to be called with non-numeric query values, SOC's handler will return a 400 Bad Request explaining the error, and the handler will not be called.

Also note that the response is typed as number. You may optionally enforce this at runtime. See [Enforcing return types at runtime](#enforcing-return-types-at-runtime)

Given this spec and this controller, you can produce a functional express route in two function calls.

First, we need to take our openapi spec and annotate it with the extensions that describe our controller.

```ts
import { attachBoundControllersToOpenAPI } from "simply-openapi-controllers";

const annotatedSpec = addendOpenAPIFromControllers(mySpec, [
  new MyController(),
]);
```

This will create a new OpenAPI spec that contains metadata describing our controllers and handlers. This will be a fully valid OpenAPI specification, with added extended data describing the controllers and methods on each operation that the controller wants to handle.

Note that the annotated spec will be a new deep copy from the original spec, so this function is safe to use on specs you do not wish to modify.

Now that we have our annotated spec, we can create an express router that implements it:

```ts
const routerFromSpec = createRouterFromSpec(annotatedSpec);
```

You are now ready to use the router in your app. See [Using the produced router](#using-the-produced-router).

## Using the produced router

The created router is entirely self-contained, and all SOC features should work out of the box simply by connecting the router to your express app. As SOC is focused only on the request handler level, it provides no requirements on how you create or customize your express app.

However, despite these defaults, you are still able to influence SOC's behavior by supplanting its middleware with your own.

### Overriding the default express middleware

The routers produced by SOC are miniamlistic and only cover mapping openapi requests to handlers and provide the minimial middleware to do this job.

The middlewares SOC defaults within its handlers are:

- body-parser.json({strict: true})
- error handling for errors produced by the `http-errors` npm library, or those providing similar properties on thrown error objects.

You are free to override both of these middleware choices.

- body-parser is wrapped in a check that will not parse the body if req.body is already set, so as to not inferfere with your own body-parsing. You can supply your own middleware to override this.
- error handling can be overriden by providing your own error handler to the expressMiddleware option of createRouterFromSpec

Note that the built in error handler will use console.error to record errors, which is not ideal if you have your own logging framework. You can override this behavior by providing your own logger to SOC's middleware creator.

```ts
import pino from "pino";
import { createRouterFromSpec, createHandleHttpErrorsMiddleware } from "simply-openapi-controllers";

...

const router = createRouterFromSpec(openApiSpec, {
  expressMiddleware: [
    createHandleHttpErrorsMiddleware({
      logger: (err, ctx, message) => pino.error({err, ...ctx}, message)
    })
  ]
})
```

For best results, you should consider providing your own middleware for various purposes:

- Handling arbitrary non-http errors (ideally at the express application level)
- authentication and security (either globally, across the spec with the expressMiddleware option, or per-controler or per-method with the @UseExpressMiddleware() decorator)

You have a few choices of where to add your middleware:

- Globablly at your express app, or any router that preceeds the SOC router.
- In the SOC router, using the `expressMiddleware` option of `createRouterFromSpec`
- Targeting whole controllers, using the @UseExpressMiddleware() decorator
- Targeting individual handler methods, using the @UseExpressMiddleware() decorator.

## Returning status codes, headers, cookies, and non-json bodies.

From time to time, greater control is needed over the exact response sent by your handler. For example, you might send a Location header with the location of a newly created resource, or you may need to choose a status code
based on the action taken by the handler. For this, the `ResponseObject` exists.

This object provides a testable and mockable abstraction over the usual operations done to the express Response object. It can be used as a stand-in for injecting the express response, and is handled internally by an operation handler middleware provided by default.

(Note: If you need further customization, you can supply your own operation handler middleware to intercept and work with this object directly, or you can create your own return types and middleware).

Usage:

```ts
@Controller("/widgets")
class MyController {
  @Put("/", {
    summary: "Create or update widgets",
    tags: ["Widgets"],
  })
  putWidget(
    @RequireJsonBody("The widget to create or update", widgetSchema)
    body: Widget
  ) {
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

## Escaping SOC and using raw express requests and responses

Accessing express requests and responses directly can cause complications for development, as it complicates unit testing and hides the declarative requirements of your handler function.

However, no library can cover all use cases, so both the request and response objects can be made available to handlers using the `@Req` and `@Res` parameter decorators.
There is no way to access the `next` function, however, as controller methods are handled in their own middleware stack that differs from that of express.

```ts
@Controller("/")
class MyController {
  @Get("/")
  rawHandler(@Req() req: Request, @Res() res: Response) {
    ...
  }
}
```

Of particular note, if you plan on handling the response completely, ensure your method returns either undefined or a promise resolving to undefined. Passing results from
your handler will be intercepted by handler middleware and interpreted as endpoint results to be sent to the client.

All default result handlers in SOC interpret an undefined result to mean that the response was already handled and no further work is needed. However, there is a safty fallback in place
where if a function returns undefined, the very last handler middleware will ensure that res.headersSent is true. If not, it will throw an error. This is to guard against accidentally
not sending any response at all and leaving the request hanging. If this behavior is undesired, pass `ensureResponsesHandled: false` to the createRouterFromSpec function options.

## Enforcing return types at runtime

TODO

## Decorator reference

TODO
