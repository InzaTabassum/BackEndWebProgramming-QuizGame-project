const express = require('express'); 
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require('path');
const { NotFoundError,ValidationError } = require("../lib/errors");
const {z} = require("zod");


const QuestionInput = z.object({
  question: z.string().min(1),
  Answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});


const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});


const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});



function formatQuestion(question) {
  return {
    ...question,
    //answer: question.Answer,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user?.name || null,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined,
  };
}

// Apply authentication to ALL routes in this router
router.use(authenticate);


// GET /api/questions , /api/questions?keyword=capital&page=1&limit=5
router.get("/", async (req, res) => {
    const { keyword } = req.query;

    const where = keyword? { keywords: { some: { name: keyword } } }: {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([
    prisma.question.findMany({
        where,
        include: { 
            keywords: true, 
            user: true,
            attempts: { where: { userId: req.user.userId, correct: true }, take: 1 },
        },
        
        orderBy: { id: "asc" },
        skip,
        take: limit
        
    }),
    prisma.question.count({ where }),]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    })
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: {
             keywords: true,
             user: true, 
            attempts: { where: { userId: req.user.userId, correct: true }, take: 1 },
            },
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const { question, Answer, keywords } = QuestionInput.parse(req.body);

    const keywordsArray = keywords? keywords.split(",").map((kw) => kw.trim()).filter(Boolean): [];

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newQuestion = await prisma.question.create({
        data: {
            question,
            Answer,
            userId: req.user.userId,
            imageUrl,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({ 
                where: { name: kw }, create: { name: kw }, 
                })), },
                
        },

         include: { keywords: true },
    });

    res.status(201).json(formatQuestion(newQuestion));
});


//Put /api/questions/:qId
router.put("/:qId", upload.single("image"), isOwner, async (req, res) => {
    const qId = Number(req.params.qId);
    const { question, Answer, keywords } = QuestionInput.parse(req.body);

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const keywordsArray = keywords
    ? keywords.split(",").map((kw) => kw.trim()).filter(Boolean)
    : [];

    const updatedQuestion = await prisma.question.update({
        where: { id: qId },
        data: {
            question,
            Answer,
            imageUrl,
            keywords: {
                set: [], 
                connectOrCreate: keywordsArray.map((kw) => ({ 
                    where: { name: kw }, create: { name: kw }, 
                })), },
        },
        include: { keywords: true,user: true },
    });

    res.json(formatQuestion(updatedQuestion));
});

 // DELETE /api/questions/:qId
router.delete("/:qId", isOwner, async (req, res) => {
    const question = req.question;
    await prisma.question.delete({ where: { id: question.id }});
    res.json({ 
        msg: "Question deleted successfully",
        question: formatQuestion(question)
    });
});


//POST /api/questions/:qId/play
router.post("/:qId/play", async (req, res) => {
    const qId = Number(req.params.qId);

    const { answer } = req.body;

    if (!answer) {
        throw new ValidationError("Answer is required");
    }

    const question = await prisma.question.findUnique({ where: { id: qId } });
    if (!question) {
        throw new NotFoundError("Question not found");
    }

    const correct = answer.trim().toLowerCase() === question.Answer.trim().toLowerCase();

    const attempt = await prisma.attempt.upsert({
        where: { userId_qId: { userId: req.user.userId,qId} },
        update: { correct, answer},
        create: {
            userId: req.user.userId,
            qId,
            correct,
            answer,
        }
    });
   
    res.status(201).json({
        id: attempt.id,
        qId,
        correct,
        submittedAnswer: answer,
        correctAnswer: question.Answer,
        createdAt: attempt.createdAt,
    });
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError ||
        err?.message === "Only image files are allowed") {
        throw new ValidationError(err.message);
    }
    next(err);
});

module.exports = router;