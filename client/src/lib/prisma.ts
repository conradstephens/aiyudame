import { connect } from "@planetscale/database";
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "@prisma/client";
import { fetch as undiciFetch } from "undici";

// Initialize Prisma Client with the PlanetScale serverless database driver
const connection = connect({
  url: process.env.DATABASE_URL,
  fetch: undiciFetch,
});

const adapter = new PrismaPlanetScale(connection);

const prismaClientSingleton = () => {
  // pass in adapter to the prisma client
  return new PrismaClient({ adapter });
};

type prismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: prismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
