const { resetDb, registerAndLogin, request, app, prisma,createQuestion } = require("./helpers");

beforeEach(resetDb);

describe("question tests", () => {
it("returns 401 without a token", async () => {
  const res = await request(app).get("/api/questions");
  expect(res.status).toBe(401);
});

it("returns 403 for an invalid token", async () => {
  const res = await request(app).get("/api/questions")
    .set("Authorization", "Bearer invalid.token.here");
  expect(res.status).toBe(403);
  expect(res.body.message).toBe("Invalid or expired token");
});

it("returns 404 for unknown question", async () => {
  const token = await registerAndLogin();
  const res = await request(app).get("/api/questions/99999")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Question not found");
});

it("returns 400 for invalid question body", async () => {
  const token = await registerAndLogin();
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "" });
  expect(res.status).toBe(400);
});
it("returns 403 when editing someone else's question", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const post = await createQuestion(aliceToken, { question: "Alice's question" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/questions/${post.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ question: "hijacked", Answer: "hijacked" });

  expect(res.status).toBe(403);

  const after = await prisma.question.findUnique({ where: { id: post.id } });
  expect(after.question).toBe("Alice's question");  // unchanged
});





// Add Tests for user input
describe("POST /api/questions", () => {
  it("creates a question with keywords", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Capital of France?", Answer: "Paris", keywords: "geography,europe" });
    expect(res.status).toBe(201);
    expect(res.body.question).toBe("Capital of France?");
    expect(res.body.keywords).toContain("geography");
    expect(res.body.keywords).toContain("europe");
  });

  it("creates a question without keywords", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q1", Answer: "A1" });
    expect(res.status).toBe(201);
    expect(res.body.keywords).toEqual([]);
  });

  it("creates a question with an image upload", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "picture.png")
      .field("question", "Image Q")
      .field("Answer", "A1");

    expect(res.status).toBe(201);
    expect(res.body.question).toBe("Image Q");
    expect(res.body.imageUrl).toContain("/uploads/");
  });

  it("returns 400 when Answer is missing", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q1" });
    expect(res.status).toBe(400);
  });

   it("returns 400 when question is missing", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ Answer: "A1" });
    expect(res.status).toBe(400);
  });
it("returns 400 for invalid file upload type", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("not an image"), "file.txt")
      .field("question", "Q1")
      .field("Answer", "A1");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Only image files are allowed");
  });
});

describe("GET /api/questions list", () => {
  it("returns questions with pagination", async () => {
    const token = await registerAndLogin();
    await createQuestion(token, { question: "Q1", Answer: "A1" });
    await createQuestion(token, { question: "Q2", Answer: "A2" });
    
    const res = await request(app).get("/api/questions?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.page).toBe(1);
  });

    it("returns an existing question by id", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1", keywords: "test" });

    const res = await request(app).get(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.question).toBe("Q1");
    expect(res.body.keywords).toEqual(["test"]);
  });


  it("filters questions by keyword", async () => {
    const token = await registerAndLogin();
    await createQuestion(token, { question: "Q1", Answer: "A1", keywords: "math" });
    await createQuestion(token, { question: "Q2", Answer: "A2", keywords: "science" });
    
    const res = await request(app).get("/api/questions?keyword=math")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].question).toBe("Q1");
  });

  it("returns totalPages in response", async () => {
    const token = await registerAndLogin();
    await createQuestion(token, { question: "Q1", Answer: "A1" });
    
    const res = await request(app).get("/api/questions?limit=5")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalPages).toBeDefined();
  });
});

describe("PUT /api/questions/:qId", () => {

  it("updates question with new keywords", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1", keywords: "old" });

    const res = await request(app).put(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q1", Answer: "A1", keywords: "new,tags" });
    expect(res.status).toBe(200);
    expect(res.body.keywords).toContain("new");
    expect(res.body.keywords).toContain("tags");
    expect(res.body.keywords).not.toContain("old");
  });
  it("updates own question successfully", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1" });

    const res = await request(app).put(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Updated Q", Answer: "Updated A" });
    expect(res.status).toBe(200);
    expect(res.body.question).toBe("Updated Q");
  });

  it("returns 404 when question does not exist", async () => {
    const token = await registerAndLogin();
    const res = await request(app).put("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q", Answer: "A" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when question is empty", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1" });

    const res = await request(app).put(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "", Answer: "A" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when Answer is empty", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1" });

    const res = await request(app).put(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "Q", Answer: "" });
    expect(res.status).toBe(400);
  });

  it("returns 403 when deleting someone else's question", async () => {
    const aliceToken = await registerAndLogin("alice@test.io", "Alice");
    const created = await createQuestion(aliceToken, { question: "Private Q", Answer: "A1" });

    const bobToken = await registerAndLogin("bob@test.io", "Bob");
    const res = await request(app).delete(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/questions/:qId", () => {
  it("deletes own question", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1" });

    const res = await request(app).delete(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Question deleted successfully");

    const getRes = await request(app).get(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 when deleting non-existent question", async () => {
    const token = await registerAndLogin();
    const res = await request(app).delete("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/questions/:qId/play", () => {
  it("returns correct when answer matches exactly", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "Paris" });

    const res = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "Paris" });
    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);
    expect(res.body.correctAnswer).toBe("Paris");
  });

  it("returns incorrect when answer does not match", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "Paris" });

    const res = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "London" });
    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(false);
  });

  it("handles case-insensitive answers", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "Paris" });

    const res = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "PARIS" });
    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);
  });

  it("handles answers with extra whitespace", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "Paris" });

    const res = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "  Paris  " });
    expect(res.status).toBe(201);
    expect(res.body.correct).toBe(true);
  });

  it("returns 404 when question does not exist", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions/99999/play")
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "A" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when answer is missing", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "A1" });

    const res = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("updates existing attempt on second play", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "Q1", Answer: "Paris" });

    const res1 = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "London" });
    const firstId = res1.body.id;

    const res2 = await request(app).post(`/api/questions/${created.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "Paris" });
    
    expect(res2.body.id).toBe(firstId); // Same attempt ID
    expect(res2.body.correct).toBe(true);
  });
});





});