import OpenAI from 'openai';

interface AIResponse {
  operation: string | null;
  column: string | null;
  confidence: number;
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL,
    'X-Title': 'DataVizAI',
  },
});

export async function extractIntent(
  userInput: string,
  availableColumns: string[],
  supportedOperations?: string[]
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are a specialized data analysis intent extractor. Your sole purpose is to convert natural language queries into structured JSON format.

Available columns in the dataset: ${availableColumns.join(', ')}
${supportedOperations ? `Available operations: ${supportedOperations.join(', ')}` : ''}

RULES:
1. Return ONLY a JSON object with these fields:
   - operation: the data operation requested (or null if unclear)
   - column: the column name from the available list (or null if unclear)
   - confidence: number 0-1 showing certainty

2. Match column names EXACTLY from the available list
3. Keep responses concise and strictly JSON format

Examples:
User: "what's the average age?"
{"operation": "average", "column": "age", "confidence": 0.95}

User: "show me hypertension distribution"
{"operation": "distribution", "column": "hypertension", "confidence": 0.9}

User: "how many smokers?"
{"operation": "count", "column": "smoking", "confidence": 0.85}`;

    const completion = await openai.chat.completions.create({

      model: 'deepseek/deepseek-r1-0528:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: 0.1, // Low temperature for more consistent outputs
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    const result = JSON.parse(response) as AIResponse;

    // Validate the column exists
    if (result.column && !availableColumns.includes(result.column)) {
      result.column = null;
      result.confidence *= 0.5;
    }

    return result;
  } catch (error) {
    console.error('AI intent extraction failed:', error);
    return {
      operation: null,
      column: null,
      confidence: 0
    };
  }
}
