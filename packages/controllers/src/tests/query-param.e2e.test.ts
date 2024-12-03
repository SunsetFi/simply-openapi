import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { BadRequest } from "http-errors";
import "jest-extended";

import { Controller, Get, QueryParam, RequiredQueryParam } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Query Param", function () {
  const handler = jest.fn();

  beforeEach(() => {
    handler.mockReset();
  });

  @Controller("/")
  class WidgetController {
    @Get("/opt")
    getOptionalParam(
      @QueryParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      handler(foo);
      return null;
    }

    @Get("/req")
    getRequiredParam(
      @RequiredQueryParam("foo", "integer", {
        description: "The foo parameter",
      })
      foo: number,
    ) {
      handler(foo);
      return null;
    }

    @Get("/formArrayOnly")
    formArrayOnly(
      @RequiredQueryParam(
        "foo",
        { type: "array", items: { type: "number" } },
        {
          style: "form",
          explode: false,
        },
      )
      foo: number[],
    ) {
      handler(foo);
      return null;
    }

    @Get("/formArrayOnlyExplode")
    formArrayExplode(
      @RequiredQueryParam(
        "foo",
        { type: "array", items: { type: "number" } },
        {
          style: "form",
          explode: true,
        },
      )
      foo: number[],
    ) {
      handler(foo);
      return null;
    }

    @Get("/formArrayOrPrimitive")
    formArrayOrPrimitive(
      @RequiredQueryParam(
        "foo",
        {
          oneOf: [
            { type: "array", items: { type: "number" } },
            { type: "number" },
          ],
        },
        {
          style: "form",
          explode: false,
        },
      )
      foo: number[] | number,
    ) {
      handler(foo);
      return null;
    }

    @Get("/formArrayOrPrimitiveExplode")
    formArrayOrPrimitiveExplode(
      @RequiredQueryParam(
        "foo",
        {
          oneOf: [
            { type: "array", items: { type: "number" } },
            { type: "number" },
          ],
        },
        {
          style: "form",
          explode: true,
        },
      )
      foo: number[] | number,
    ) {
      handler(foo);
      return null;
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
        "/opt": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
          },
        },
        "/req": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                required: true,
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
          },
        },
        "/formArrayOnly": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                required: true,
                schema: { type: "array", items: { type: "number" } },
                style: "form",
                explode: false,
              },
            ],
          },
        },
        "/formArrayOnlyExplode": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                required: true,
                schema: { type: "array", items: { type: "number" } },
                style: "form",
                explode: true,
              },
            ],
          },
        },
        "/formArrayOrPrimitive": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                required: true,
                schema: {
                  oneOf: [
                    { type: "array", items: { type: "number" } },
                    { type: "number" },
                  ],
                },
                style: "form",
                explode: false,
              },
            ],
          },
        },
        "/formArrayOrPrimitiveExplode": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "query",
                required: true,
                schema: {
                  oneOf: [
                    { type: "array", items: { type: "number" } },
                    { type: "number" },
                  ],
                },
                style: "form",
                explode: true,
              },
            ],
          },
        },
      },
    });
  });

  describe("optional", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/opt?foo=123", {
        query: { foo: "123" },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(handler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns undefined for an unpassed param", function (done) {
      const req = getMockReq("GET", "/opt", {
        query: {},
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(handler).toHaveBeenCalledWith(undefined);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns bad request for an invalid param", function (done) {
      const req = getMockReq("GET", "/opt?foo=123", {
        query: { foo: "aaa" },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expectNextCalledWithError(
            next,
            BadRequest,
            /Query parameter "foo" is invalid: value must be integer/,
          );

          expect(handler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("required", function () {
    it("returns bad request for an unpassed param", function (done) {
      const req = getMockReq("GET", "/req", {
        query: {},
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expectNextCalledWithError(
            next,
            BadRequest,
            /Query parameter "foo" is required./,
          );

          expect(handler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("styles", function () {
    describe("form", function () {
      describe("formArrayOnly", function () {
        it("accepts multiple values", function (done) {
          const req = getMockReq("GET", "/formArrayOnly", {
            query: { foo: "1,2,3" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1, 2, 3]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });

        it("accepts a single value", function (done) {
          const req = getMockReq("GET", "/formArrayOnly", {
            query: { foo: "1" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });
      });
      describe("formArrayOnlyExplode", function () {
        it("accepts multiple values", function (done) {
          const req = getMockReq("GET", "/formArrayOnlyExplode", {
            query: { foo: ["1", "2", "3"] },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1, 2, 3]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });

        it("accepts a single value", function (done) {
          const req = getMockReq("GET", "/formArrayOnlyExplode", {
            query: { foo: "1" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });
      });

      describe("formArrayOrPrimitive", function () {
        it("accepts multiple values", function (done) {
          const req = getMockReq("GET", "/formArrayOrPrimitive", {
            query: { foo: "1,2,3" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1, 2, 3]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });

        it("accepts a single value", function (done) {
          const req = getMockReq("GET", "/formArrayOrPrimitive", {
            query: { foo: "1" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith(1);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });
      });
      describe("formArrayOrPrimitiveExplode", function () {
        it("accepts multiple values", function (done) {
          const req = getMockReq("GET", "/formArrayOrPrimitiveExplode", {
            query: { foo: ["1", "2", "3"] },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith([1, 2, 3]);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });

        it("accepts a single value", function (done) {
          const req = getMockReq("GET", "/formArrayOrPrimitiveExplode", {
            query: { foo: "1" },
          });
          const { res, next } = getMockRes();

          router(req, res, next);

          // Even with sync functions, we await promises, which trampolines us out
          setTimeout(() => {
            try {
              expect(handler).toHaveBeenCalledWith(1);

              done();
            } catch (e) {
              done(e);
            }
          }, 10);
        });
      });
    });
  });
});
