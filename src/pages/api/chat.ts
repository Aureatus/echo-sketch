export const prerender = false;

import { generateText } from 'ai';
import type { APIRoute } from 'astro';

import model from '../../lib/llm/model';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { prompt } = body;

  const response = await generateText({ model, prompt });

  return new Response(JSON.stringify({ output: response.text }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
