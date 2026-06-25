import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().optional(),
    OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
    DEEPSEEK_API_KEY: z.string().optional(),
    DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
    DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  })
  .passthrough();

export type Env = z.infer<typeof envSchema>;
