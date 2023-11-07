import {
  PathsObject,
  OperationObject,
  InfoObject,
  OpenAPIObject,
} from "openapi3-ts/oas31";
import { cloneDeep } from "lodash";

import {
  SECControllerMethodMetadata,
  getSECControllerMetadata,
  getSECControllerMethodMetadata,
  isSECBoundControllerMethodMetadata,
  isSECCustomControllerMethodMetadata,
} from "../metadata";
import { joinUrlPaths } from "../urls";

import {
  SECControllerMethodExtensionData,
  SECControllerMethodExtensionName,
} from "./extensions";

export type Controller = object;

export interface CreateOpenAPIPathsFromControllerOptions {}
export function createOpenAPIFromControllers(
  info: InfoObject,
  controllers: Controller[]
): OpenAPIObject {
  const paths = createOpenAPIPathsFromControllers(controllers);
  return {
    openapi: "3.0.0",
    info,
    paths,
  };
}

export function createOpenAPIPathsFromControllers(
  controllers: Controller[],
  opts: CreateOpenAPIPathsFromControllerOptions = {}
): PathsObject {
  const paths: PathsObject = {};
  for (const controller of controllers) {
    addOpenAPIPathsFromController(controller, paths, opts);
  }
  return paths;
}

export function attachBoundControllersToOpenAPI(
  openApiSpec: OpenAPIObject,
  controllers: Controller[]
): OpenAPIObject {
  return {
    ...openApiSpec,
    paths: attachBoundControllersToPaths(openApiSpec.paths ?? {}, controllers),
  };
}

export function attachBoundControllersToPaths(
  paths: PathsObject,
  controllers: Controller[]
): PathsObject {
  paths = cloneDeep(paths);
  for (const controller of controllers) {
    addOpenApiBoundControllerToPaths(paths, controller);
  }
  return paths;
}

function addOpenApiBoundControllerToPaths(
  paths: PathsObject,
  controller: Controller
) {
  const handlerData = Array.from(getControllerHandlers(controller));
  for (const [handler, metadata] of handlerData) {
    if (!isSECBoundControllerMethodMetadata(metadata)) {
      continue;
    }

    const operation = findOperationById(paths, metadata.operationId);
    if (!operation) {
      throw new Error(
        `Controller ${controller.constructor.name} method ${handler.name} is bound to operation ${metadata.operationId} but that operation does not exist.`
      );
    }

    operation[SECControllerMethodExtensionName] = {
      controller,
      handler,
      handlerArgs: metadata.args,
      expressMiddleware: [],
      handlerMiddleware: [],
    } satisfies SECControllerMethodExtensionData;
  }
}

function findOperationById(
  paths: PathsObject,
  operationId: string
): OperationObject | null {
  for (const path of Object.values(paths)) {
    for (const operation of Object.values(path)) {
      if (operation.operationId === operationId) {
        return operation;
      }
    }
  }

  return null;
}

function addOpenAPIPathsFromController(
  controller: Controller,
  paths: PathsObject,
  opts: CreateOpenAPIPathsFromControllerOptions = {}
) {
  const controllerMetadata = getSECControllerMetadata(controller);
  if (!controllerMetadata) {
    throw new Error(
      `Controller ${controller.constructor.name} is missing @Controller decorator.`
    );
  }

  const handlerData = Array.from(getControllerHandlers(controller));

  for (const [handler, metadata] of handlerData) {
    if (!isSECCustomControllerMethodMetadata(metadata)) {
      continue;
    }
    const path = joinUrlPaths(controllerMetadata.path ?? "/", metadata.path);
    if (!paths[path]) {
      paths[path] = {};
    }
    paths[path][metadata.method] = {
      ...(metadata.operationFragment as OperationObject),
      [SECControllerMethodExtensionName]: {
        controller,
        handler,
        handlerArgs: metadata.args,
        expressMiddleware: [],
        handlerMiddleware: [],
      } satisfies SECControllerMethodExtensionData,
    };
  }
}

function* getControllerHandlers(
  controller: Controller
): Generator<[Function, SECControllerMethodMetadata]> {
  let currentObj = controller;
  do {
    for (const propertyName of Object.getOwnPropertyNames(currentObj)) {
      const metadata = getSECControllerMethodMetadata(currentObj, propertyName);
      if (metadata) {
        yield [(currentObj as any)[propertyName], metadata];
      }
    }
  } while ((currentObj = Object.getPrototypeOf(currentObj)));
}

function scanProperties(obj: object): string[] {
  let props: string[] = [];
  let currentObj = obj;

  do {
    Object.getOwnPropertyNames(currentObj).forEach((prop) => {
      if (props.indexOf(prop) === -1) {
        props.push(prop);
      }
    });
  } while ((currentObj = Object.getPrototypeOf(currentObj)));

  return props;
}
