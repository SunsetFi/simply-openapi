# Forward: Why derive behavior from OpenAPI

Before getting into the specifics of this library, its important to know what makes OpenAPI so powerful as a source to derive our handlers from.

OpenAPI is very expressive when it comes to the specification of the inputs and outputs of handler functions. An OpenAPI spec can define the exact shape and requirements of parameters, bodies, and even response types that differ across status codes and content types. All of this information encapsulates declarative instructions that normally would be implemented by the developers: Type checks, null checks, coercion, casting, default values, and error handling. All these concerns provide a great amount of boilerplate that must be written for all endpoint handlers. However, since OpenAPI already defines all of this, why not derive it programmatically and automate away such boilerplate?

This is the core concept of @simply-openapi/controllers.

## The Benefits of Code-Generated OpenAPI spec

At first glance, it might seem that this does not matter when you want a code-first approach; where endpoints are written first and the OpenAPI spec is derived from them. However, even in this case, having the spec have a one to one relation with all contracts and validation of your handlers provides a robust way of tracking and managing your APIs.

With this relation, OpenAPI now becomes your litmus test for the controllers themselves. Want to ensure an API contract does not change? Put a snapshot test on it. Want to test that a query parameter is validated as only accepting numbers? Unit test the resulting spec. The specification becomes highly accurate metadata to your controllers. This greatly simplifies the process of ensuring your APIs behave in the way you expect them to, and catches any inadvertent changes that might occur over the course of the software development lifecycle.

{% content-ref url="dev/tutorial-automatic-openapi-controllers.md" %}
[tutorial-automatic-openapi-controllers.md](dev/tutorial-automatic-openapi-controllers.md)
{% endcontent-ref %}

## The Benefits of OpenAPI-First controller design

Generating the spec from controller is great for rapid application development, but in some cases you may want fine tuned control over your API contracts. Developing your API specs individually and separately from the code can provide a much greater focus to the needs and requirements of the application. Or maybe you have an API contract already provided by a third party that you need to match, where deviations from the spec can lead to compatibility problems down the line.

In such cases, it is better to directly defer to the spec from the code for all things. Handler methods can ask for operations by their ID, and take in parameters by parameter name. All of the validation boilerplate is still handled, and this time it is exactly to the requirements laid out by the original author of the spec.

{% content-ref url="dev/tutorial-bound-openapi-controllers.md" %}
[tutorial-binding-to-existing-openapi-spec.md](dev/tutorial-bound-openapi-controllers.md)
{% endcontent-ref %}

## What does OpenAPI define anyway?

Let's take this simple example, straight from the OpenAPI documentation:

```json
{
  "openapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Swagger Petstore",
    "license": {
      "name": "MIT"
    }
  },
  "servers": [
    {
      "url": "http://petstore.swagger.io/v1"
    }
  ],
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
        "responses": {
          "200": {
            "description": "Expected response to a valid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pet"
                }
              }
            }
          },
          "default": {
            "description": "unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "tag": {
            "type": "string"
          }
        }
      },
      "Pets": {
        "type": "array",
        "maxItems": 100,
        "items": {
          "$ref": "#/components/schemas/Pet"
        }
      },
      "Error": {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

Encapsulated in this document is a significant amount of data about how our endpoint should function. All request inputs and outputs are accounted for and their expectations described.

To dig deeper, this particular spec gives us quite a lot of information on exactly how our handlers should act:

For /pets/:petId

- The value of the petId parameter must be a number, and should fail for anything else.
- If the response code is 200, it should return a valid Pet object according to the defined schema for an Accept of application/json, and no other accept type is supported.
- For any other response code, it should return an Error object according to the defined schema.

All of this would normally have to be implemented manually by the developers writing the endpoint. However, since we have the OpenAPI spec, we have a definitive 'source of truth' for as to how the handler should behave; defining validation for both for incoming and outgoing data.

@simply-openapi/controllers provides this validation, and abstracts away the details of the request into their component parameters, body, and response. Any request not conforming to the spec will automatically be rejected with appropriate error codes, leaving your handlers to only deal with the domain logic you are representing with your endpoint:

- Path parameters, query parameters, and request bodies will be validated against their schema. If the schema doesn't match, the handling method will not be called and the appropriate HTTP error will be returned.
- Parameters and bodes will be coerced to the schema. If the schema type of a path parameter indicates an integer, then it will only accept only valid integers. String data that represents a valid integer will be converted to a numerical data type before being forwarded to the relevant handler method.
- Default values supplied by the spec will be populated, so optional body objects that supply defaults will have those defaults when it reaches the handler method.
- Response contracts are still contracts! Optional support is provided for validating all outgoing data to ensure your service is responding with what it is documented as responding. This can be enforced in development, and log warnings in production.
