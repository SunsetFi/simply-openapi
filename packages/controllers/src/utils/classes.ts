// Javascript throws TypeErrors if we try to access certain properties.
const forbiddenProperties: (string | symbol)[] = [
  "constructor",
  "prototype",
  "caller",
  "callee",
  "arguments",
];
export function getClassMethods(object: object): [string | symbol, Function][] {
  const methods: [string | symbol, Function][] = [];

  function scanObject(obj: object) {
    do {
      for (const propertyName of [
        ...Object.getOwnPropertyNames(obj),
        ...Object.getOwnPropertySymbols(obj),
      ]) {
        if (forbiddenProperties.includes(propertyName)) {
          continue;
        }
        const value = (obj as any)[propertyName];
        if (typeof value === "function") {
          methods.push([propertyName, value]);
        }
      }
    } while ((obj = Object.getPrototypeOf(obj)));
  }

  const prototype = (object as any).prototype;
  if (prototype && prototype.constructor === object) {
    // This is a class constructor
    scanObject(prototype);
  } else if (object.constructor) {
    // This is an instance
    scanObject(object);
  } else {
    // No idea what this is
    scanObject(object);
  }

  return methods;
}

// Seems unused now.
// /**
//  * Scans through both prototypes (for functions for constructors) and the object prototype stack (for live instances)
//  */
// function scanObjectChain(
//   obj: object,
//   scanner: (instance: object) => boolean | void
// ) {
//   function scanFrom(
//     obj: object,
//     getPrototype: (obj: object) => object | null | undefined
//   ) {
//     let currentObj: object | null | undefined = obj;
//     do {
//       if (scanner(currentObj) === false) {
//         return false;
//       }
//     } while ((currentObj = getPrototype(currentObj)));
//     return true;
//   }

//   if (scanner(obj) === false) {
//     return;
//   }

//   if (!scanFrom(obj, Object.getPrototypeOf)) {
//     return;
//   }

//   scanFrom(obj, (obj: any) => obj.prototype);
// }

// Seems to be unused now.
// export function scanObjectProperties(
//   obj: object,
//   scanner: (
//     instance: object,
//     key: string | symbol,
//     value: any
//   ) => boolean | void
// ) {
//   scanObjectChain(obj, (obj) => {
//     for (const propertyName of [
//       ...Object.getOwnPropertyNames(obj),
//       ...Object.getOwnPropertySymbols(obj),
//     ]) {
//       if (forbiddenProperties.includes(propertyName)) {
//         continue;
//       }
//       const value = (obj as any)[propertyName];
//       if (scanner(obj, propertyName, value) === false) {
//         return false;
//       }
//     }
//   });
// }
