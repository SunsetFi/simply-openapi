import {
  OperationHandlerMiddleware,
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "../handler-middleware/types";

export class OperationHandlerMiddlewareManager {
  private middlewares: OperationHandlerMiddleware[] = [];
  private coreFunction: (...args: any[]) => any;

  constructor(coreFunction: (...args: any[]) => any) {
    this.coreFunction = coreFunction;
  }

  use(...middleware: OperationHandlerMiddleware[]) {
    this.middlewares.push(...middleware);
  }

  async run(
    context: OperationHandlerMiddlewareContext,
    args: any[],
  ): Promise<any> {
    const stack = this.middlewares;

    const executeMiddleware = async (
      index: number,
      args: any[],
    ): Promise<any> => {
      if (index >= stack.length) {
        return this.coreFunction(...args);
      }

      const next: OperationHandlerMiddlewareNextFunction = async () => {
        return executeMiddleware(index + 1, args);
      };

      next.withArgs = async (...newArgs: any[]) => {
        return executeMiddleware(index + 1, newArgs);
      };

      const currentMiddleware = stack[index];

      try {
        // If the current middleware returns a promise, await will wait for it to resolve
        return await currentMiddleware(context, next);
      } catch (error) {
        // If the middleware throws an error (or returns a rejected promise), we catch it here
        // Depending on your error handling strategy, you could handle or re-throw the error
        throw error;
      }
    };

    return executeMiddleware(0, args);
  }
}
