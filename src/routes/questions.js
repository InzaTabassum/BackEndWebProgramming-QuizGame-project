const express = require('express'); 
const router = express.Router();
const prisma = require("../lib/prisma");


function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
  };
}


// GET /api/questions , /api/questions?keyword=capital
router.get("/", async (req, res) => {
    const { keyword } = req.query;

    const where = keyword? { keywords: { some: { name: keyword } } }: {};
    const filteredQuestions = await prisma.question.findMany({
        where,
        include: { keywords: true },
        orderBy: { id: "asc" },
    });

    res.json(filteredQuestions.map(formatQuestion));
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true }
    });

    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", async (req, res) => {
    const { question, Answer, keywords } = req.body;
    if (!question || !Answer ) {
        return res.status(400).json({ msg: "Question and Answer are required" });
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const newQuestion = await prisma.question.create({
        data: {
            question,
            Answer,
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
router.put("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const { question, Answer, keywords } = req.body;
    const q = await prisma.question.findUnique({
        where: { id: qId }
    });

    if (!q) {
        return res.status(404).json({ msg: "Question not found" });
    }

    if (!question || !Answer ) {
        return res.status(400).json({ msg: "Question and Answer are required" });
    }
    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const updatedQuestion = await prisma.question.update({
        where: { id: qId },
        data: {
            question,
            Answer,
            keywords: {
                set: [], 
                connectOrCreate: keywordsArray.map((kw) => ({ 
                    where: { name: kw }, create: { name: kw }, 
                })), },
        },
        include: { keywords: true },
    });

    res.json(formatQuestion(updatedQuestion));
});

 // DELETE /api/questions/:qId
router.delete("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true }
    });
    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }
   await prisma.question.delete({ where: { id: qId }});
    res.json({ 
        msg: "Question deleted successfully",
        question: formatQuestion(question)
    });
});


module.exports = router;