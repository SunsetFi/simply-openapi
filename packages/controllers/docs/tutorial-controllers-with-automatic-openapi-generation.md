# Tutorial: Controllers with Automatic OpenAPI Generation

By far the most common use case when creating backends in the wild is that the code and functionality come first, and documentation comes after. @simply-openapi/controllers is designed with this approach as a first class concept, supporting the generation of accurate and exacting OpenAPI specifications from the controllers themselves. This produces the document that can then be fed back into the library, producing the express router that will handle all of the validation and invocation of the controller methods.

This tutorial will cover creating controllers and producing the OpenAPI spec from them.  For learning how to turn the resulting spec into an express router, see [Creating an Express Route](creating-an-express-route-from-your-controllers.md).

## Writing a Controller

Controllers take the form of class objects, which uniquely are able to be decorated to add additional metadata.

Starting out with a controller is easy, we just need a class, with an optional `@Controller` decorator to describe more about it:

```typescript
import { Controller } from "@simply-openapi/controllers";

@Controller("/widgets", { tags: ["widgets"] })
class WidgetController {}
```

Here we have a controller which will nest all of its methods underneath the `/widgets/*` path. We also add additional OpenAPI tags which we would like to apply to all methods contained in this controller.

Note that both arguments here are optional. `@Controller()` would create a controller at the root URL with no tags.

Strictly speaking, the `@Controller` decorator isn't required at all, and the library will do its best with the class if one is not present. However, it is best practice to use them, even for root routes, so as to make it obvious what the class is to be used for.

## Creating a Method

Methods are decorated functions within our controller class. At their most basic, all they need is a decorator describing which HTTP method to use, and to return a value (or a promise of a value) that the library (or one if its provided middleware handlers) is capable of sending back as a response:

```typescript
import { Controller, Get } from "@simply-openapi/controllers";

import { getWidgets } from "../widgets";

@Controller("/widgets", { tags: ["widgets"] })
class WidgetController {
  @Get("/", { description: "Gets all widgets" })
  async getWidgets() {
    const widgets = await getWidgets();
    return widgets;
  }
}
```

This simple method will listen on `/widgets` for get requests, and asynchronously fetch widgets from the `getWidgets` function. As these will be plain JSON objects, they can be returned directly from the handler and @simply-openapi/controllers will interpret that as a request to send a 200 OK back with the `application/json` content type, with the body being the JSON serialized form of the result.

Note that you can send any status code, and customize the results handling to fit any use case you may have. See further on in this tutorial for information about custom responses and bodies, or consider [Writing custom handler middleware](writing-handler-middleware.md) to interpret results as you wish.

Now that we have a method in our controller, let's take a look at what OpenAPI spec will be generated from this:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My Example Schema",
    "version": "1.0.0"
  },
  "paths": {
    "/widgets": {
      "get": {
        "operationId": "WidgetController.getWidgets",
        "description": "Gets all widgets",
        "tags": [
          "widgets"
        ],
        "x-simply-controller-method": { ... }
      }
    }
  }
}
```

As you see, we have not declared any validation or return types, but already the framework of our method has been documented.

Take note of the `x-simply-controller-method` extension data stored on the operation object. This contains metadata about your controller and method that @simply-openapi/controllers can later use to build functioning express routers from this spec. Knowing of its presence can be useful as it provides a good view into how the library is handling your method, but it is otherwise undesirable to publish specs containing it. For more information about publishing the generated spec, see [Publishing your OpenAPI specification](../../../readme/controllers/publishing-your-openapi-specification.md).

This extension will be omitted from future examples for brevity.

### Documenting and validating the return type

While we have a good start, the lack of return type documentation is bound to make this spec less than useful, so lets rectify that.

First, it is good practice to have the specification of your api objects defined alongside their typescript interfaces, to provide both design time and run time type safety of your objects.

```typescript
import { ScemaObject } from "openapi3-ts/oas31";

export interface Widget {
  id: number;
  name: string;
}

export const widgetSchema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "integer", minimum: 1 },
    name: { type: "string", minLength: 1 },
  },
  required: ["id", "name"],
};
```

Ideally, these would be defined in a separate file so as to be reusable across controllers and services.

You may have noticed the redundancy of information between the interface and the schema. While this shouldn't be too much of a problem for small projects, this does open up opportunities for the validation/docs and the build time assertions to get out of sync. To solve this, you may consider using the [Zod Library](reducing-interface-and-schema-duplication-with-zod.md) to produce both interface and schema from a single declaration.

Once you have your schema ready, we can then add it to our method with the `JsonResponse` decorator

```typescript
import { Controller, Get, JsonResponse } from "@simply-openapi/controllers";

import { widgetSchema, getWidgets } from "../widgets";

@Controller("/widgets", { tags: ["widgets"] })
class WidgetController {
  @Get("/", { description: "Gets all widgets" })
  @JsonResponse(
    200,
    { type: "array", items: widgetSchema },
    { description: "All widgets" },
  )
  async getWidgets() {
    const widgets = await getWidgets();
    return widgets;
  }
}
```

Note that since we are dealing with the common case of JSON values, we are using the `@JsonResponse` decorator. If you have more exacting requirements for your response documentation or want to use other content types, the `@Response` decorator provides the best API for custom sculpting what responses an operation may provide.

With this change, let's see what our PathItem looks like now?

```json
{
  ...
    "/widgets": {
      "get": {
        "operationId": "WidgetController.getWidgets",
        "responses": {
          "200": {
            "description": "All widgets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "integer",
                        "minimum": 1
                      },
                      "name": {
                        "type": "string",
                        "minLength": 1
                      }
                    },
                    "required": [
                      "id",
                      "name"
                    ]
                  }
                }
              }
            }
          }
        },
        "description": "Gets all widgets",
        "tags": [
          "widgets"
        ]
      }
    }
  }
```

#### A note on the enforceability of response contracts

While we should strive to make our OpenAPI contracts as accurate as possible, it may not always be advisable to enforce response body contracts at runtime. Failing a handler for returning an object that does not match the contract may muddy the waters if the endpoint has otherwise performed stateful changes, such as for a POST request.

Because of this, responses are not validated by default like all other OpenAPI spec declarations. This can be enabled optionally, such as in a development environment or when performing e2e testing.  For more information, see [Creating an Express Route from your OpenAPI specification](creating-an-express-route-from-your-controllers.md).

#### A note on the re-usability of typings

Eventually, your back-end will be accessed by a client. To make things easier, you may wish to keep your typings and schemas in a separate package, so that front-ends can import the typings and use them on the client side. This will save both sides having to implement the typings and ensure the typings stay in sync.

For more information, see [Consuming your API from clients](../../../readme/controllers/consuming-your-api-from-clients.md).

### Getting input

Handling input is one of the more sensitive areas of endpoint design. Untrusted input from outside your control can cause serious problems in an application if not properly validated. Because of this, @simply-openapi/controllers was developed with input validation against the schema as the highest priority.

As a result of this design decision, all decorators for taking input require an OpenAPI schema object as a required parameter. This schema will be documented in the spec as well as strictly validated and coerced into the input value for your handler.

The extra effort for producing specification for all your inputs may seem like a drag, but the amount of boilerplate validation and error handling that would otherwise need to be written outweighs the drawbacks.

#### Query Parameters

Query parameters are the simplest form of input a method can receive, requiring a simple `@QueryParam` or `@RequiredQueryParam` decorator on the argument of your choice

```typescript
import {
  Controller,
  Get,
  JsonResponse,
  QueryParam,
} from "@simply-openapi/controllers";

import { widgetSchema, getWidgets } from "../widgets";

@Controller("/widgets", { tags: ["widgets"] })
class WidgetController {
  @Get("/", { description: "Gets all widgets" })
  @JsonResponse(
    200,
    { type: "array", items: widgetSchema },
    { description: "All widgets" },
  )
  async getWidgets(
    @QueryParam(
      "nameContains",
      { type: "string", minLength: 1 },
      { description: "Filters widgets by name match" },
    )
    nameContains: string | undefined,
  ) {
    const widgets = await getWidgets({ nameContains });
    return widgets;
  }
}
```

This query parameter decorator has two functions:

* It documents the query parameter in the OpenAPI spec, which will later be used to validate incoming requests.
* It connects the handler's `nameContains` argument to that query parameter, letting you receive the parameter value when properly validated requests hit your endpoint.

Peeking into the schema, we can now see our parameter defined

```json
{
    ...
    "/widgets": {
      "get": {
        "operationId": "WidgetController.getWidgets",
        "parameters": [
          {
            "in": "query",
            "name": "nameContains",
            "description": "Filters widgets by name match",
            "schema": {
              "type": "string",
              "minLength": 1
            }
          }
        ],
        ...
      }
    }
}
```

#### Path Parameters

Path parameters are slightly more complex as they need to be coupled with patterns in the URL to indicate the location of the parameter. Beyond this, their decorators are identical to those of query parameters.

```typescript
import {
  Controller,
  Get,
  JsonResponse,
  EmptyResponse,
  QueryParam,
  PathParam
} from "@simply-openapi/controllers";
import { NotFound } from "http-errors";

import {
  widgetSchema,
  getWidgets
} from "../widgets";

@Controller("/widgets", {tags: ["widgets"]})
class WidgetController {
  ...

  @Get("/:widget_id", { description: "Gets a widget by id" })
  @JsonResponse(
    200,
    widgetSchema,
    { description: "The fetched widget" }
  )
  @EmptyResponse(404, { description: "Widget not found" })
  async getWidgets(
    @PathParam(
      "widget_id",
      "integer",
      { description: "The ID of the widget to fetch" }
    )
    widgetId: number
  ) {
    const widget = await getWidgetById(widgetId);
    if (!widget) {
      throw new NotFound();
    }
    return widgets;
  }
}
```

As you can see, we are using the `:widget_id` stand-in for our path parameter. This style of specifying parameters is native to express, and is the chosen form for path parameters in this library. OpenAPI uses an alternate form, surrounding the parameter in curly braces, such as `{widget_id}`. Currently, only the express form is supported in the decorator paths. However, the library will properly convert to the OpenAPI form when generating the specification.

Additionally, you may notice that instead of passing an OpenAPI schema object, we are passing the string `"integer"`. This is a shorthand for when you only want to validate the data type and have no other additional validations. This shorthand converts to:

```json
{
  "type": "integer"
}
```

#### A note on the types and schemas of common inputs

The concept of a widget id is one that would be used heavily in an application, so the most maintainable approach would be to declare both the schema for a widget id, and a typing for it, in a shared location. For example, we may wish to tweak our widget definition like this:

```typescript
import { ScemaObject } from "openapi3-ts/oas31";

export type WidgetId = number;
export const widgetIdSchema: SchemaObject = {
  type: "integer",
  minimum: 1,
};

export interface Widget {
  id: WidgetId;
  name: string;
}

export const widgetSchema: SchemaObject = {
  type: "object",
  properties: {
    id: widgetIdSchema,
    name: { type: "string", minLength: 1 },
  },
  required: ["id", "name"],
};
```

With this change, we can now reference WidgetId as its own type and make use of its schema wherever it is required.

For even better results, consider turning WidgetId into an [Opaque Type](https://dev.to/boyum/use-opaque-types-to-improve-typing-on-basic-types-3opm), so that it cannot be accidentally passed to functions taking IDs of other entity types.

#### Headers and Cookies

Headers and cookies are no different than any of the parameters we have discussed so far, and are used exactly the same way. Their decorators use the same API as the two we have seen. The available decorators are:

* `@Cookie(name, schema, spec?)`
* `@RequiredCookie(name, schema, spec?)`
* `@Header(name, schema, spec?)`
* `@RequiredHeader(name, schema, spec?)`

As before, these are parameter decorators, and should be put on function arguments. The cookie or header will be validated against the rules you specify and, if they pass validation, your handler will be invoked with the cookie or header content inside the argument.

#### Body arguments

Bodies are unique among input as they can take different forms and content types, even on the same handler.

However, for the majority use case, @simply-openapi/controllers provides two decorators for working specifically with JSON bodies. As the presence or absence of a body tends to be more important and specific than the optionality of query parameters, the decorators are prefixed with this fact:

* `@OptionalJsonBody`
* `@RequiredJsonBody`

You can use either of these decorators to describe and receive the body sent to your endpoint. As always, a schema is required, and the body will be validated against the schema, with invalid bodies resulting in a 400 error.

```typescript
import {
  Controller,
  Get,
  JsonResponse,
  EmptyResponse,
  QueryParam,
  PathParam,
  RequiredBody
} from "@simply-openapi/controllers";
import { NotFound } from "http-errors";

import {
  widgetSchema,
  getWidgets
} from "../widgets";

@Controller("/widgets", {tags: ["widgets"]})
class WidgetController {
  ...

  @Post("/", { description: "Create a widget" })
  @JsonResponse(
    201,
    widgetSchema,
    { description: "The widget was created" }
  )
  @EmptyResponse(400, { description: "Bad Request" })
  async addWidget(
    @RequiredBody(
      creatableWidgetSchema,
      { description: "The ID of the widget to fetch" }
    )
    body: CreatableWidget
  ) {
    return await addWidget(body);
  }
}
```

With this, we now have a validated body.

## Returning Results

So far, all examples have returned promises to plain JSON objects. This is the most common pattern, and will result in a 200 status code being sent with the body containing the JSON-serialized object and the "Content-Type" header set to "application/json". However, this is not the only way to do things.

### Specifying the status code, headers, and cookies

Sometimes it is appropriate to send back different status codes and headers. For example, we might have a `newWidget` handler that should:

* Return a 201 CREATED status code
* Set the Location header to the location of the new widget

This can be done through the `HandlerResult` special return type. Lets modify our previous example to account for this.

```typescript
import {
  Controller,
  Get,
  JsonResponse,
  EmptyResponse,
  QueryParam,
  PathParam,
  RequiredBody,
  HandlerResult
} from "@simply-openapi/controllers";
import { NotFound } from "http-errors";

import {
  widgetSchema,
  getWidgets
} from "../widgets";

@Controller("/widgets", {tags: ["widgets"]})
class WidgetController {
  ...

  @Post("/", { description: "Create a widget" })
  @JsonResponse(
    201,
    widgetSchema,
    { description: "The widget was created" }
  )
  @EmptyResponse(400, { description: "Bad Request" })
  async addWidget(
    @RequiredBody(
      creatableWidgetSchema,
      { description: "The ID of the widget to fetch" }
    )
    body: CreatableWidget
  ) {
    const widget = await addWidget(body);
    return HandlerResult
      .status(201)
      .header("Location", `${baseUrl}/widgets/${widget.id}`)
      .json(widget)
  }
}
```

HandlerResult is a dedicated class allowing you to describe some of the more web-centric behavior of a response without having to take a reference to the express response and run things manually.

The HandlerResult provides these functions. Note that all functions exist as static functions on the class, and as instance functions, to allow for a fluent UI without the use of the 'new' keyword.

* body(value)
  * Sent to the result with req.body()
  * Stored in `_bodyRaw`
* json(value)
  * Sent to the result with req.json()
  * The "Content-Type" header will be set to "application/json"
  * Stored in `_bodyJson`
* status(code)
  * Sent to the result with req.status()
  * Stored in `_status`
* header(key, value)
  * Set with res.setHeader()
  * Stored mapped by key in the `_headers` object.
* cookie(key, value, settings?)
  * Set with res.cookie()
  * Stored mapped by key in the `_cookies` object.

The main benefit of doing it this way is that it is much more testable than needing to mock a traditional express response. HandlerResult is declarative, and holds the passed information until processed by a handler middleware. This allows for greatly simplified unit tests

```typescript
it("returns the status and location", async function () {
  const sut = new WidgetController();

  const name = "My Widget";
  const result = await sut.addWidget({ name });

  expect(result).toMatchObject({
    _status: 201,
    _headers: {
      Location: expect.any(String),
    },
    _bodyJson: {
      id: expect.any(Number),
      name,
    },
  });
});
```

#### Making your own result handlers

@simply-openapi/controllers allows you to write your own handler middleware, providing you the opportunity to handle controller method results however you please.

{% content-ref url="writing-handler-middleware.md" %}
[writing-handler-middleware.md](writing-handler-middleware.md)
{% endcontent-ref %}

### Escaping into Express

No matter how carefully a framework is written, there will always be cases where the request and response objects are needed. These are provided with the `@Req` and `@Res` decorators respectively.

```typescript
import {
  Controller,
  Get,
  JsonResponse,
  EmptyResponse,
  Req,
  Res
} from "@simply-openapi/controllers";
import { Request, Response } from "express;

import {
  widgetSchema,
  getWidgets
} from "../widgets";

@Controller("/widgets", {tags: ["widgets"]})
class WidgetController {
  ...

  @Post("/", { description: "Create a widget" })
  @JsonResponse(
    201,
    widgetSchema,
    { description: "The widget was created" }
  )
  @EmptyResponse(400, { description: "Bad Request" })
  async addWidget(
    @Req() req: Request,
    @Res() res: Response
  ) {
      // Your logic here.
      return undefined;
  }
}
```

Note that if you do handle the response in your method, you should ensure your method returns no result, or returns undefined explicitly. Handler middleware interprets an undefined response as an indication that the request was already handled and no further processing is needed.

To prevent you from accidentally leaving a request hanging, the library will throw an error by default if it completes the middleware stack for a handler and the response has not yet sent its headers. This is an optional feature that can be turned off at the router creation step.

## Creating the OpenAPI specification from your controllers

Now that you have a controller, the next step is to build the OpenAPI specification.  From this, we can further create an express router to invoke our controllers.

{% content-ref url="../../../readme/controllers/creating-openapi-specs-from-controllers.md" %}
[creating-openapi-specs-from-controllers.md](../../../readme/controllers/creating-openapi-specs-from-controllers.md)
{% endcontent-ref %}
