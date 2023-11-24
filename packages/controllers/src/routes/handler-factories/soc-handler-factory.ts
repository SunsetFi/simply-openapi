import { RequestHandler } from "express";

import { SOCControllerMethodExtensionName } from "../../openapi";

import { RouteCreationContext } from "../RouteCreationContext";
import { createMethodHandlerFromSpec } from "../../handlers";
import { OperationHandlerOptions } from "../types";

export function socOperationHandlerFactory(
  ctx: RouteCreationContext,
  opts: OperationHandlerOptions,
): RequestHandler | null {
  const metadata = ctx.operation[SOCControllerMethodExtensionName];
  if (!metadata) {
    return null;
  }

  var handler = createMethodHandlerFromSpec(
    ctx.spec,
    ctx.path,
    ctx.method,
    ctx.ajv,
    opts,
  );
  return handler.handle.bind(handler);
}
