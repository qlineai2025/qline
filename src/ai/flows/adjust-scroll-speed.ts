'use server';

/**
 * @fileOverview This file defines a Genkit flow to adjust the teleprompter scrolling speed based on the user's speech patterns.
 *
 * - adjustScrollSpeed - A function that adjusts the scrolling speed based on detected pauses in speech.
 * - AdjustScrollSpeedInput - The input type for the adjustScrollSpeed function.
 * - AdjustScrollSpeedOutput - The return type for the adjustScrollSpeed function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustScrollSpeedInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio data URI of the user's speech, which must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  currentScrollSpeed: z
    .number()
    .describe('The current scrolling speed of the teleprompter.'),
});
export type AdjustScrollSpeedInput = z.infer<typeof AdjustScrollSpeedInputSchema>;

const AdjustScrollSpeedOutputSchema = z.object({
  adjustedScrollSpeed: z
    .number()
    .describe('The adjusted scrolling speed of the teleprompter.'),
});
export type AdjustScrollSpeedOutput = z.infer<typeof AdjustScrollSpeedOutputSchema>;

export async function adjustScrollSpeed(input: AdjustScrollSpeedInput): Promise<AdjustScrollSpeedOutput> {
  return adjustScrollSpeedFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustScrollSpeedPrompt',
  input: {schema: AdjustScrollSpeedInputSchema},
  output: {schema: AdjustScrollSpeedOutputSchema},
  prompt: `You are an expert teleprompter speed controller. Given the user's
 speech audio and the current scrolling speed, analyze the audio for pauses and
 adjust the scrolling speed accordingly to match the user's natural reading pace.

Audio: {{media url=audioDataUri}}
Current Scroll Speed: {{{currentScrollSpeed}}}

Based on the speech patterns in the audio, determine the ideal adjusted scrolling speed.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const adjustScrollSpeedFlow = ai.defineFlow(
  {
    name: 'adjustScrollSpeedFlow',
    inputSchema: AdjustScrollSpeedInputSchema,
    outputSchema: AdjustScrollSpeedOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      // Added a check for null/undefined output for robustness.
      if (!output) {
        throw new Error('The AI model did not produce a valid output.');
      }
      return output;
    } catch (e: any) {
      // Provide a more specific error message if the API key is missing.
      if (e.message?.includes('API key')) {
        console.error("Genkit configuration error: The GOOGLE_API_KEY may be missing or invalid.", e);
        throw new Error('Voice Control is not configured. Please ensure your GOOGLE_API_KEY is set correctly in the .env file.');
      }
      // Log the original error for debugging and re-throw a generic error for the client.
      console.error("An error occurred in the adjustScrollSpeed flow:", e);
      throw new Error('An unexpected error occurred while adjusting scroll speed.');
    }
  }
);
