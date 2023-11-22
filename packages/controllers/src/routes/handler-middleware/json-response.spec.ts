import { getMockReq, getMockRes } from "@jest-mock/express";
import { Response } from "express";
import "jest-extended";

import { operationHandlerJsonResponseMiddleware } from "./json-response";
import { OperationHandlerMiddlewareContext } from "./OperationHandlerMiddlewareContext";

describe("operationHandlerJsonResponseMiddleware", function () {
  function createContext(
    mockRes?: Response,
  ): OperationHandlerMiddlewareContext {
    if (!mockRes) {
      mockRes = getMockRes().res;
    }

    return new OperationHandlerMiddlewareContext(
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

  it("throws an error if the response is not JSON serializable", async function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        createContext(),
        jest.fn(() => ({
          nonSerializableValue: () => void 0,
        })) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /not JSON serializable/,
    );
  });

  it("throws an error if the response is already sent", async function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        createContext(getMockRes({ headersSent: true }).res),
        jest.fn(() => ({
          value: 42,
        })) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /already sent its headers/,
    );
  });

  it("does nothing if no result is returned", async function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        createContext(getMockRes({ headersSent: true }).res),
        jest.fn((x) => undefined) as any,
      );
    };

    await expect(test()).resolves.toBeUndefined();
  });

  it("sends the json response if one is provided", async function () {
    const res = getMockRes().res;
    const result = { value: 42 };
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        createContext(res),
        jest.fn((x) => result) as any,
      );
    };

    const handlerResult = await test();

    expect(handlerResult).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
