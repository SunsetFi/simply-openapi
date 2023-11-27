import { OpenAPIObject, SecuritySchemeObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { Unauthorized } from "http-errors";
import "jest-extended";

import {
  Authenticator,
  RequireAuthentication,
  Controller,
  Get,
} from "../decorators";
import { AuthenticationController, RequestContext } from "../handlers";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Auth", function () {
  describe("apiKey", function () {
    var authenticatorFn = jest.fn();

    var authenticatedFn = jest.fn();
    var unauthenticatedFn = jest.fn();

    beforeEach(function () {
      authenticatorFn.mockClear();
      authenticatedFn.mockClear();
      unauthenticatedFn.mockClear();

      authenticatorFn.mockReturnValue({ id: 1 });
    });

    const auth: SecuritySchemeObject = {
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
    };

    @Authenticator("widgetAuth", auth)
    class WidgetAuthenticator implements AuthenticationController {
      authenticate(value: string, scopes: string[], ctx: RequestContext) {
        return authenticatorFn(value, scopes, ctx);
      }
    }

    @Controller()
    class WidgetController {
      @Get("/authenticated")
      @RequireAuthentication(WidgetAuthenticator, ["scope"])
      getAuthenticated() {
        authenticatedFn();
        return "OK";
      }

      @Get("/unauthenticated")
      getUnauthenticated() {
        unauthenticatedFn();
        return "OK";
      }
    }

    const controllers = [new WidgetAuthenticator(), new WidgetController()];

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
      const spec = createOpenAPIFromControllers(
        { title: "My API", version: "1.0.0" },
        controllers,
      );

      expect(spec).toMatchObject({
        paths: {
          "/authenticated": {
            get: {
              security: [
                {
                  widgetAuth: ["scope"],
                },
              ],
            },
          },
          "/unauthenticated": {
            get: {},
          },
        },
        components: {
          securitySchemes: {
            widgetAuth: auth,
          },
        },
      });
    });

    it("does not request authentication for an unauthenticated request", function (done) {
      const req = getMockReq("GET", "/unauthenticated");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(unauthenticatedFn).toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("calls the authenticator for an authenticated request", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {
          "x-api-key": "foo",
        },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(authenticatorFn).toHaveBeenCalledWith(
            "foo",
            ["scope"],
            expect.anything(),
          );
          expect(authenticatedFn).toHaveBeenCalled();

          expect(authenticatorFn).toHaveBeenCalledBefore(authenticatedFn);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("rejects a request without the right header", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {},
      });
      const { res, next } = getMockRes();

      authenticatorFn.mockImplementation(() => false);

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(authenticatorFn).not.toHaveBeenCalled();

          expect(authenticatedFn).not.toHaveBeenCalled();

          expectNextCalledWithError(next, Unauthorized);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("rejects a request that fails authentication", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {
          "x-api-key": "foo",
        },
      });
      const { res, next } = getMockRes();

      authenticatorFn.mockImplementation(() => false);

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(authenticatorFn).toHaveBeenCalledWith(
            "foo",
            ["scope"],
            expect.anything(),
          );

          expect(authenticatedFn).not.toHaveBeenCalled();

          expectNextCalledWithError(next, Unauthorized);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("http bearer", function () {
    var authenticatorFn = jest.fn();

    var authenticatedFn = jest.fn();
    var unauthenticatedFn = jest.fn();

    beforeEach(function () {
      authenticatorFn.mockClear();
      authenticatedFn.mockClear();
      unauthenticatedFn.mockClear();

      authenticatorFn.mockReturnValue({ id: 1 });
    });

    const auth: SecuritySchemeObject = {
      type: "http",
      scheme: "bearer",
    };

    @Authenticator("widgetAuth", auth)
    class WidgetAuthenticator implements AuthenticationController {
      authenticate(value: string, scopes: string[], ctx: RequestContext) {
        return authenticatorFn(value, scopes, ctx);
      }
    }

    @Controller()
    class WidgetController {
      @Get("/authenticated")
      @RequireAuthentication(WidgetAuthenticator, ["scope"])
      getAuthenticated() {
        authenticatedFn();
        return "OK";
      }

      @Get("/unauthenticated")
      getUnauthenticated() {
        unauthenticatedFn();
        return "OK";
      }
    }

    const controllers = [new WidgetAuthenticator(), new WidgetController()];

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
      const spec = createOpenAPIFromControllers(
        { title: "My API", version: "1.0.0" },
        controllers,
      );

      expect(spec).toMatchObject({
        paths: {
          "/authenticated": {
            get: {
              security: [
                {
                  widgetAuth: ["scope"],
                },
              ],
            },
          },
          "/unauthenticated": {
            get: {},
          },
        },
        components: {
          securitySchemes: {
            widgetAuth: auth,
          },
        },
      });
    });

    it("does not request authentication for an unauthenticated request", function (done) {
      const req = getMockReq("GET", "/unauthenticated");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(unauthenticatedFn).toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("calls the authenticator for an authenticated request", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {
          authorization: "Bearer 1234",
        },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(authenticatorFn).toHaveBeenCalledWith(
            "1234",
            ["scope"],
            expect.anything(),
          );
          expect(authenticatedFn).toHaveBeenCalled();

          expect(authenticatorFn).toHaveBeenCalledBefore(authenticatedFn);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("rejects a request without the right header", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {},
      });
      const { res, next } = getMockRes();

      authenticatorFn.mockImplementation(() => false);

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(authenticatorFn).not.toHaveBeenCalled();

          expect(authenticatedFn).not.toHaveBeenCalled();

          expectNextCalledWithError(next, Unauthorized);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("rejects a request with a malformed header", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {
          authorization: "1234",
        },
      });
      const { res, next } = getMockRes();

      authenticatorFn.mockImplementation(() => false);

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(authenticatorFn).not.toHaveBeenCalled();

          expect(authenticatedFn).not.toHaveBeenCalled();

          expectNextCalledWithError(next, Unauthorized);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("rejects a request that fails authentication", function (done) {
      const req = getMockReq("GET", "/authenticated", {
        headers: {
          authorization: "Bearer 1234",
        },
      });
      const { res, next } = getMockRes();

      authenticatorFn.mockImplementation(() => false);

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(authenticatorFn).toHaveBeenCalledWith(
            "1234",
            ["scope"],
            expect.anything(),
          );

          expect(authenticatedFn).not.toHaveBeenCalled();

          expectNextCalledWithError(next, Unauthorized);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("controller level", function () {
    const auth: SecuritySchemeObject = {
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
    };

    @Authenticator("widgetAuth", auth)
    class WidgetAuthenticator implements AuthenticationController {
      authenticate(value: string, scopes: string[], ctx: RequestContext) {
        return true;
      }
    }

    @Controller()
    @RequireAuthentication(WidgetAuthenticator, ["scope"])
    class WidgetController {
      @Get("/")
      getAuthenticated() {
        return "OK";
      }
    }

    const controllers = [new WidgetAuthenticator(), new WidgetController()];

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
      const spec = createOpenAPIFromControllers(
        { title: "My API", version: "1.0.0" },
        controllers,
      );

      expect(spec).toMatchObject({
        paths: {
          "/": {
            get: {
              security: [
                {
                  widgetAuth: ["scope"],
                },
              ],
            },
          },
        },
        components: {
          securitySchemes: {
            widgetAuth: auth,
          },
        },
      });
    });
  });
});
