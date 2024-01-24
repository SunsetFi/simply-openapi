import { Handler, ErrorRequestHandler } from "express";

import { Deferred } from "../../../deferred";

import { OperationMiddlewareFunction } from "./types";

export function convertExpressMiddleware(
  expressHandler: Handler | ErrorRequestHandler,
): OperationMiddlewareFunction {
  if (expressHandler.length === 4) {
    return async (context, next) => {
      try {
        return await next();
      } catch (e) {
        return new Promise((accept, reject) => {
          (expressHandler as ErrorRequestHandler)(
            e,
            context.req,
            context.res,
            (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Error handling middleware is intended to either handle or re-throw the error.
              // if we completed without error, then the response has been handled and
              // there is nothing left to do.
              accept(undefined);
            },
          );
        });
      }
    };
  } else if (expressHandler.length === 3) {
    return (context, next) => {
      return new Promise((accept, reject) => {
        (expressHandler as Handler)(context.req, context.res, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Accept the promise returned by next.  It might reject, which will get
          // forwarded up the promise chain.
          accept(next());
        });
      });
    };
  } else {
    throw new Error(
      `Unsupported express middleware function with ${expressHandler.length} parameters.`,
    );
  }
}
