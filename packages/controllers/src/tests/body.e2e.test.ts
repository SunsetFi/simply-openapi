import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";

import { BindBody, Body, Controller, Post } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";
import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Bodies", function () {
  describe("Multiple accepted content types", function () {
    const fooHandler = jest.fn();
    const barHandler = jest.fn();
    const anyHandler = jest.fn();

    beforeEach(function () {
      fooHandler.mockClear();
      barHandler.mockClear();
    });

    @Controller()
    class ContentTypeTestController {
      @Post("/")
      method(
        @Body("application/foo", {}) fooBody: any,
        @Body("application/bar", {}) barBody: any,
        @BindBody() anyBody: any,
      ) {
        if (fooBody) {
          fooHandler(fooBody);
        }
        if (barBody) {
          barHandler(barBody);
        }
        if (anyBody) {
          anyHandler(anyBody);
        }

        return {};
      }
    }

    const controllers = [new ContentTypeTestController()];

    let spec: OpenAPIObject;
    let router: Router;

    beforeAll(() => {
      spec = createOpenAPIFromControllers(
        { title: "My API", version: "1.0.0" },
        controllers,
      );

      router = createRouterFromSpec(spec);
    });

    it("should generate the correct schema", function () {
      expect(spec).toMatchObject({
        paths: {
          "/": {
            post: {
              requestBody: {
                content: {
                  "application/foo": {
                    schema: {},
                  },
                  "application/bar": {
                    schema: {},
                  },
                },
              },
            },
          },
        },
      });
    });

    it("passes the correct body to the handler", function (done) {
      const body = "test-body";
      const req = getMockReq("POST", "/", {
        body,
        headers: {
          "content-type": "application/foo",
          "content-length": String(body.length),
        },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(fooHandler).toHaveBeenCalledWith(body);
          expect(barHandler).not.toHaveBeenCalled();
          expect(anyHandler).toHaveBeenCalledWith(body);

          done();
        } catch (e) {
          done(e);
        }
      }, 100);
    });
  });
});
