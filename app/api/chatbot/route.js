import { NextResponse } from 'next/server';
import { chatbotReply, escalation } from '@/lib/chatbot';
import { analyzeMessage } from '@/lib/safety';
export const dynamic = 'force-dynamic';

/**
 * TownTrade AI Assistant endpoint.
 * - When AI_API_KEY (OpenAI-compatible) is configured, the message is sent to
 *   the model for a real AI reply.
 * - Otherwise the local intent engine answers, and unknown questions escalate
 *   to the owner's WhatsApp DM.
 */
async function askLlm(message) {
  const key = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
  if (!key) return null;
  const base = process.env.AI_API_BASE || 'https://api.openrouter.ai';
  const model = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  // OpenRouter likes to know where traffic comes from (free-tier friendly).
  if (base.includes('openrouter')) {
    headers['HTTP-Referer'] = process.env.APP_URL || 'https://towntrade-three.vercel.app';
    headers['X-Title'] = 'TownTrade';
  }
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 240,
      messages: [
        {
          role: 'system',
          content:
            'You are the TownTrade AI assistant for a local neighborhood marketplace. Answer helpfully and briefly (under 120 words). Facts: TownTrade charges one flat 5% platform fee and sellers keep 95%; payments are escrow-protected until the buyer confirms delivery; buyers can pay by card (Stripe) or a local OPay transfer to the platform account 8121344178 (OPay, Mberekpe Praise Chineamerem); the Safety Bot watches chats for scams and blocks card/account/phone numbers; the admin is reachable on WhatsApp. If the user asks for a human, real-person help, or you cannot answer confidently, reply with EXACTLY the word ESCALATE on its own line.',
        },
        { role: 'user', content: String(message).slice(0, 1000) },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return null;
  if (text.toUpperCase().includes('ESCALATE')) return null;
  return text;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!message) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });

  // Safety first: even the assistant never echoes sensitive data.
  const scan = analyzeMessage(message);
  if (scan.flagged) {
    return NextResponse.json({
      answer: `⚠️ I noticed that message may contain ${scan.label}. Please never share card numbers, account details, or phone numbers in chat — the Safety Bot blocks them to protect you. Ask me how to pay safely instead!`,
      matched: 'safety',
      escalate: false,
      flagged: true,
    });
  }

  // Real AI when a key is configured (OpenRouter or OpenAI-compatible), local
  // intent engine otherwise — the assistant never goes silent.
  let answer = null;
  if (process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY) {
    try {
      answer = await askLlm(message);
    }
    catch { /* fall through to local engine */ }
  }
  if (answer) {
    return NextResponse.json({ answer, matched: 'ai', escalate: false, ai: true });
  }

  const local = chatbotReply(message);
  return NextResponse.json({
    answer: local.answer,
    matched: local.matched,
    escalate: local.escalate,
    ai: false,
    escalation: local.escalate ? escalation() : undefined,
  });
}
