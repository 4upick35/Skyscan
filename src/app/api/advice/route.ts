
import { NextResponse } from 'next/server';
import { getPersonalizedWeatherAdvice } from '@/ai/flows/personalized-weather-advice';

/**
 * Расширенные CORS заголовки для работы в мобильном приложении и Studio
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

export async function POST(request: Request) {
  try {
    // Проверка наличия API ключа (только для логов/диагностики)
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      console.warn('WARNING: GOOGLE_GENAI_API_KEY is not set.');
    }

    const input = await request.json();
    const result = await getPersonalizedWeatherAdvice(input);
    
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('API_ADVICE_ERROR:', error);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'ОШИБКА_ГЕНЕРАЦИИ_СОВЕТА';

    return NextResponse.json(
      { error: 'ERROR_GENERATING_ADVICE', details: errorMessage },
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}
