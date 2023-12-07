import { operationHandlerJsonResponseMiddleware } from "./json-response";
import { operationHandlerResponseObjectMiddleware } from "./handler-result/middleware";
import { bodyProcessorMiddlewareFactory } from "./body-processor";

export default [
  bodyProcessorMiddlewareFactory,
  operationHandlerJsonResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
];
