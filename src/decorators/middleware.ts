import {
  SOCCommonControllerMetadata,
  SOCControllerMethodMetadata,
  mergeSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
} from "../metadata";
import { OperationHandlerMiddleware } from "../routes";
import { Middleware } from "../types";

export interface UseRequestMiddlewareOpts {
  order?: "before" | "after";
}
export function UseRequestMiddleware(
  middleware: Middleware,
  opts: UseRequestMiddlewareOpts = { order: "after" }
): MethodDecorator | ClassDecorator {
  return (target: any, propertyKey?: string | symbol | undefined) => {
    function middlewareInjector<
      T extends SOCCommonControllerMetadata | SOCControllerMethodMetadata,
    >(originalMetadata: T): T {
      const expressMiddleware = [...(originalMetadata.expressMiddleware ?? [])];
      if (opts.order === "before") {
        expressMiddleware.unshift(middleware);
      } else {
        expressMiddleware.push(middleware);
      }
      return {
        ...originalMetadata,
        expressMiddleware,
      };
    }

    if (propertyKey) {
      mergeSOCControllerMethodMetadata(
        target,
        (metadata) => middlewareInjector(metadata),
        propertyKey
      );
    } else {
      mergeSOCControllerMetadata(target, (metadata) =>
        middlewareInjector(metadata)
      );
    }
  };
}

export interface UseHandlerMiddlewareOpts {
  order?: "before" | "after";
}
export function UseHandlerMiddleware(
  middleware: OperationHandlerMiddleware,
  opts: UseRequestMiddlewareOpts = { order: "after" }
): MethodDecorator | ClassDecorator {
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
      mergeSOCControllerMethodMetadata(
        target,
        (metadata) => middlewareInjector(metadata),
        propertyKey
      );
    } else {
      mergeSOCControllerMetadata(target, (metadata) =>
        middlewareInjector(metadata)
      );
    }
  };
}
