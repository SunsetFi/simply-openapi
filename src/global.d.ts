declare namespace Reflect {
  function getMetadata(
    key: string | symbol,
    target: any,
    methodName?: string | symbol
  ): any;
  function defineMetadata(
    key: string | symbol,
    value: any,
    target: any,
    methodName?: string | symbol
  ): void;
}
