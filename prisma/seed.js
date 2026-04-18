const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
   {
    id: 1,
    question: "What is the capital of Finland?",
    Answer: "The capital of Finland is Helsinki.",
    keywords: ["finland", "capital"]
  },
  {
    id: 2,
    question: "What is the capital of Sweden?",
    Answer: "The capital of Sweden is Stockholm.",
    keywords: ["sweden", "capital"]
  },

  {
    id: 3,
    question: "What is the capital of Norway?",
    Answer: "The capital of Norway is Oslo.",
    keywords: ["norway", "capital"]
  },
  {
    id: 4,
    question: "What is the capital of Pakistan?",
    Answer: "The capital of Pakistan is Islamabad.",
    keywords: ["pakistan", "capital"]
  }
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();    

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        Answer: question.Answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

