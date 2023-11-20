import { isConstructor } from "../utils";

function hasReflectMetadata() {
  return typeof Reflect.getMetadata === "function";
}

export function getConstructorMetadata<T>(
  key: string | symbol,
  object: Object,
  targetKey?: string | symbol,
): T | undefined {
  if (isConstructor(object)) {
    return getMetadata(key, object, targetKey);
  } else if (object.constructor) {
    // Assume its an instance
    return getMetadata(key, object.constructor, targetKey);
  } else {
    // No idea what this is, just set it.
    return getMetadata(key, object, targetKey);
  }
}

export function getMetadata<T>(
  key: string | symbol,
  object: Object,
  targetKey?: string | symbol,
): T | undefined {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.getMetadata is not available. Please install the reflect-metadata package.",
    );
  }

  let metadata: T | undefined = undefined;

  do {
    metadata = Reflect.getMetadata(key, object, targetKey);
    if (metadata !== undefined) {
      return metadata;
    }
  } while (
    (object = Object.getPrototypeOf(object)) &&
    object !== Object.prototype
  );

  return metadata;
}

export function defineConstructorMetadata<T>(
  key: string | symbol,
  value: any,
  object: Object,
  targetKey?: string | symbol,
) {
  if (isConstructor(object)) {
    return defineMetadata(key, value, object, targetKey);
  } else if (object.constructor) {
    // Assume its an instance or prototype
    defineMetadata(key, value, object.constructor, targetKey);
  } else {
    // No idea what this is, just get it.
    defineMetadata(key, value, object, targetKey);
  }
}

export function defineMetadata(
  key: string | symbol,
  value: any,
  target: Object,
  targetKey?: string | symbol,
) {
  if (!hasReflectMetadata()) {
    throw new Error(
      "Reflect.defineMetadata is not available. Please install the reflect-metadata package.",
    );
  }

  Reflect.defineMetadata(key, value, target, targetKey);
}
