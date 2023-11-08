import {
  SECControllerMetadata,
  SECControllerMethodMetadata,
  mergeSECControllerMetadata,
  mergeSECControllerMethodMetadata,
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
      T extends SECControllerMetadata | SECControllerMethodMetadata,
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
      mergeSECControllerMethodMetadata(
        target,
        (metadata) => middlewareInjector(metadata),
        propertyKey
      );
    } else {
      mergeSECControllerMetadata(target, (metadata) =>
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
      T extends SECControllerMetadata | SECControllerMethodMetadata,
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
      mergeSECControllerMethodMetadata(
        target,
        (metadata) => middlewareInjector(metadata),
        propertyKey
      );
    } else {
      mergeSECControllerMetadata(target, (metadata) =>
        middlewareInjector(metadata)
      );
    }
  };
}
