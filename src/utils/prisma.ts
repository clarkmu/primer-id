import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalThisTyped = globalThis as typeof globalThis & {
  prisma?: PrismaClientSingleton;
};

const prisma = globalThisTyped.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThisTyped.prisma = prisma;

export default prisma;
