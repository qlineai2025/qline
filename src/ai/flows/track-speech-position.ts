'use server';

/**
 * @fileOverview This file defines a Genkit flow to track the user's speech position and pace within a script.
 *
 * - trackSpeechPosition - A function that identifies the last spoken word's index and adjusts scroll speed based on reading pace.
 * - TrackSpeechPositionInput - The input type for the trackSpeechPosition function.
 * - TrackSpeechPositionOutput - The return type for the trackSpeechPosition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrackSpeechPositionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio data URI of the user's speech, which must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  scriptText: z
    .string()
    .describe('The full text of the script the user is reading.'),
  currentScrollSpeed: z
    .number()
    .describe('The current scrolling speed of the teleprompter.'),
});
export type TrackSpeechPositionInput = z.infer<typeof TrackSpeechPositionInputSchema>;

const TrackSpeechPositionOutputSchema = z.object({
  lastSpokenWordIndex: z
    .number()
    .describe('The index of the last word in the script that was spoken in the audio.'),
  adjustedScrollSpeed: z
    .number()
    .describe('The adjusted scrolling speed based on the user\'s reading pace.'),
});
export type TrackSpeechPositionOutput = z.infer<typeof TrackSpeechPositionOutputSchema>;

export async function trackSpeechPosition(input: TrackSpeechPositionInput): Promise<TrackSpeechPositionOutput> {
  return trackSpeechPositionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'trackSpeechPositionPrompt',
  input: {schema: TrackSpeechPositionInputSchema},
  output: {schema: TrackSpeechPositionOutputSchema},
  prompt: `You are an expert teleprompter controller. Your task is to analyze an audio clip of a user reading from a script and determine their exact position and reading pace.

  1. Transcribe the provided audio clip.
  2. Match the transcribed text to the full script text provided.
  3. Identify the index of the very last word from the script that was spoken in the audio. The script is zero-indexed based on words.
  4. Analyze the user's reading pace in the audio clip. Based on their pace and the current scroll speed, recommend an adjusted scroll speed. The speed should be a value that would make the teleprompter match their reading pace.

  Return the word index and the adjusted scroll speed.

  Full Script:
  "{{{scriptText}}}"

  Current Scroll Speed: {{{currentScrollSpeed}}}

  Audio Clip:
  {{media url=audioDataUri}}`,
  config: {
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

const trackSpeechPositionFlow = ai.defineFlow(
  {
    name: 'trackSpeechPositionFlow',
    inputSchema: TrackSpeechPositionInputSchema,
    outputSchema: TrackSpeechPositionOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (output === null || output === undefined) {
        throw new Error('The AI model did not produce a valid output.');
      }
      return output;
    } catch (e: any) {
      if (e.message?.includes('API key')) {
        console.error("Genkit configuration error: The GOOGLE_API_KEY may be missing or invalid.", e);
        throw new Error('Voice Control is not configured. Please ensure your GOOGLE_API_KEY is set correctly in the .env file.');
      }
      console.error("An error occurred in the trackSpeechPosition flow:", e);
      throw new Error('An unexpected error occurred while tracking speech position.');
    }
  }
);
