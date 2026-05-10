const { request, app } = require("./helpers");

it("returns 404 for unknown route", async () => {
  const res = await request(app).get("/api/unknown-route");
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Not found");
});
