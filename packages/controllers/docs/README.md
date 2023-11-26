# Simply OpenAPI Controllers

@simply-openapi/controllers is a library that produces robust, validated web request controllers using the OpenAPI specification as its source of truth. These specifications can take the form of decorators on your controllers, be provided externally, or a mix of both.

By deriving routers from the spec itself, this library guarentees that the specifications in the OpenAPI are accurate; requests not matching the spec are rejected automatically, and responses can be optionally validated before being sent out.

@simply-openapi/controllers restricts itself to solving problems in the controller / request handling domain, and no other. Its integration point is express routers, allowing it to be used without heavy frameworks, or integrated into the framework of your choice.

- [The benefits of generating routers from OpenAPI](forward-why-use-openapi.md)
- [Tutorial: Create routers and OpenAPI spec using decorators](dev/tutorial-automatic-openapi-controllers.md)
- [Tutorial: Create routers from existing OpenAPI spec](dev/tutorial-bound-openapi-controllers.md)
