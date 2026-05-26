
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Инициализация Genkit для Umbrella SkyScan.
 * Использует Google AI для общих задач (например, голос) и DeepSeek для чата.
 * Ключи считываются автоматически из процесса (процесс сервера).
 */
export const ai = genkit({
  plugins: [
    googleAI(), // Использует GOOGLE_GENAI_API_KEY из .env
  ],
});

// Константа для API DeepSeek (OpenAI-совместимый эндпоинт)
export const DEEPSEEK_CONFIG = {
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat'
};
