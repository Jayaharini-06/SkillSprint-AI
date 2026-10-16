
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const questionBanks = {
  "Java Developer": "question-bank.json",
  "Full Stack Developer": "fullstack-question-bank.json",
  "Data Analyst": "data-analyst-question-bank.json"
};

function loadQuestions(role) {
  const filename = questionBanks[role];

  if (!filename) {
    throw new Error("Invalid job role");
  }

  return JSON.parse(
    fs.readFileSync(path.join(__dirname, filename), "utf8")
  );
}

app.get("/", (req, res) => {
  res.json({ message: "SkillSprint AI backend is running!" });
});

app.get("/api/roles", (req, res) => {
  res.json(Object.keys(questionBanks));
});

app.get("/api/questions", (req, res) => {
  try {
    const { role, difficulty } = req.query;
    const allowed = ["Basic", "Moderate", "Hard"];

    if (!role || !difficulty || !allowed.includes(difficulty)) {
      return res.status(400).json({
        error: "Provide a valid role and difficulty."
      });
    }

    const questions = loadQuestions(role).filter(
      question => question.difficulty === difficulty
    );

    if (questions.length !== 25) {
      return res.status(500).json({
        error: `Expected 25 questions, found ${questions.length}. Check the question bank.`
      });
    }

    // Do not reveal correct answers or explanations during the test.
    res.json(questions.map(
      ({ correctAnswer, explanation, ...question }) => question
    ));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/score", (req, res) => {
  try {
    const { role, difficulty, answers } = req.body;
    const allowed = ["Basic", "Moderate", "Hard"];

    if (
      !role ||
      !allowed.includes(difficulty) ||
      !Array.isArray(answers)
    ) {
      return res.status(400).json({
        error: "Provide a valid role, difficulty, and answers array."
      });
    }

    const questions = loadQuestions(role).filter(
      question => question.difficulty === difficulty
    );

    if (
      questions.length !== 25 ||
      answers.length !== 25 ||
      new Set(answers.map(a => a.id)).size !== 25 ||
      answers.some(a =>
        !Number.isInteger(a.id) ||
        typeof a.selectedAnswer !== "string" ||
        !questions.some(q => q.id === a.id)
      )
    ) {
      return res.status(400).json({
        error: "Submit one valid answer for each of the 25 questions."
      });
    }

    const correct = questions.filter(question => {
      const answer = answers.find(a => a.id === question.id);
      return answer.selectedAnswer === question.correctAnswer;
    }).length;

    const passed = correct >= 23;

    res.json({
      role,
      difficulty,
      totalQuestions: 25,
      correctAnswers: correct,
      incorrectAnswers: 25 - correct,
      score: Math.round((correct / 25) * 100),
      passed,
      nextStep: passed
        ? difficulty === "Basic"
          ? "Proceed to Moderate"
          : difficulty === "Moderate"
            ? "Proceed to Hard"
            : "View final skill report"
        : "Review weak topics and retry this level"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SkillSprint AI backend running at http://localhost:${PORT}`);
});
