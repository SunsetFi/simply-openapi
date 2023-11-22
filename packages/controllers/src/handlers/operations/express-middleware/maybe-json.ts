import { NextFunction, Request, RequestHandler, Response } from "express";
import bodyParser from "body-parser";

const parseJson = bodyParser.json({ strict: true });
export const maybeParseJson: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // On closer inspection, body-parser does this anyway.
  // Oh well, keeping it.
  if (req.body === undefined) {
    parseJson(req, res, next);
  } else {
    next();
  }
};
