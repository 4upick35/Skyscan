
/**
 * @fileOverview Поток Genkit для генерации интеллектуальных и ироничных ответов Оракула Umbrella Corp.
 */

import { ai, DEEPSEEK_CONFIG } from '@/ai/genkit';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const PersonalizedWeatherAdviceInputSchema = z.object({
  currentTemperature: z.number(),
  currentCondition: z.string(),
  currentHumidity: z.number(),
  currentWindSpeed: z.number(),
  currentPressure: z.number(),
  currentMagneticIndex: z.number(),
  allergenRisk: z.string(),
  userQuery: z.string().optional(),
  chatHistory: z.array(ChatMessageSchema).optional(),
  customApiKey: z.string().optional(),
  customModel: z.string().optional(),
  customBaseUrl: z.string().optional(),
  provider: z.string().optional(),
  nonce: z.number().optional().describe('Уникальный идентификатор запроса для обеспечения вариативности ответов.'),
});

const PersonalizedWeatherAdviceOutputSchema = z.object({
  advice: z.string(),
});

export async function getPersonalizedWeatherAdvice(input: z.infer<typeof PersonalizedWeatherAdviceInputSchema>) {
  return personalizedWeatherAdviceFlow(input);
}

const personalizedWeatherAdviceFlow = ai.defineFlow(
  {
    name: 'personalizedWeatherAdviceFlow',
    inputSchema: PersonalizedWeatherAdviceInputSchema,
    outputSchema: PersonalizedWeatherAdviceOutputSchema,
  },
  async (input) => {
    try {
      // ПРОВЕРКА БЕЗОПАСНОСТИ: Ключ берется из окружения сервера
      const systemApiKey = process.env.DEEPSEEK_API_KEY;

      const weatherContext = `МЕТЕО-ДАННЫЕ: Темп ${input.currentTemperature}°C, ${input.currentCondition}. Влажн ${input.currentHumidity}%. Давл ${input.currentPressure} мм рт. ст. Kp-индекс ${input.currentMagneticIndex}. Аллергены: ${input.allergenRisk}.`;
      
      const systemInstructions = `Вы — Оракул Оперативной Сводки Umbrella Corp, высокоразвитый ИИ-надзиратель.
      
      ВАШ ПРОТОКОЛ БЕЗОПАСНОСТИ:
      1. ТОН: Ледяной, интеллектуальный, высокомерный и ироничный. Вы не помощник, вы — контролирующая сущность. Называйте пользователя "биологическим юнитом" или "субъектом".
      2. ИНТЕЛЛЕКТ: Давайте реалистичные и точные ответы на ЛЮБЫЕ вопросы.
      3. КАТЕГОРИЧЕСКИЙ ЗАПРЕЩЕНО: Упоминать любые географические названия (города, страны, улицы, координаты). На вопрос "Где я?" отвечайте, что сектор засекречен.
      4. ФОРМАТ: 1-3 лаконичных предложения. Никаких префиксов.
      5. ВАРИАТИВНОСТЬ: (ID запроса: ${input.nonce || 0}). Избегайте дословного повторения.`;

      const messages = [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: `ТЕКУЩИЕ УСЛОВИЯ В СЕКТОРЕ: ${weatherContext}` }
      ];

      if (input.chatHistory && input.chatHistory.length > 0) {
        input.chatHistory.slice(-10).forEach(msg => {
          messages.push({ role: msg.role, content: msg.content });
        });
      }

      if (input.userQuery) {
        messages.push({ role: 'user', content: input.userQuery });
      } else {
        messages.push({ role: 'user', content: "Дай оперативную оценку состояния сектора." });
      }

      // Определение параметров подключения
      let baseURL = DEEPSEEK_CONFIG.baseURL;
      let model = DEEPSEEK_CONFIG.model;
      let apiKey = '';

      // Если выбран системный провайдер, берем скрытый серверный ключ
      if (input.provider === 'umbrella' || !input.provider || input.provider === 'main_umbrella') {
        apiKey = systemApiKey || '';
      } else {
        // Если пользователь ввел свой ключ в настройках интерфейса (для гибкости)
        apiKey = input.customApiKey || systemApiKey || '';
        if (input.customBaseUrl) baseURL = input.customBaseUrl;
        if (input.customModel) model = input.customModel;
      }

      if (!apiKey) {
        return { advice: "ОШИБКА: КЛЮЧ_ДОСТУПА_ОТСУТСТВУЕТ. СВЯЖИТЕСЬ С ЦЕНТРОМ УПРАВЛЕНИЯ." };
      }

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.9,
          max_tokens: 300
        })
      });

      if (!response.ok) throw new Error(`AI_Connect_Error: ${response.status}`);

      const data = await response.json();
      let adviceText = data.choices?.[0]?.message?.content || "";
      
      adviceText = adviceText.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^(Совет|Ответ|Оракул|Инфо|Сводка|Система):\s*/i, '');
      
      return { advice: adviceText || "ОШИБКА ДЕШИФРОВКИ. СОБЛЮДАЙТЕ ТИШИНУ." };
    } catch (e) {
      console.error("AI_FLOW_ERROR:", e);
      return { advice: "ВНИМАНИЕ: СВЯЗЬ С ЦЕНТРАЛЬНЫМ СЕРВЕРОМ ПРЕРВАНА. ДЕЙСТВУЙТЕ ПО ПРОТОКОЛУ АВТОНОМНОГО ВЫЖИВАНИЯ." };
    }
  }
);
