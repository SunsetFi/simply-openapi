import { mergeWith as mergeWithFp } from "lodash/fp";

export function mergeCombineArrays(object: any, ...sources: any[]) {
  for (const source of sources) {
    object = mergeWithFp(
      (objValue, srcValue): any => {
        if (Array.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      },
      object,
      source,
    );
  }

  return object;
}
