import { NextFunction, Request, ErrorRequestHandler, Response } from "express";
import { HttpError, isHttpError } from "http-errors";
import HttpStatusCodes from "http-status-codes";

export interface ErrorLogContext {
  url: string;
  method: string;
  pathname: string;
}
export type ErrorLogFunction = (
  err: HttpError,
  ctx: ErrorLogContext,
  message: string
) => void;
export interface HandleHttpErrorsMiddlewareOpts {
  logger?: ErrorLogFunction;
}

function defaultLogger(err: HttpError, ctx: ErrorLogContext, message: string) {
  console.warn(
    err,
    `A ${err.status} error occurred handling request \"${ctx.url}\": ${message}`
  );
}
export function createHandleHttpErrorsMiddleware(
  opts: HandleHttpErrorsMiddlewareOpts = {}
) {
  const { logger = defaultLogger } = opts;
  const handleHttpErrorsMiddleware: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!isHttpError(err)) {
      next(err);
      return;
    }

    const ctx: ErrorLogContext = {
      url: req.url,
      method: req.method,
      pathname: req.path,
    };

    if (res.headersSent) {
      logger(
        err,
        ctx,
        `An error occured after headers have been sent: ${err.message}`
      );
      res.end();
      return;
    }

    if (!err.expose) {
      logger(err, ctx, `Internal error handling request: ${err.message}`);
      res
        .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" })
        .end();
    } else {
      logger(err, ctx, err.message);
      res.status(err.statusCode).json({ message: err.message }).end();
    }
  };

  return handleHttpErrorsMiddleware;
}
