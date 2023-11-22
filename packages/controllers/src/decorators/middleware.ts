import { OperationHandlerMiddleware } from "../handlers";
import {
  SOCCommonControllerMetadata,
  SOCControllerMethodMetadata,
  mergeSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
} from "../metadata";
import { Middleware } from "../types";

export interface UseExpressMiddlewareOpts {
  order?: "before" | "after";
}
export function UseExpressMiddleware(
  middleware: Middleware,
  opts: UseExpressMiddlewareOpts = { order: "after" },
) {
  return (target: any, propertyKey?: string | symbol | undefined) => {
    function middlewareInjector<
      T extends SOCCommonControllerMetadata | SOCControllerMethodMetadata,
    >(originalMetadata: T): T {
      const expressMiddleware = [
        ...(originalMetadata.preExpressMiddleware ?? []),
      ];
      if (opts.order === "before") {
        expressMiddleware.unshift(middleware);
      } else {
        expressMiddleware.push(middleware);
      }
      return {
        ...originalMetadata,
        preExpressMiddleware: expressMiddleware,
      };
    }

    if (propertyKey) {
      mergeSOCControllerMethodMetadata(target, middlewareInjector, propertyKey);
    } else {
      mergeSOCControllerMetadata(target, middlewareInjector);
    }
  };
}

export interface UseHandlerMiddlewareOpts {
  order?: "before" | "after";
}
export function UseHandlerMiddleware(
  middleware: OperationHandlerMiddleware,
  opts: UseExpressMiddlewareOpts = { order: "after" },
) {
  return (target: any, propertyKey?: string | symbol | undefined) => {
    function middlewareInjector<
      T extends SOCCommonControllerMetadata | SOCControllerMethodMetadata,
    >(originalMetadata: T): T {
      const handlerMiddleware = [...(originalMetadata.handlerMiddleware ?? [])];
      if (opts.order === "before") {
        handlerMiddleware.unshift(middleware);
      } else {
        handlerMiddleware.push(middleware);
      }
      return {
        ...originalMetadata,
        handlerMiddleware,
      };
    }

    if (propertyKey) {
      mergeSOCControllerMethodMetadata(target, middlewareInjector, propertyKey);
    } else {
      mergeSOCControllerMetadata(target, middlewareInjector);
    }
  };
}
