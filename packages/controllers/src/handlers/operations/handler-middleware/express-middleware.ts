import { Handler, ErrorRequestHandler } from "express";

import { Deferred } from "../../../deferred";

import { OperationMiddlewareFunction } from "./types";

export function convertExpressMiddleware(
  expressHandler: Handler | ErrorRequestHandler,
): OperationMiddlewareFunction {
  if (expressHandler.arguments.length === 4) {
    return async (context, next) => {
      try {
        return await next();
      } catch (e) {
        const deferred = new Deferred<any>();

        (expressHandler as ErrorRequestHandler)(
          e,
          context.req,
          context.res,
          async (err) => {
            if (err) {
              deferred.reject(err);
              return;
            }

            // Error handling middleware is intended to either handle or re-throw the error.
            // if we completed without error, then the response has been handled and
            // there is nothing left to do.
            deferred.resolve(undefined);
          },
        );

        return deferred.promise;
      }
    };
  } else {
    return (context, next) => {
      const deferred = new Deferred<any>();

      (expressHandler as Handler)(context.req, context.res, async (err) => {
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
}
