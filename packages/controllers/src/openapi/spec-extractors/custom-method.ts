import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { get } from "lodash";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCCustomControllerMethodMetadata,
} from "../../metadata";
import { joinUrlPaths } from "../../urls";
import { ControllerObject } from "../../types";
import { mergeCombineArrays, nameController } from "../../utils";

import { OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";

export const extractSOCCustomMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
  methodName: string | symbol,
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);

  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!metadata || !isSOCCustomControllerMethodMetadata(metadata)) {
    return undefined;
  }

  if (controllerMetadata?.type === "bound") {
    throw new Error(
      `Cannot extract OpenAPI spec for method ${String(
        methodName,
      )} of controller ${nameController(
        controller,
      )} because it is a bound controller and the method is not a bound controller method.  If you would like to mix bound and unbound controllers, you may do so with the @Controller decorator, or omit the decorator entirely.`,
    );
  }

  const path = joinUrlPaths(
    (controllerMetadata as any)?.path ?? "/",
    metadata.path,
  );

  // controller middleware should run before operation middleware
  const handlerMiddleware = [
    ...(controllerMetadata?.handlerMiddleware ?? []),
    ...(metadata.handlerMiddleware ?? []),
  ];

  const extension: SOCControllerMethodExtensionData = {
    controller,
    handler: methodName,
    handlerArgs: metadata.handlerArgs ?? [],
  };

  if (handlerMiddleware.length > 0) {
    extension.handlerMiddleware = handlerMiddleware;
  }

  return (spec: OpenAPIObject) => {
    const op: OperationObject = {
      operationId: `${nameController(controller)}.${String(methodName)}`,
      responses: {},
      ...mergeCombineArrays(
        {},
        get(spec, ["paths", path, metadata.method], {}),
        (controllerMetadata as any)?.sharedOperationFragment as OperationObject,
        metadata.operationFragment as OperationObject,
      ),
      [SOCControllerMethodExtensionName]: extension,
    };
    return set(["paths", path, metadata.method], op, spec);
  };
};
