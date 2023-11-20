// TODO: Bolt this on to expect like jest-extended does.
export function expectNextCalledWithError(
  next: any,
  constructor: object,
  message: RegExp,
) {
  expect(next).toHaveBeenCalledWith(expect.any(constructor));
  expect(next.mock.calls[0][0].message).toMatch(message);
}
