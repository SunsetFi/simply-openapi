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
} from "@simply-openapi/controllers";
import { Unauthorized } from "http-errors";

@Authenticator("myAuth", {
  type: "http",
  scheme: "bearer",
})
class MyAuthenticator implements AuthenticationController {
  async authenticate(value: string, scopes: string[], ctx: RequestContext) {
    const user = await decodeBearerToken(value);
    if (!user) {
      return false;
    }

    if (!user.active) {
      throw new Unauthorized("User is inactive");
    }

    return user;
  }
}
```

## Requiring Authentication

Authentication is specified on a per-method level using the `@RequireAuthentication` decorator, which specifies the security scheme and any scopes that should be required.

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

If multiple authentication methods are allowed, the `@RequireAuthentication` decorator may be used multiple times. Per the OpenAPI specification definition, the method is invoked if any of the multiple authenticators allow the request.

## HTTP Bearer authentication

The [HTTP Bearer](https://swagger.io/docs/specification/authentication/bearer-authentication/) authentication scheme expects authentication in an `Authorization` header, prefixed with `Bearer `.
@simply-openapi/controllers will validate the presense of this header and the Bearer prefix, before extracting the payload (everything after `Bearer `) and passing it as the value to your authentication method.

```typescript
@Authenticator("widgetAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
})
class WidgetAuthenticator implements AuthenticationController {
  async authenticate(value: string, scopes: string[], ctx: RequestContext) {
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
  @RequireAuthentication(WidgetAuthenticator, ["my-scope"])
  getAuthenticated() {
    return "OK";
  }
}
```
