export const toPrismaInt = (value) =>
  value === 0 || value === "0" ? 0 : parseInt(value) || null;

export const toPrismaFloat = (value) =>
  value === 0 || value === "0" ? 0 : parseFloat(value) || null;
