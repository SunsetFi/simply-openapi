# Simply OpenAPI

Simply OpenAPI is a collection of tools for simplifying development of OpenAPI compliant backends.

Its core philosophy is that the OpenAPI spec for your backend should be the primary source of truth of all behaviors. Endpoints, data validation, and data types should all be well-defined in the openapi schema and reflect the exact behaviors of the endpoints produced.

To this end, the tools in this library are designed around two use cases:

- Automatic generation of OpenAPI specs from web request controllers that accurately reflect the endpoint, including enforcement of validation against endpoint schemas for parameters, bodies, and return types.
- Binding of controllers to pre-existing hand written OpenAPI specifications, with automatic implementation of boilerplate validation against the parameter, body, and return type specs defined by that specification.

## Libraries in this collection

- [Simply OpenAPI Controllers](/packages/controllers)
  Production of OpenAPI spec from controllers, binding of controllers to existing specs, and the creation of Express routers from the spec and controllers.

## Example implementations

- [Simple Example](/examples/simple)
  A basic example of using Simply OpenAPI Controllers
