'use server';

/**
 * @fileOverview This file defines a Genkit flow to control the teleprompter via voice, handling both commands and speech tracking.
 *
 * - controlTeleprompter - A function that analyzes audio for commands or tracks speech position.
 * - TeleprompterControlInput - The input type for the controlTeleprompter function.
 * - TeleprompterControlOutput - The return type for the controlTeleprompter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrompterStateSchema = z.object({
    isPlaying: z.boolean(),
    prompterMode: z.enum(['text', 'slides']),
    totalSlides: z.number(),
    currentSlideIndex: z.number(),
});

const TeleprompterControlInputSchema = z.object({
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
  prompterState: PrompterStateSchema.describe('The current state of the teleprompter UI.'),
});
export type TeleprompterControlInput = z.infer<typeof TeleprompterControlInputSchema>;

const TeleprompterControlOutputSchema = z.object({
  command: z.enum([
      'next_slide', 
      'previous_slide', 
      'go_to_slide', 
      'stop_scrolling', 
      'start_scrolling', 
      'rewind', 
      'no_op'
    ]).describe("The interpreted command from the user's speech. 'no_op' if no command was detected."),
  slideNumber: z.number().nullable().describe("The target slide number for the 'go_to_slide' command."),
  lastSpokenWordIndex: z
    .number()
    .describe('The index of the last word in the script that was spoken in the audio. Only relevant if command is no_op.'),
  adjustedScrollSpeed: z
    .number()
    .describe('The adjusted scrolling speed based on the user\'s reading pace. Only relevant if command is no_op.'),
});
export type TeleprompterControlOutput = z.infer<typeof TeleprompterControlOutputSchema>;

export async function controlTeleprompter(input: TeleprompterControlInput): Promise<TeleprompterControlOutput> {
  return teleprompterControlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'teleprompterControlPrompt',
  input: {schema: TeleprompterControlInputSchema},
  output: {schema: TeleprompterControlOutputSchema},
  prompt: `You are an advanced AI controller for a teleprompter. Your primary job is to analyze an audio clip of a user's speech and determine if they are issuing a command OR reading from a script. Commands take precedence.

**1. Check for Commands:**
First, listen for explicit commands. The available commands are:
- "next slide" (triggers 'next_slide')
- "previous slide" (triggers 'previous_slide')
- "go to slide [number]" (triggers 'go_to_slide' and you MUST extract the slide number)
- "stop" / "pause" (triggers 'stop_scrolling')
- "start" / "play" / "go" (triggers 'start_scrolling')
- "rewind" / "go to the top" / "start over" (triggers 'rewind')

If a command is detected, set the 'command' field and 'slideNumber' (if applicable). In this case, you can set 'lastSpokenWordIndex' and 'adjustedScrollSpeed' to the current values as they are not relevant.

**2. If No Command, Track Position:**
If the audio does NOT contain a command, the user is reading the script. In this case, you must:
- Set 'command' to 'no_op'.
- Set 'slideNumber' to null.
- Transcribe the audio and match it to the provided script text.
- Identify the index of the last spoken word in the script.
- Analyze the reading pace and recommend an adjusted scroll speed.
- Set the 'lastSpokenWordIndex' and 'adjustedScrollSpeed' fields accordingly.

Full Script:
"{{{scriptText}}}"

Current State:
- Scrolling Speed: {{{currentScrollSpeed}}}
- Is Playing: {{{prompterState.isPlaying}}}
- Mode: {{{prompterState.prompterMode}}}
- Total Slides: {{{prompterState.totalSlides}}}
- Current Slide: {{{prompterState.currentSlideIndex}}}

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

const teleprompterControlFlow = ai.defineFlow(
  {
    name: 'teleprompterControlFlow',
    inputSchema: TeleprompterControlInputSchema,
    outputSchema: TeleprompterControlOutputSchema,
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
      console.error("An error occurred in the teleprompter control flow:", e);
      throw new Error('An unexpected error occurred while processing voice input.');
    }
  }
);
