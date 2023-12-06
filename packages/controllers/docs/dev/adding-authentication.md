# Adding Authentication

OpenAPI provides the ability to specify authentication in a few forms, which can be handled by creating Authentication Controllers.

## Defining Authenticators

Authenticator controllers are created with the `@Authenticator` decorator on a class that is passed as a controller along with your other controllers.
This decorator takes the name of your authentication scheme, as well as the OpenAPI specification of the scheme.

This class should implement the `AuthenticationController` interface, providing an `authenticate` function to process the request for authentication requirements.
This function will get called with the value of the authentication request, the scopes the endpoint requires, and a context providing the request, response, and detailed information
about the endpoint being called. It can be synchronous, or asynchronous, and have the following behavior:

- If authentication succeeds, it should return 'true', or an object containing details of the authentication which may be passed to the request method handler as input.
- If authentication fails, the function may:
  - return false
  - throw an error matching the HttpError interface of the `http-errors` library.

```typescript
import {
  Authenticator,
  AuthenticationController,
  RequestContext,
  HTTPBearerAuthenticationCredentials,
} from "@simply-openapi/controllers";
import { Unauthorized } from "http-errors";

@Authenticator("myAuth", {
  type: "http",
  scheme: "bearer",
})
class MyAuthenticator implements AuthenticationController {
  async authenticate(
    value: HTTPBearerAuthenticationCredentials,
    scopes: string[],
    ctx: RequestContext,
  ) {
    const user = await decodeBearerToken(value);
    if (!user) {
      // Returning false is the equivalent of throwing an Unauthorized http-error with the default message.
      return false;
    }

    // It is your responsibility to check the scopes in the authentication request.
    if (!scopes.every((cope) => user.scopes.includes(scope))) {
      // Thrown errors will be recorded.  If all authentication options reject the request,
      // the last thrown http-error will be used.
      throw new Unauthorized("Insufficient permissions");
    }

    // If authentication succeeds, you can return a value that will be passed to handler method arguments decorated to recieve
    // the authenticated user.  Any Non-falsy value will be interpreted as a successful auth.
    return user;
  }
}

// When creating the spec, pass the authenticator to the list of controllers.
const openApiSpec = createOpenAPIFromControllers(
  { title: "My App", version: "1.0.0" },
  [MyAuthenticator, ...controllers],
);
```

## Requiring Authentication

Authentication can be specified in 3 locations:

- At the top level of your OpenAPI schema, to get applied to every endpoint
- Per controller with the @RequireAuthentication decorator, to be applied only to methods in that controller
- Per method with the @RequireAuthentication decorator, to be applied only to that method

### Requiring authentication for all endpoints

The OpenAPI specification provides the `security` top level property, which specifies default security settings for all methods that do not themselves specify a security property.

This property is obeyed by the library, so setting it in your specification will appropriately gate all methods behind it, exception methods that override it.

To pass in this property, use the `addendOpenAPIFromControllers` method to generate the final OpenAPI schema given your starting fragment.

```typescript
import { OpenAPI } from "openapi3-ts/oai31";
import {
  Authenticator,
  AuthenticationController,
  HttpBearerAuthenticationCredentials,
  RequestContext,
  addendOpenAPIFromControllers,
  createRouterFromSpec
} from "@simply-openapi/controllers";

// Source the rest of your controllers that contain your endpoints.
import controllers from "./controllers";

// Define and implement a security strategy.
// This security scheme will be injected into the produced OpenAPI.
@Authenticator("myAuth", {
  type: "http",
  scheme: "bearer",
})
class MyAuthenticator implements AuthenticationController {
  async authenticate(value: HttpBearerAuthenticationCredentials, scopes: string[], ctx: RequestContext) {
    ...
  }
}

const mySpecFragment: OpenAPI = {
  info: {
    title: "My App",
    version: "1.0.0"
  },
  security: [
    {
      myAuth: ["myScope"]
    }
  ]
}

const openApiSpec = addendOpenAPIFromControllers(mySpecFragment, [MyAuthenticator, ...controllers]);
const router = createRouterFromSpec(openApiSpec);
```

### Requiring authentication on all methods of a controller

You can use the `@RequireAuthentication` decorator on a controller to annotate that all methods in that controller are gated behind the specified authentication scheme.

The first argument to `@RequireAuthentication` takes either a string name of the authentication scheme, or it can take a constructor for an AuthenticationController decorated with `@Authenticator`.

The second argument to `@RequireAuthentication` takes an array of scopes, all of which will be required to access the methods. Note that this is not handled automatically; your AuthenticationController must implement
its own logic to check the given scopes against the decoded credentials.

Since OpenAPI has no concept of a controller to group the methods by, the security specification will be repeated on every method in the controller.

```typescript
import { Controller, RequireAuthentication } from "@simply-openapi/controllers";

@Controller("/widgets")
@RequireAuthentication("myAuth", ["widgets.read"])
class WidgetsController {
  ...
}
```

For convienence and to reduce duplication, `@RequireAuthentication` can be given the class constructor of an existing `@Authenticator`-marked authentication controller. This is the equivalent of passing the scheme name defined in that decorator.

You must still pass the `@Authenticator`-decorated authentication controller to the list of controllers in `createOpenAPIFromControllers` or `addendOpenAPIFromControllers` in this case.

```typescript
import {
  Authenticator,
  AuthenticationController,
  HttpBearerAuthenticationCredentials,
  RequestContext,
  Controller,
  RequireAuthentication
} from "@simply-openapi/controllers";

@Authenticator("myAuth", {
  type: "http",
  scheme: "bearer",
})
class MyAuthenticator implements AuthenticationController {
  async authenticate(value: HttpBearerAuthenticationCredentials, scopes: string[], ctx: RequestContext) {
    ...
  }
}

@Controller("/widgets")
// This is the equivalent of `@RequireAuthentication("myAuth", ["widgets.read"])`
@RequireAuthentication(MyAuthenticator, ["widgets.read"])
class WidgetsController {
  ...
}
```

### Requiring authentication on a specific method

You can use the `@RequireAuthentication` decorator on a single method to annotate that the method is gated behind the specified authentication scheme.

The first argument to the decorator can either be a string specifying the name of the authenticator, or for convienence it may be the constructor of an authenticator class. In the case of the latter,
the authenticator class must still be passed as a controller to `createOpenAPIFromControllers`, or an error will be thrown when building the spec.

```typescript
import {
  Controller,
  RequireAuthentication,
  Get,
} from "@simply-openapi/controllers";

@Controller()
class WidgetController {
  @Get("/authenticated")
  @RequireAuthentication("myAuth", ["my-scope"])
  getAuthenticated() {
    return "OK";
  }
}
```

The OpenAPI specification indicates that multiple items in the `security` array act as an `any-of` fashion; if any entry in the list matches, the request is allowed. In support of this, you may specify `@RequireAuthentication` multiple times.

- If multiple `@RequireAuthentication` decorators specify the same security scheme, the scopes will be concatenated
- If multiple `@RequireAuthentication` decorators specify different security schemes, then **any** passing security scheme will allow access. Security schemes will be checked in-order, and the first passing one will be used.

### Retrieving the authentication result

`@RequireAuthentication` can be placed directly on method arguments. This will both ensure the user is authenticated, and provide the result of the authenticator to the decorated argument.

```typescript
import {
  Authenticator,
  AuthenticationController,
  HTTPBasicAuthenticationCredentials,
  RequestContext,
  Controller,
  RequireAuthentication,
  Get,
} from "@simply-openapi/controllers";

@Authenticator("BasicAuth", {
  type: "http",
  scheme: "basic",
})
class MyAuthenticator implements AuthenticationController {
  async authenticate(
    value: HTTPBasicAuthenticationCredentials,
    scopes: string[],
    ctx: RequestContext,
  ) {
    if (!validatePassword(value.username, value.password)) {
      return false;
    }

    const userData = await getUserData(value.username);

    return { username: value.username, ...userData };
  }
}

@Controller()
class WidgetController {
  @Get("/authenticated")
  getAuthenticated(
    @RequireAuthentication("myAuth", ["my-scope"])
    user: MyAuthUserType,
  ) {
    console.log("Got request from", user.username);
    return "OK";
  }
}
```

In the case of multiple security schemes, multiple parameters can be decorated.

Keep in mind that security schemes are tried in order of definition, and the library will stop at the first one to return a value. Due to this, you should only ever expect exactly one argument to be provided. All authentication decorators that were not used will have a value of `undefined`.

```typescript
import {
  Controller,
  RequireAuthentication,
  Get,
} from "@simply-openapi/controllers";
import { Unauthorized } from "http-errors";

@Controller()
class WidgetController {
  @Get("/authenticated")
  getAuthenticated(
    @RequireAuthentication("myFirstAuth", [])
    firstAuthUser: FirstAuthUserType | undefined,
    @RequireAuthentication("mySecondAuth", [])
    secondAuthUser: SecondAuthUserType | undefined,
  ) {
    if (firstAuthUser) {
      console.log(
        "Got a request covered by the first authentication:",
        firstAuthUser.id,
      );
    } else if (secondAuthUser) {
      console.log(
        "Got a request covered by the second authentication:",
        secondAuthUser.id,
      );
    } else {
      // This branch will theoretically never be hit, as your method will not be called if none of the provided authentication requirements are met.
      // However, it is best practice to include this anyway.
      throw new Unauthorized();
    }

    return "OK";
  }
}
```

## HTTP Basic authentication

The [HTTP Basic](https://swagger.io/docs/specification/authentication/basic-authentication/) authentication scheme takes an encoded (not encrypted) username and password from the `Authorization` header.
@simply-openapi/controllers will decode the credentials and pass your authenticator an object containing the `username` and `password` properties.

```typescript
import {
  Authenticator,
  AuthenticationController,
  HttpBasicAuthenticationCredentials,
  RequestContext,
  Controller,
  RequireAuthentication,
  Get,
} from "@simply-openapi/controllers";

@Authenticator("widgetAuth", {
  type: "http",
  scheme: "basic",
})
class WidgetAuthenticator implements AuthenticationController {
  async authenticate(
    value: HttpBasicAuthenticationCredentials,
    scopes: string[],
    ctx: RequestContext,
  ) {
    const user = await getUserByUsername(value.username);
    if (!checkPassword(value.password, user.hashedPassword)) {
      return false;
    }

    if (!scopes.every((scope) => user.scopes.includes(scope))) {
      return false;
    }

    return user;
  }
}

@Controller()
class WidgetController {
  @Get("/authenticated")
  getAuthenticated(
    @RequireAuthentication(WidgetAuthenticator, ["my-scope"])
    user: MyUser,
  ) {
    return "OK";
  }
}
```

## HTTP Bearer authentication

The [HTTP Bearer](https://swagger.io/docs/specification/authentication/bearer-authentication/) authentication scheme expects authentication in an `Authorization` header, prefixed with `Bearer `.
@simply-openapi/controllers will validate the presense of this header and the Bearer prefix, before extracting the payload (everything after `Bearer `) and passing it as the value to your authentication method.

Note that the `bearerFormat` OpenAPI property is descriptive only; the value indicates no special processing instructions for OpenAPI and is not interpreted by this library.

```typescript
import {
  Authenticator,
  AuthenticationController,
  HttpBearerAuthenticationCredentials,
  RequestContext,
  Controller,
  RequireAuthentication,
  Get,
} from "@simply-openapi/controllers";

@Authenticator("widgetAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
})
class WidgetAuthenticator implements AuthenticationController {
  async authenticate(
    value: HttpBearerAuthenticationCredentials,
    scopes: string[],
    ctx: RequestContext,
  ) {
    const user = await decodeJwt(value);

    if (!scopes.every((scope) => user.scopes.includes(scope))) {
      return false;
    }

    return user;
  }
}

@Controller()
class WidgetController {
  @Get("/authenticated")
  getAuthenticated(
    @RequireAuthentication(WidgetAuthenticator, ["my-scope"])
    user: Jwt,
  ) {
    return "OK";
  }
}
```
