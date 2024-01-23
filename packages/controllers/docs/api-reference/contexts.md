# Contexts

A large amount of information about operations and requests are shared across several systems. @simply-openapi/controllers passes this information in Context objects, which inherit from each other as the execution progresses from building operations to handling requests.

## OperationContext

This context provides detailed information about an OpenAPI Operation.

### Properties

- `spec` - Gets the root OpenAPI specification passed to `createMethodHandlerFromSpec`.
- `path` - Gets the request / operation path as it exists in the OpenAPI spec.
- `method` - Gets the request / operation method.
- `pathItem` - Gets the [Path Item Object](https://spec.openapis.org/oas/v3.1.0#path-item-object) this operation is defined in.
- `operation` - Gets the [Operation Object](https://spec.openapis.org/oas/v3.1.0#operationObject) this operation is defined in.
- `securitySchemes` - Gets a record of all resolved [Security Schemes](https://spec.openapis.org/oas/v3.1.0#security-scheme-object) defined in the OpenAPI specification, keyed by scheme name.
- `securities` - Gets the resolved [Security Requirements](https://spec.openapis.org/oas/v3.1.0#security-requirement-object) for this operation. This will either be those defined by the operation itself, or if the operation does not specify any, then the security schemes of the OpenAPI document will be used.
- `parameters` - Gets an array of the resolved [Parameter Objects](https://spec.openapis.org/oas/v3.1.0#parameter-object) of this operation. These may come from the operation itself, or the path item.
- `requestBody` - Gets the resolved [Request Body Object](https://spec.openapis.org/oas/v3.1.0#request-body-object) for this operation.

## OperationHandlerContext

This context provides information about a specific method handler on a controller. As methods implement operations, it inherits from OperationContext.

### Properties

In addition to all properties from the [OperationContext](#operationcontext), the following properties are available:

- `controller` - The resolved controller class instance the handler is attached to.
- `handler` - The resolved handler function that will handle the operation.
- `handlerArgs` - An array of argument definitions describing the purpose of each argument of the handler.

## OperationMiddlewareFactoryContext

This context is used for producing middleware to handle methods. As middleware factories run on specific methods, this context inherits from OperationHandlerContext

### Properties

In addition to all all properties from [OperationHandlerContext](#OperationHandlerContext), the following properties are available:

- `validators` - An object containing functions which will take an [OpenAPI 3.1 Schema](https://spec.openapis.org/oas/v3.1.0#schema-object) object, and return a function that attempts to validate and coerce its argument. If the data is valid, the cosersed value will be returned. If the data is invalid, an AJV `ValidationError` will be thrown with an array of [AJV Errors](https://ajv.js.org/api.html#validation-errors) in its `errors` property. For an example of this, see [Schema Based Validation](../dev/writing-handler-middleware.md#schema-based-validation).
  The following functions are available by default. They may be modified, or new validators may be added, through the `validatorFactories` option of `createRouterFromSpec`. [See here for more details](../dev/creating-express-routes.md#modifying-or-adding-openapi-schema-validators).
  - `createParameterValidator` - Creates a validator function that validates parameter objects. The validation will coerce types and apply defaults. Coercion is done in accordance with the [AJV Type Coercion Rules](https://ajv.js.org/coercion.html)
  - `createBodyValidator` - Creates a validator function that validates parameter objects. The validation will coerce types and apply defaults. Coercion is done in accordance with the [AJV Type Coercion Rules](https://ajv.js.org/coercion.html)
  - `createResponseValidator` - Creates a validator function that validates responses. No type coersion is done; types must match exactly.

## OperationRequestContext

This context is used when handling a specific network request. It inherits from the OperationHandlerContext.

### Properties

In addition to all properties from the [OperationHandlerContext](#OperationHandlerContext), the following properties are available:

- `req` - The express request object of this request.
- `res` - The express response object of this request.

### Methods

The following methods are available to simplify working with the request:

- `getPathParam(name)` - Gets the value of the path parameter of the given name.
- `getHeader(name)` - Gets the value of the header of the given name. This method is case insensitive.
- `getQuery(name)` - Gets the value of the query parameter with the given name.
- `getCookie(name)` - Gets the value of the cookie with the given name.

The following methods are available for working with [Request Data](../dev/request-data.md):

- `hasRequestData(key)` - Returns true if the request data specified by the key was ever set, or false if it was not. This will return `true` in cases where the request data was explicitly set to `undefined`.
- `getRequestData(key)` - Returns the request data for the specified key if set, or `undefined` if not.
- `setRequestData(key, value)` - Sets the request data for the specified key.
