const authenticate = require("../src/middleware/auth");
const { ForbiddenError } = require("../src/lib/errors");

test("authenticate throws ForbiddenError for invalid token", () => {
  const req = {
    headers: { authorization: "Bearer invalid.token.here" },
    log: { warn: vi.fn() },
  };
  const res = {};
  const next = vi.fn();

  expect(() => authenticate(req, res, next)).toThrow(ForbiddenError);
  expect(req.log.warn).toHaveBeenCalled();
});
