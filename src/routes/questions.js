const express = require('express'); 
const router = express.Router();

const questions = require('../data/questions');

// GET /api/questions , /api/questions?keyword=capital
router.get("/", (req, res) => {
    const { keyword } = req.query;
    if (!keyword) {
        return res.json(questions);
    }
    const filteredQuestions = questions.filter(q => q.keywords.includes(keyword));
    res.json(filteredQuestions);
});

// GET /api/questions/:qId
router.get("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const question = questions.find(q => q.id === qId);
    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }
    res.json(question);
});

// POST /api/questions
router.post("/", (req, res) => {
    const { question, Answer, keywords } = req.body;
    if (!question || !Answer ) {
        return res.status(400).json({ msg: "Question and Answer are required" });
    }

    const existingIds = questions.map(q => q.id);
    const maxId = Math.max(...existingIds);

    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question,
        Answer,
        keywords: Array.isArray(keywords) ? keywords : []
    };
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});


//Put /api/questions/:qId
router.put("/:qId", (req, res) => {
const qId = Number(req.params.qId);
    const q = questions.find(q => q.id === qId);
    if (!q) {
        return res.status(404).json({ msg: "Question not found" });
    }

  const { question, Answer, keywords } = req.body;
    if (!question || !Answer ) {
        return res.status(400).json({ msg: "Question and Answer are required" });
    }
    q.question = question;
    q.Answer = Answer;
    q.keywords = Array.isArray(keywords) ? keywords : [];
    res.json(q);
});
 // DELETE /api/questions/:qId
router.delete("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const index = questions.findIndex(q => q.id === qId);
    if (index === -1) {
        return res.status(404).json({ msg: "Question not found" });
    }
   const deletedQuestion = questions.splice(index, 1);
    res.json({ 
        msg: "Question deleted successfully",
        question: deletedQuestion
    });
});


module.exports = router;