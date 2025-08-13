'use server';

/**
 * @fileOverview A script editing assistant AI flow.
 *
 * - assistWithScript - A function that modifies script text based on a command.
 * - ScriptAssistantInput - The input type for the assistWithScript function.
 * - ScriptAssistantCommand - The type for the available commands.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const commandInstructionMap = {
  fix: "Correct any spelling and grammar mistakes in the provided text.",
  rewrite: "Rewrite the provided text to be more clear, concise, and engaging for a speaker.",
  format: "Format the provided text for better readability on a teleprompter. This may include adding line breaks, standardizing punctuation, and ensuring consistent spacing. Do not change the wording, only the formatting.",
  cleanup: "Clean up and reformat the entire script. Remove any timecode stamps (e.g., from .srt or .vtt files). Reformat the text into clear paragraphs. Identify any speaker names (e.g., 'John:', 'SPEAKER 2:') and convert them to ALL CAPS followed by a colon."
};

const ScriptAssistantCommandSchema = z.enum(['fix', 'rewrite', 'format', 'cleanup']);
export type ScriptAssistantCommand = z.infer<typeof ScriptAssistantCommandSchema>;

const ScriptAssistantFlowInputSchema = z.object({
  scriptText: z.string().describe('The full script text for context.'),
  instruction: z.string().describe('The editing instruction to perform.'),
  selectedText: z.string().optional().describe('The portion of the script the user has selected to modify.'),
});

const ScriptAssistantInputSchema = z.object({
  scriptText: z.string().describe('The full script text for context.'),
  command: ScriptAssistantCommandSchema.describe('The editing command to perform.'),
  selectedText: z.string().optional().describe('The portion of the script the user has selected to modify.'),
});
export type ScriptAssistantInput = z.infer<typeof ScriptAssistantInputSchema>;


export async function assistWithScript(input: ScriptAssistantInput): Promise<string> {
  const instruction = commandInstructionMap[input.command];
  return scriptAssistantFlow({
    scriptText: input.scriptText,
    instruction,
    selectedText: input.selectedText
  });
}

const prompt = ai.definePrompt({
  name: 'scriptAssistantPrompt',
  input: { schema: ScriptAssistantFlowInputSchema },
  output: { schema: z.string() },
  prompt: `You are an expert script writing assistant. Your task is to modify text based on a given instruction.

Instruction: {{instruction}}
{{#if selectedText}}
The user has selected a portion of a larger script to modify. You MUST focus your changes only on the "Selected Portion". Use the "Full Script for Context" to understand the surrounding text.
Your response MUST be ONLY the modified version of the selected text. Do not return the full script or any extra commentary.

Full Script for Context:
"{{{scriptText}}}"

Selected Portion to Modify:
"{{{selectedText}}}"
{{else}}
The user wants to modify the entire script.
Your response MUST be the full, modified script text. Do not add any extra commentary.

Script to Modify:
"{{{scriptText}}}"
{{/if}}
  `,
});

const scriptAssistantFlow = ai.defineFlow(
  {
    name: 'scriptAssistantFlow',
    inputSchema: ScriptAssistantFlowInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (output === null || output === undefined) {
        throw new Error('The AI model did not produce a valid output.');
      }
      return output;
    } catch (e: any) {
        console.error("An error occurred in the script assistant flow:", e);
        // ✅ Return an empty string or a custom error message string
        //    as the client is expecting a string output.
        return 'An unexpected error occurred while processing your request.';
    }
  }
);