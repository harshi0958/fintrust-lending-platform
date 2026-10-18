const { z } = require("zod");

const createLoanApplicationSchema = z
  .object({
    loanType: z.enum([
      "PERSONAL",
      "HOME",
      "EDUCATION",
      "VEHICLE",
      "GOLD",
      "PROPERTY",
    ]),

    requestedAmount: z.coerce
      .number()
      .finite()
      .positive()
      .max(100000000),

    tenureMonths: z.coerce
      .number()
      .int()
      .min(1)
      .max(360),

    purpose: z.string().trim().min(10).max(500),

    employmentType: z.enum([
      "SALARIED",
      "SELF_EMPLOYED",
      "STUDENT",
      "OTHER",
    ]),

    monthlyIncome: z.coerce
      .number()
      .finite()
      .min(0)
      .max(1000000000),

    employerName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .default(""),
  })
  .strict();

module.exports = { createLoanApplicationSchema };