import { getMockReq, getMockRes } from "@jest-mock/express";
import { Response } from "express";
import "jest-extended";

import { OperationRequestContext } from "../../OperationRequestContext";

import { operationHandlerFallbackResponseMiddleware } from "./fallback";

describe("operationHandlerFallbackResponseMiddleware", function () {
  function createContext(mockRes?: Response): OperationRequestContext {
    if (!mockRes) {
      mockRes = getMockRes().res;
    }

    return new OperationRequestContext(
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
