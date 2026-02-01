declare namespace Reflect {
  function getMetadata(
    key: string | symbol,
    target: Object,
    targetKey?: string | symbol,
  ): any;
  function defineMetadata(
    key: string | symbol,
    value: any,
    target: Object,
    targetKey?: string | symbol,
  ): void;
}
