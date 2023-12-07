# Contexts

A large amount of information about operations and requests are shared across several systems. @simply-openapi/controllers passes this information in Context objects, which inherit from each other as the execution progresses from building operations to handling requests.

## OperationContext

This context provides detailed information about an OpenAPI Operation.

## MethodHandlerContext

This context provides information about a specific method handler on a controller. As methods implement operations, it inherits all properties from OperationContext.

## OperationMiddlewareFactoryContext

This context is used for producing middleware to handle methods. As middleware factories run on specific methods, this inherits all properties from MethodHandlerContext

## RequestContext

This context is used when handling a specific network request. It inherits all properties from MethodHandlerContext.
