import { merge } from "lodash";

function hasReflectMetadata() {
  return typeof Reflect.getMetadata === "function";
}

export function getMetadata<T>(
  key: string | symbol,
  object: Object,
  targetKey?: string | symbol
): T | undefined {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.getMetadata is not available. Please install the reflect-metadata package."
    );
  }

  return Reflect.getMetadata(key, object, targetKey);
}

export function defineMetadata(
  key: string | symbol,
  value: any,
  target: Object,
  targetKey?: string | symbol
) {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.defineMetadata is not available. Please install the reflect-metadata package."
    );
  }

  Reflect.defineMetadata(key, value, target, targetKey);
}

export function mergeMetadata(
  key: string | symbol,
  value: any,
  target: Object,
  targetKey?: string | symbol
) {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.defineMetadata is not available. Please install the reflect-metadata package."
    );
  }

  let metadata = getMetadata(key, target, targetKey);

  metadata = merge(metadata, value);
  Reflect.defineMetadata(key, metadata, target, targetKey);
}
