const { resetDb, request, prisma,app } = require("./helpers");
const bcrypt = require("bcrypt");

beforeEach(resetDb);

it("registers, hashes the password, returns a token", async () => {
  const res = await request(app).post("/api/auth/register")
    .send({ email: "a@test.io", password: "pw12345", name: "A" });

  expect(res.status).toBe(201);
  expect(res.body.token).toEqual(expect.any(String));

  const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
  expect(user.password).not.toBe("pw12345");                          // not plain
  expect(await bcrypt.compare("pw12345", user.password)).toBe(true);  // valid hash
});

it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("email, password and name are required");
  });

it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ password: "pw12345", name: "A" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", name: "A" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345", name: "A" });

    const res = await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345", name: "A" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already registered");
  });

  it("returns 400 when login password is missing", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ email: "a@test.io" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("email and password are required");
  });

  it("returns 400 when login email is missing", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ password: "pw12345" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("email and password are required");
  });

  it("returns 401 when login email does not exist", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ email: "missing@test.io", password: "pw12345" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("returns 403 when login password is wrong", async () => {
    await request(app).post("/api/auth/register")
      .send({ email: "a@test.io", password: "pw12345", name: "A" });

    const res = await request(app).post("/api/auth/login")
      .send({ email: "a@test.io", password: "wrong" });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send('{"email": "a@test.io", "password": "pw12345"'); // invalid JSON
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid JSON in request body");
  });