import { OpenAPIObject, OperationObject, PathsObject } from "openapi3-ts/oas31";
import { get, merge } from "lodash";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
  isSOCCustomControllerMethodMetadata,
} from "../metadata";
import { joinUrlPaths } from "../urls";

import { ControllerInstance, OpenAPIObjectExtractor } from "./types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "./extensions";
import { requestMethods } from "../utils";

export const extractSOCBoundMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerInstance,
  methodName: string | symbol
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);
  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!controllerMetadata || !metadata) {
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

    const [path, method] = opData;

    const extension: SOCControllerMethodExtensionData = {
      controller,
      handler: (controller as any)[methodName],
      handlerArgs: metadata.args,
      // controller middleware should run before operation middleware
      // Dont ask me why these empty arrays need to be type-masked when the others dont...
      expressMiddleware: [
        controllerMetadata?.expressMiddleware ?? ([] as any),
        ...(metadata.expressMiddleware ?? []),
      ],
      handlerMiddleware: [
        controllerMetadata?.handlerMiddleware ?? ([] as any),
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

export const extractSOCCustomMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerInstance,
  methodName: string | symbol
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);
  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!controllerMetadata || !metadata) {
    return undefined;
  }

  if (!isSOCCustomControllerMethodMetadata(metadata)) {
    return undefined;
  }

  const path = joinUrlPaths(controllerMetadata.path ?? "/", metadata.path);

  const extension: SOCControllerMethodExtensionData = {
    controller,
    handler: (controller as any)[methodName],
    handlerArgs: metadata.args,
    // controller middleware should run before operation middleware
    // Dont ask me why these empty arrays need to be type-masked when the others dont...
    expressMiddleware: [
      controllerMetadata?.expressMiddleware ?? ([] as any),
      ...(metadata.expressMiddleware ?? []),
    ],
    handlerMiddleware: [
      controllerMetadata?.handlerMiddleware ?? ([] as any),
      ...(metadata.handlerMiddleware ?? []),
    ],
  };

  return (spec: OpenAPIObject) => {
    const op: OperationObject = {
      ...merge(
        {},
        get(spec, ["paths", path, metadata.method], {}),
        metadata.operationFragment as OperationObject
      ),
      tags: [
        ...get(spec, ["paths", path, metadata.method, "tags"], []),
        ...(controllerMetadata.tags ?? []),
        ...(metadata.operationFragment.tags ?? []),
      ],
      [SOCControllerMethodExtensionName]: extension,
    };
    return set(["paths", path, metadata.method], op, spec);
  };
};

function findOperationById(
  paths: PathsObject,
  operationId: string
): [path: string, method: string] | null {
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!requestMethods.includes(method as any)) {
        continue;
      }

      if (operation.operationId === operationId) {
        return [path, method];
      }
    }
  }

  return null;
}
