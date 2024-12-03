# Tutorial: Binding to existing OpenAPI spec

For times when you want complete control over your API spec, @simply-openapi/controllers can connect your controllers directly to pre-existing OpenAPI spec. The existing spec will be used to define all operation validation, authentication, and behavior, and requests will be properly vetted before being handed off to the controllers.

In @simply-openapi/controllers, the term for connecting to a pre-existing openapi spec is called `binding`.

## Creating a bound controller

A controller can be decorated as being used exclusively for methods handling existing spec. This is done with the `@BindController` decorator.

```typescript
@BindController()
class PetstoreController {}
```

This decorator takes no arguments, as all behavior is specified on each operation defined within.

This decorator is largely semantic. It is not required, and bound methods can even be included in non-bound controllers. However, it is best to keep a clean seperation and use it wherever possible.

## Binding a method to an existing operation

[Operations](https://spec.openapis.org/oas/v3.1.0#operation-object) are the unit endpoint specifiers of OpenAPI, and it to these that the methods of a bound controller will attach to.

The `@BindOperation` decorator is used on controller methods, and specifies which operation within the OpenAPI spec this method should handle. This is done by matching the `operationId` property of your operation.

For example, with the given OpenAPI spec:

```json
{
  ...
 "paths": {
    "/pets/{petId}": {
      "get": {
        "summary": "Info for a specific pet",
        "operationId": "showPetById",
        "tags": ["pets"],
        "parameters": [ ... ],
        "responses": { ... }
      }
    }
 }
}
```

The `/pets/{petId}` endpoint can be bound to like this:

```typescript
@BindController()
class PetstoreController {
  @BindOperation("showPetById")
  async showPetById(...) {
    ...
  }
}
```

## Binding parameters

Of course, this method has a parameter. Parameters of any sort can be bound using `@BindParam`.

```json
{
  ...
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
        "responses": { ... }
      }
    }
 }
}
```

```typescript
@BindController()
class PetstoreController {
  @BindOperation("showPetById")
  async showPetById(
    @BindParam("petId")
    petId: number
  ) {
    ...
  }
}
```

It is important to remember that your entire specification will be enforced regardless if you use `@BindParam` or not. The decorator only serves as an indicator to fetch the processed value. Without it, the library will still enforce required parameters and their schema types, even if they go unused.

## Binding the request body

The request body is recieved through a method handler argument decorated with `@BindBody`. As before, the body will be validated and transformed according the the OpenAPI schema, and invalid bodies will be rejected without invoking the handler.

## Binding user authorization

OpenAPI does not define the shape of authenticated users to the backend, only the means and scopes. However, the @simply-openapi/controllers Authenticators that process authentication have the option of returning details about the user, which you can fetch with `@BindSecurity()`.

As with all bound decorators, this is not responsible for ensuring the authorization is met, and the method will be properly gated behind the security authentication check even when this decorator is not present.
