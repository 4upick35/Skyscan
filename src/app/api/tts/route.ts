
import { NextResponse } from 'next/server';
import { generateOracleVoice } from '@/ai/flows/oracle-voice-flow';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: 'TEXT_REQUIRED' }, { status: 400 });

    const result = await generateOracleVoice({ text });
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('API_TTS_ERROR:', error);
    return NextResponse.json({ error: 'TTS_FAILED' }, { status: 500, headers: corsHeaders });
  }
}
