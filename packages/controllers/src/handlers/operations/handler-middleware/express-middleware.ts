import { Handler } from "express";

import { Deferred } from "../../../deferred";

import { OperationHandlerMiddleware } from "./types";

export function convertExpressMiddleware(
  expressHandler: Handler,
): OperationHandlerMiddleware {
  return (context, next) => {
    const deferred = new Deferred<any>();

    expressHandler(context.req, context.res, async (err) => {
      if (err) {
        deferred.reject(err);
        return;
      }

      const nextResult = await next();
      deferred.resolve(nextResult);
    });

    return deferred.promise;
  };
}
