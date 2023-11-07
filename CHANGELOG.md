# Changelog

## 2.0.0

- Ground-up redesign around OpenAPI and pluggability.

## 1.9.3

- Fix swagger docs on path aprams

## 1.9.2

- Fix swagger docs on query params

## 1.9.1

- Fix unintended use of 'util' library.

## 1.9.0

- If createRequestDecorator returns a promise, resolve the promise value before continuing.

## 1.8.0

- Merge params from child routes so that controller path params are available
- Update types to more closely match express options.

## 1.6.0

- Support middleware methods with `@middleware`.

## 1.5.0

- Support middleware on methods with `@use`
- Support creating custom decorators for parameters.

## 1.4.0

- Add options for sending other body formats than json serialized.
- Added `result({raw: true}, jsonString)` to send string data with an application/json content type without serializing the body.
- Added `result(contentType, body)` for specifying content types. An application/json content type will stringify the body.
- Added `result("application/json", {raw: true}, body)` for explicitly specifying application/json but the body to be sent as-is.
- Added `result.json(body)` as an explicit version of `result(body)`
- Added `result.text(body)` as a shorthand for `result("text/plain", body)`
- Added `result.html(body)` "as a shorthand for `result("text/html", body)`

## 1.3.0

- Add `result.handled()` to bypass response processing when the response was handled by the controller method.

## 1.2.0

- Support middleware at the controller level.

## 1.1.8

- Allow receiving number, string, boolean as body data.

## 1.1.7

- Fix error on returning null or zero value from controller method.

## 1.1.6

- Treat body data as json. Fixes sending non-object primitives.

## 1.1.5

- Fix crash when method has no arguments.
