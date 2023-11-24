import { operationHandlerJsonResponseMiddleware } from "./json-response";
import { operationHandlerResponseObjectMiddleware } from "./response-object/middleware";

export default [
  operationHandlerJsonResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
];
