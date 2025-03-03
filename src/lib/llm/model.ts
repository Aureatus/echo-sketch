import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.GOOGLE_AI_KEY,
});

const model = google('gemini-2.0-flash');

export default model;
