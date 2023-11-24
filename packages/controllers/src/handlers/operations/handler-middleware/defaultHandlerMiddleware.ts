import { operationHandlerJsonResponseMiddleware } from "./json-response";
import { operationHandlerResponseObjectMiddleware } from "./handler-result/middleware";

export default [
  operationHandlerJsonResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
];
