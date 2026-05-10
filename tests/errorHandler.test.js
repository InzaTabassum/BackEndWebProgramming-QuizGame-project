const errorHandler = require("../src/middleware/errorHandler");
const jwt = require("jsonwebtoken");
const multer = require("multer");

function createRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

test("returns 400 for MulterError", () => {
  const res = createRes();
  const err = new multer.MulterError("LIMIT_FILE_SIZE");

  errorHandler(err, {}, res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: err.message });
});

test("returns 401 for JsonWebTokenError", () => {
  const res = createRes();
  const err = new jwt.JsonWebTokenError("jwt malformed");

  errorHandler(err, {}, res, () => {});

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
});

test("returns 500 for an unhandled error", () => {
  const res = createRes();
  const err = new Error("boom");

  errorHandler(err, {}, res, () => {});

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
});
