import { OpenAPIObject, OperationObject, PathsObject } from "openapi3-ts/oas31";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
} from "../../metadata";
import { nameController, requestMethods } from "../../utils";
import { resolveReference } from "../../schema-utils";
import { ControllerObject } from "../../types";

import { OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";

export const extractSOCBoundMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
  methodName: string | symbol,
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);

  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!metadata || !isSOCBoundControllerMethodMetadata(metadata)) {
    return undefined;
  }

  return (spec: OpenAPIObject) => {
    const opData = findOperationById(spec.paths ?? {}, metadata.operationId);
    if (!opData) {
      throw new Error(
        `Controller ${nameController(controller)} method ${String(
          methodName,
        )} is bound to operation ${
          metadata.operationId
        } but that operation does not exist in the provided OpenAPI specification.`,
      );
    }

    const [path, method, operation] = opData;

    for (const arg of metadata.args) {
      if (!arg || arg.type !== "openapi-parameter") {
        continue;
      }

      if (
        !(operation.parameters ?? []).some(
          (x) => resolveReference(spec, x)?.name === arg.parameterName,
        )
      ) {
        throw new Error(
          `Controller ${nameController(controller)} method ${String(
            methodName,
          )} uses bound parameter ${arg.parameterName}, but operation ${
            metadata.operationId
          } does not define such a parameter.  Either the parameter does not exist or its reference failed to resolve.`,
        );
      }
    }

    const extension: SOCControllerMethodExtensionData = {
      controller,
      handler: methodName,
      handlerArgs: metadata.args,
      // controller middleware should run before operation middleware
      preExpressMiddleware: [
        ...(controllerMetadata?.preExpressMiddleware ?? ([] as any)),
        ...(metadata.preExpressMiddleware ?? []),
      ],
      handlerMiddleware: [
        ...(controllerMetadata?.handlerMiddleware ?? ([] as any)),
        ...(metadata.handlerMiddleware ?? []),
      ],
    };

    return set(
      ["paths", path, method, SOCControllerMethodExtensionName],
      extension,
      spec,
    );
  };
};

function findOperationById(
  paths: PathsObject,
  operationId: string,
): [path: string, method: string, operation: OperationObject] | null {
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!requestMethods.includes(method as any)) {
        continue;
      }

      if (operation.operationId === operationId) {
        return [path, method, operation];
      }
    }
  }

  return null;
}
