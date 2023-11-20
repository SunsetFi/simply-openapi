# Simply OpenAPI Controllers

Read our documentation more easily on [GitBook](https://simply-openapi.gitbook.io/simply-openapi/readme/controllers)!

Simply OpenAPI Controllers is an ExpressJS compatible OpenAPI-First controller library. It produces fully robust method handlers on controllers by consuming an OpenAPI 3.1 specification and calling your handlers with all data pre-validated and coerced according to your specification.

It exposes its handlers as a single express middleware / router, allowing integration with express itself or with any library or framework that wraps it.

Don't have OpenAPI specs? No problem! SOC also provides decorators for your classes and methods that will create the openapi spec for you according to your handler usage and declaration.

SOC is designed to be a single-purpose library. It solves the use case of producing robust controllers and methods for web request handling, and does not dictate any design patterns beyond what it needs to do its job.\
It is highly extensible, supporting both the typical express middleware, plus its own middleware for method handlers, allowing you to integrate with the method creation for customizing both the inputs and outputs of your controller methods.

At its heart, this library provides two complementary systems:

* The ability to take decorated classes and methods, and produce robust complete OpenAPI specifications from them
* The ability to take OpenAPI specifications and wire them up to handlers, with all the boilerplate validation taken care of automatically.

## Usage

There are 2 ways to use SOC:

* [Produce both routers and OpenAPI schema from controllers and handler methods using decorators](docs/tutorial-controllers-with-automatic-openapi-generation.md) - Use this method if you do not wish to write your own OpenAPI specification and want to focus on writing handlers.
* [Produce routers from predefined OpenAPI schema and annotated controllers](../../readme/controllers/tutorial-binding-to-existing-openapi-spec.md) - Use this method if you want to have strongly declared API contracts that are auditable from outside the code.

