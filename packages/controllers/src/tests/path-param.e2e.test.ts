import { OpenAPIObject, PathsObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { NotFound } from "http-errors";

import { Controller, Get, OpenAPI, PathParam } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Path Param", function () {
  const openApiHandler = jest.fn();
  const expressHandler = jest.fn();
  const refHandler = jest.fn();

  beforeEach(() => {
    openApiHandler.mockReset();
    expressHandler.mockReset();
    refHandler.mockReset();
  });

  @Controller("/")
  @OpenAPI({
    components: {
      schemas: {
        refParam: {
          type: "integer",
        },
      },
    },
  })
  class WidgetController {
    @Get("/openapi/{foo}")
    getOpenAPIStyle(
      @PathParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      openApiHandler(foo);
      return { bar: true };
    }

    @Get("/express/:foo")
    getExpressStyle(
      @PathParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      expressHandler(foo);
      return { bar: true };
    }

    @Get("/ref/{refParam}")
    getRef(
      @PathParam("refParam", { $ref: "#/components/schemas/refParam" })
      param: number,
    ) {
      refHandler(param);
      return { bar: true };
    }
  }

  let spec: OpenAPIObject;
  let router: Router;
  beforeAll(() => {
    spec = createOpenAPIFromControllers({ title: "Test", version: "1.0.0" }, [
      new WidgetController(),
    ]);
    router = createRouterFromSpec(spec);
  });

  it("generates the appropriate OpenAPI schema", function () {
    expect(spec).toMatchObject({
      paths: {
        "/openapi/{foo}": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "path",
                required: true,
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
            responses: {},
          },
        },
        "/express/{foo}": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "path",
                required: true,
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
            responses: {},
          },
        },
        "/ref/{refParam}": {
          get: {
            parameters: [
              {
                name: "refParam",
                in: "path",
                required: true,
                schema: { $ref: "#/components/schemas/refParam" },
              },
            ],
            responses: {},
          },
        },
      } satisfies PathsObject,
      components: {
        schemas: {
          refParam: { type: "integer" },
        },
      },
    });
  });

  describe("openapi param", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/openapi/123");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(openApiHandler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns not found for an invalid param", function (done) {
      const req = getMockReq("GET", "/openapi/aaa");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).toHaveBeenCalledWith(expect.any(NotFound));

          expect(openApiHandler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("express param", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/express/123");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(expressHandler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns not found for an invalid param", function (done) {
      const req = getMockReq("GET", "/express/aaa");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).toHaveBeenCalledWith(expect.any(NotFound));

          expect(expressHandler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("ref param", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/ref/123");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(refHandler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns not found for an invalid param", function (done) {
      const req = getMockReq("GET", "/ref/aaa");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).toHaveBeenCalledWith(expect.any(NotFound));

          expect(refHandler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });
});
