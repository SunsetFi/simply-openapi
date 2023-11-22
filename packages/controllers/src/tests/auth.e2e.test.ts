// import { Controller, Get } from "../decorators";

// describe("E2E: Auth", function () {
//   describe("controller scoped authentication", function () {
//     const authenticateFn = jest.fn();

//     beforeEach(function () {
//       authenticateFn.mockReset();
//     });

//     @Authenticator("widgetAuth")
//     class WidgetAuthenticator implements AuthenticationController {
//       authenticate(ctx: AuthenticationContext) {
//         return authenticateFn(ctx);
//       }
//     }

//     @Controller()
//     @Authentication(WidgetAuthenticator)
//     class WidgetController {
//       @Get("/")
//       getMethod() {}
//     }
//   });
// });
