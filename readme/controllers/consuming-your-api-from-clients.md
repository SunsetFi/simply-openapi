# Consuming your API from clients

## Building a typing library by hand

TODO: Best practices for creating interfaces and schema

* manually written
* zod
* separate types and schemas for shared concepts (Opaque IDs)
* Eventually: @simply-openapi/schema-tools
  * All the usual stuff thats been copy-pasted between projects
    * jsonSchemaToOpenAPI()
    * arrayOf()
    * pickProperty()
    * omitProperty()
    * optional()
    * nullable()
    * default schemas
      * nonEmptyString
      * integerGTE1

## Auto-generating clients

TODO: Investigate further and provide examples.

Provide example of using kiota to build a client in a separate package at build time

[https://learn.microsoft.com/en-us/openapi/kiota/overview](https://learn.microsoft.com/en-us/openapi/kiota/overview)
