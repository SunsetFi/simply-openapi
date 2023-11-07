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

- Produce routers from OpenAPI schema adorned with `x-sec` extensions
- [TODO] Produce routers from unextended OpenAPI schema and controllers with `@OperationHandler()` decorators.
- [TODO] Produce both routers and OpenAPI schema from controllers with HTTP-descriptive decorators.
