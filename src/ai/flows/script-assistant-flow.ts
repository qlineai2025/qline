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
  fix: "Correct any spelling and grammar mistakes in the provided script.",
  rewrite: "Rewrite the provided script to be more clear, concise, and engaging for a speaker.",
  format: "Format the provided script for better readability on a teleprompter. This may include adding line breaks, standardizing punctuation, and ensuring consistent spacing. Do not change the wording, only the formatting."
};

const ScriptAssistantCommandSchema = z.enum(['fix', 'rewrite', 'format']);
export type ScriptAssistantCommand = z.infer<typeof ScriptAssistantCommandSchema>;


const ScriptAssistantFlowInputSchema = z.object({
  scriptText: z.string().describe('The script text to be modified.'),
  instruction: z.string().describe('The editing instruction to perform.'),
});

const ScriptAssistantPromptInputSchema = z.object({
    scriptText: z.string(),
    instruction: z.string(),
});

const ScriptAssistantInputSchema = z.object({
  scriptText: z.string().describe('The script text to be modified.'),
  command: ScriptAssistantCommandSchema.describe('The editing command to perform.'),
});
export type ScriptAssistantInput = z.infer<typeof ScriptAssistantInputSchema>;


export async function assistWithScript(input: ScriptAssistantInput): Promise<string> {
  const instruction = commandInstructionMap[input.command];
  return scriptAssistantFlow({ scriptText: input.scriptText, instruction });
}

const prompt = ai.definePrompt({
  name: 'scriptAssistantPrompt',
  input: { schema: ScriptAssistantPromptInputSchema },
  output: { schema: z.string() },
  prompt: `You are an expert script writing assistant. Your task is to modify a script based on a given instruction. Return only the full, modified script text. Do not add any extra commentary, conversational text, or explanation.

Instruction: {{instruction}}

Script to modify:
"{{{scriptText}}}"
  `,
});

const scriptAssistantFlow = ai.defineFlow(
  {
    name: 'scriptAssistantFlow',
    inputSchema: ScriptAssistantFlowInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { output } = await prompt(input);
    if (output === null || output === undefined) {
      throw new Error('The AI model did not produce a valid output.');
    }
    return output;
  }
);
