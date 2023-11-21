# Publishing your OpenAPI specification

While the OpenAPI spec produced by createOpenAPIFromControllers is fully formed and valid, you may wish to strip away metadata describing the handlers before publishing it. The `stripSOCExtensions` function is provided to do this.

```typescript
let docs = createOpenAPIFromControllers(info, types);

docs = stripSOCExtensions(docs);
```

This will generate a copy of the documentatin that has all @simply-openapi/controllers extensions removed from it.

## Hosting your spec with swagger

As with any OpenAPI document object, you can host it from your own application using `swagger-ui-express`

```typescript
import express from "express";
import {
  serve as swaggerServe,
  setup as swaggerSetup,
} from "swagger-ui-express";

import {
  createOpenAPIFromControllers,
  stripSOCExtensions
} from "@simply-openapi/controllers";

import { controllers } from "./controllers";

const app = express();

const docs = createOpenAPIFromControllers(..., controllers);

...

// This step is optional.
const strippedDocs = stripSOCExtensions(docs);

app.use("/openapi", swaggerServe, swaggerSetup(strippedDocs));

app.listen(8080);

```
