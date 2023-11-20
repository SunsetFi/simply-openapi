import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { get, merge } from "lodash";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCCustomControllerMethodMetadata,
} from "../../metadata";
import { joinUrlPaths } from "../../urls";
import { ControllerObject } from "../../types";

import { OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";
import { nameController } from "../../utils";

export const extractSOCCustomMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
  methodName: string | symbol,
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);

  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!metadata || !isSOCCustomControllerMethodMetadata(metadata)) {
    return undefined;
  }

  if (controllerMetadata && controllerMetadata.type === "bound") {
    throw new Error(
      `Cannot extract OpenAPI spec for method ${String(
        methodName,
      )} of controller ${nameController(
        controller,
      )} because it is a bound controller and the method is not a bound operation method.`,
    );
  }

  const path = joinUrlPaths(controllerMetadata?.path ?? "/", metadata.path);

  // controller middleware should run before operation middleware

  const preExpressMiddleware = [
    ...(controllerMetadata?.preExpressMiddleware ?? []),
    ...(metadata.preExpressMiddleware ?? []),
  ];

  const handlerMiddleware = [
    ...(controllerMetadata?.handlerMiddleware ?? []),
    ...(metadata.handlerMiddleware ?? []),
  ];

  const extension: SOCControllerMethodExtensionData = {
    controller,
    handler: methodName,
    handlerArgs: metadata.args ?? [],
  };

  if (preExpressMiddleware.length > 0) {
    extension.preExpressMiddleware = preExpressMiddleware;
  }

  if (handlerMiddleware.length > 0) {
    extension.handlerMiddleware = handlerMiddleware;
  }

  return (spec: OpenAPIObject) => {
    const op: OperationObject = {
      operationId: `${nameController(controller)}.${String(methodName)}`,
      responses: {},
      ...merge(
        {},
        get(spec, ["paths", path, metadata.method], {}),
        metadata.operationFragment as OperationObject,
      ),
      tags: [
        ...get(spec, ["paths", path, metadata.method, "tags"], []),
        ...(controllerMetadata?.tags ?? []),
        ...(metadata.operationFragment.tags ?? []),
      ],
      [SOCControllerMethodExtensionName]: extension,
    };
    return set(["paths", path, metadata.method], op, spec);
  };
};
