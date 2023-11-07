import { merge } from "lodash";

function hasReflectMetadata() {
  return typeof Reflect.getMetadata === "function";
}

export function getMetadata<T>(
  object: any,
  key: string | symbol,
  methodName?: string
): T | undefined {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.getMetadata is not available. Please install the reflect-metadata package."
    );
  }

  return Reflect.getMetadata(key, object, methodName);
}

export function defineMetadata(
  key: string | symbol,
  value: any,
  target: any,
  methodName?: string
) {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.defineMetadata is not available. Please install the reflect-metadata package."
    );
  }

  Reflect.defineMetadata(key, value, target, methodName);
}

export function mergeMetadata(
  key: string | symbol,
  value: any,
  target: any,
  methodName?: string
) {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.defineMetadata is not available. Please install the reflect-metadata package."
    );
  }

  let metadata = getMetadata(key, target, methodName);

  metadata = merge(metadata, value);
  Reflect.defineMetadata(key, metadata, target, methodName);
}
