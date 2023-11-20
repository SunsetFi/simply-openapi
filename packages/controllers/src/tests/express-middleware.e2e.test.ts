import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";
import "jest-extended";

import { Controller, Get, UseExpressMiddleware } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Express Middleware", function () {
  var controllerMiddleware = jest.fn();
  var methodMiddleware = jest.fn();

  beforeEach(() => {
    controllerMiddleware.mockReset();
    controllerMiddleware.mockImplementation((req, res, next) => next());

    methodMiddleware.mockReset();
    methodMiddleware.mockImplementation((req, res, next) => next());
  });

  @Controller("/")
  @UseExpressMiddleware(controllerMiddleware)
  class WidgetController {
    @Get("/")
    @UseExpressMiddleware(methodMiddleware)
    handleRequest() {
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

  it("calls the middleware in the correct order", function (done) {
    const req = getMockReq("GET", "/");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();

        expect(controllerMiddleware).toHaveBeenCalled();
        expect(methodMiddleware).toHaveBeenCalled();

        expect(controllerMiddleware).toHaveBeenCalledBefore(methodMiddleware);

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});
