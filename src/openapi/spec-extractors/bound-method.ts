import { OpenAPIObject, OperationObject, PathsObject } from "openapi3-ts/oas31";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
} from "../../metadata";
import { requestMethods, resolveReference } from "../../utils";

import { ControllerInstance, OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";

export const extractSOCBoundMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerInstance,
  methodName: string | symbol
) => {
  // Controller is optional here
  const controllerMetadata = getSOCControllerMetadata(controller) ?? {
    type: "bound",
  };
  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!metadata) {
    return undefined;
  }

  if (!isSOCBoundControllerMethodMetadata(metadata)) {
    return undefined;
  }

  return (spec: OpenAPIObject) => {
    const opData = findOperationById(spec.paths ?? {}, metadata.operationId);
    if (!opData) {
      throw new Error(
        `Controller ${controller.constructor.name} method ${String(
          methodName
        )} is bound to operation ${
          metadata.operationId
        } but that operation does not exist in the provided OpenAPI specification.`
      );
    }

    const [path, method, operation] = opData;

    for (const arg of metadata.args) {
      if (arg.type !== "openapi-parameter") {
        continue;
      }

      if (
        !(operation.parameters ?? []).some(
          (x) => resolveReference(spec, x).name === arg.parameterName
        )
      ) {
        throw new Error(
          `Controller ${controller.constructor.name} method ${String(
            methodName
          )} uses bound parameter ${arg.parameterName}, but operation ${
            metadata.operationId
          } does not define such a parameter.`
        );
      }
    }

    const extension: SOCControllerMethodExtensionData = {
      controller,
      handler: methodName,
      handlerArgs: metadata.args,
      // controller middleware should run before operation middleware
      expressMiddleware: [
        ...(controllerMetadata?.expressMiddleware ?? ([] as any)),
        ...(metadata.expressMiddleware ?? []),
      ],
      handlerMiddleware: [
        ...(controllerMetadata?.handlerMiddleware ?? ([] as any)),
        ...(metadata.handlerMiddleware ?? []),
      ],
    };

    return set(
      ["paths", path, method, SOCControllerMethodExtensionName],
      extension,
      spec
    );
  };
};

function findOperationById(
  paths: PathsObject,
  operationId: string
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
