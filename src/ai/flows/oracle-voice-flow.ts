
/**
 * @fileOverview Поток для генерации голоса Оракула (TTS).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const OracleVoiceInputSchema = z.object({
  text: z.string().describe('Текст для озвучивания.'),
});

const OracleVoiceOutputSchema = z.object({
  audioDataUri: z.string(),
});

export async function generateOracleVoice(input: z.infer<typeof OracleVoiceInputSchema>) {
  return oracleVoiceFlow(input);
}

const oracleVoiceFlow = ai.defineFlow(
  {
    name: 'oracleVoiceFlow',
    inputSchema: OracleVoiceInputSchema,
    outputSchema: OracleVoiceOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-exp'), // Используем модель с поддержкой TTS через промпт или спец. конфигурацию
      // Примечание: В Genkit v1.x для прямого TTS часто используется специализированная модель gemini-2.5-flash-preview-tts
      // если она доступна в плагине.
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // "Холодный" мужской голос
          },
        },
      },
      prompt: `С интонацией холодного ИИ Umbrella Corp, произнеси следующее: ${input.text}`,
    });

    if (!media || !media.url) {
      throw new Error('FAILED_TO_GENERATE_AUDIO');
    }

    // Если модель вернула PCM, конвертируем в WAV
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
