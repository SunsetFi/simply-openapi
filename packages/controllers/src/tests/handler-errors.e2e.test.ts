import { OpenAPIObject } from "openapi3-ts/oas31";
import { Response, Router } from "express";

import { Controller, Get, Res } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Body", function () {
  @Controller("/")
  class WidgetController {
    @Get("/throw")
    throwError() {
      throw new Error("Oh no!");
    }

    @Get("/orphan")
    orphan() {
      return undefined;
    }

    @Get("/mixed")
    mixed(@Res() res: Response) {
      res.status(200).json({ bar: true });
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

  it("lets thrown errors flow to express", function (done) {
    const req = getMockReq("GET", "/throw");
    const { res, next } = getMockRes();

    router(req, res, next);

    setTimeout(() => {
      try {
        expectNextCalledWithError(next, Error, /Oh no/);
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it("throws an error if no resposne was sent", function (done) {
    const req = getMockReq("GET", "/orphan");
    const { res, next } = getMockRes();

    router(req, res, next);

    setTimeout(() => {
      try {
        expectNextCalledWithError(
          next,
          Error,
          /did not send a response for the handler result/,
        );
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it("throws if both a response and a return value are sent", function (done) {
    const req = getMockReq("GET", "/mixed");
    const { res, next } = getMockRes();

    router(req, res, next);

    setTimeout(() => {
      try {
        expectNextCalledWithError(
          next,
          Error,
          /handler returned a result but the request has already sent its headers/,
        );
        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});
