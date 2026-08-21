import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@hanastudio.dev" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@hanastudio.dev",
    },
  });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: "Sample Carousel",
      description: "A sample project for development.",
    },
  });

  await prisma.slide.createMany({
    data: [
      {
        projectId: project.id,
        position: 0,
        backgroundColor: "#FFFFFF",
      },
      {
        projectId: project.id,
        position: 1,
        backgroundColor: "#F5F5F5",
      },
    ],
  });

  const slides = await prisma.slide.findMany({
    where: { projectId: project.id },
    orderBy: { position: "asc" },
  });

  const firstSlide = slides[0]!;

  await prisma.element.create({
    data: {
      slideId: firstSlide.id,
      type: "TEXT",
      x: 100,
      y: 200,
      width: 880,
      height: 120,
      properties: {
        content: "Hello Hana Studio",
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: 700,
        fontStyle: "normal",
        textAlign: "center",
        color: "#1A1A1A",
        lineHeight: 1.2,
      },
    },
  });

  await prisma.element.create({
    data: {
      slideId: firstSlide.id,
      type: "SHAPE",
      x: 190,
      y: 400,
      width: 700,
      height: 500,
      properties: {
        shapeType: "rectangle",
        fill: "#E5E7EB",
        stroke: "#D1D5DB",
        strokeWidth: 1,
        borderRadius: 8,
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
