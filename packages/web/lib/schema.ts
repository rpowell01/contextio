import { z } from "zod";

const RedactionRuleSchema = z.object({
  id: z.string().min(1, "Rule id is required"),
  pattern: z.string().min(1, "Pattern is required"),
  replacement: z.string().min(1, "Replacement is required"),
  context: z.array(z.string()).optional(),
  contextWindow: z.number().min(1).optional(),
});

const AllowlistSchema = z.object({
  strings: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
});

const PathsSchema = z.object({
  only: z.array(z.string()).optional(),
  skip: z.array(z.string()).optional(),
});

export const policySchema = z.object({
  extends: z.enum(["secrets", "pii", "strict"]).optional(),
  rules: z.array(RedactionRuleSchema).optional(),
  allowlist: AllowlistSchema.optional(),
  paths: PathsSchema.optional(),
});

export type PolicySchema = z.infer<typeof policySchema>;