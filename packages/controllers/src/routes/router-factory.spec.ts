describe("createRouterFromSpec", () => {
  // This is a difficult one, as all we do is prep the ajv object.
  // It is up to MethodHandler to handle them.
  // Probably just mock the ajv constructor and make sure we add the schema?
  test.todo("handles $refs in schemas");

  // date, uuid, stuff from ajv-formats
  test.todo("handles formats in schemas");

  test.todo("parses json bodies by default");
  test.todo("does not parse json bodies if already parsed");
  test.todo("invokes the route handler factories");
  test.todo("implements the json handler middleware");
  test.todo("implements the response object handler middleware");
  test.todo("implements the fallback handler");
  test.todo("connects the handler to the router at the appropriate path");

  // Currently not implemented
  test.todo("handles http-errors");
});
