import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";
import "jest-extended";

import { Controller, Get, UseHandlerMiddleware } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";
import {
  OperationMiddlewareNextFunction,
  OperationMiddlewareFactoryContext,
  OperationRequestContext,
} from "../handlers";

import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Handler Middleware", function () {
  var controllerMiddleware = jest.fn();
  var methodMiddleware = jest.fn();

  var factoryHandlerMiddleware = jest.fn();
  var factoryMiddleware = jest.fn();

  beforeEach(() => {
    controllerMiddleware.mockReset();
    controllerMiddleware.mockImplementation((ctx, next) => next());

    methodMiddleware.mockReset();
    methodMiddleware.mockImplementation((ctx, next) => next());

    factoryHandlerMiddleware.mockReset();
    factoryHandlerMiddleware.mockImplementation((ctx, next) => next());

    factoryMiddleware.mockReset();
    factoryMiddleware.mockImplementation(
      (fctx) =>
        (ctx: OperationRequestContext, next: OperationMiddlewareNextFunction) =>
          factoryHandlerMiddleware(ctx, next),
    );
  });

  @Controller("/")
  @UseHandlerMiddleware(
    (ctx: OperationRequestContext, next: OperationMiddlewareNextFunction) =>
      controllerMiddleware(ctx, next),
  )
  class WidgetController {
    @Get("/")
    @UseHandlerMiddleware(
      (ctx: OperationRequestContext, next: OperationMiddlewareNextFunction) =>
        methodMiddleware(ctx, next),
    )
    handleRequest() {
      return { bar: true };
    }

    @Get("/factory-1")
    @UseHandlerMiddleware((ctx: OperationMiddlewareFactoryContext) =>
      factoryMiddleware(ctx),
    )
    handleFactory1Request() {
      return { bar: true };
    }

    @Get("/factory-2")
    @UseHandlerMiddleware((ctx: OperationMiddlewareFactoryContext) =>
      factoryMiddleware(ctx),
    )
    handleFactory2Request() {
      return { bar: true };
    }
  }

  describe("basic middleware", function () {
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
      }, 100);
    });
  });

  describe("factory middleware", () => {
    it("calls the factory for each handler", function () {
      const spec = createOpenAPIFromControllers(
        { title: "Test", version: "1.0.0" },
        [new WidgetController()],
      );

      createRouterFromSpec(spec);

      expect(factoryMiddleware).toHaveBeenCalledTimes(2);

      const calledPaths: string[] = [
        factoryMiddleware.mock.calls[0][0].path,
        factoryMiddleware.mock.calls[1][0].path,
      ];
      expect(calledPaths).toContainAllValues(["/factory-1", "/factory-2"]);
    });

    it("invokes the produced middleware", function (done) {
      const spec = createOpenAPIFromControllers(
        { title: "Test", version: "1.0.0" },
        [new WidgetController()],
      );

      const router = createRouterFromSpec(spec);

      const req = getMockReq("GET", "/factory-1");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(controllerMiddleware).toHaveBeenCalled();
          expect(factoryHandlerMiddleware).toHaveBeenCalled();

          expect(controllerMiddleware).toHaveBeenCalledBefore(
            factoryHandlerMiddleware,
          );

          done();
        } catch (e) {
          done(e);
        }
      }, 100);
    });
  });
});
