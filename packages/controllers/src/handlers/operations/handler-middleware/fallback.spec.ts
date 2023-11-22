import { getMockReq, getMockRes } from "@jest-mock/express";
import { Response } from "express";
import "jest-extended";

import { RequestContext } from "../../RequestContext";

import { operationHandlerFallbackResponseMiddleware } from "./fallback";

describe("operationHandlerFallbackResponseMiddleware", function () {
  function createContext(mockRes?: Response): RequestContext {
    if (!mockRes) {
      mockRes = getMockRes().res;
    }

    return new RequestContext(
      {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/": {
            get: {
              responses: {},
            },
          },
        },
      },
      "/",
      "get",
      {},
      () => {},
      [],
      getMockReq(),
      mockRes,
    );
  }

  it("errors when no response has been sent", async function () {
    const test = async () => {
      await operationHandlerFallbackResponseMiddleware(
        createContext(),
        jest.fn(() => undefined) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /did not send a response for the handler result/,
    );
  });

  it("errors when a result is not handled", async function () {
    const test = async () => {
      await operationHandlerFallbackResponseMiddleware(
        createContext(),
        jest.fn(() => ({ test: true })) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /returned a result that was not handled by any middleware/,
    );
  });
});
