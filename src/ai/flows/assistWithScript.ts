import { ai } from 'genkit';
import { z } from 'zod';

// Define the input and output schemas for the flow.
const AssistWithScriptInputSchema = z.object({
  fullText: z.string(),
  selectionText: z.string().optional(),
  instruction: z.string().optional(),
});

const AssistWithScriptOutputSchema = z.object({
  editedText: z.string(),
});

// Define the Genkit flow as an HTTPS endpoint.
export const assistWithScript = ai.defineFlow(
  {
    name: 'assistWithScript',
    input: AssistWithScriptInputSchema,
    output: AssistWithScriptOutputSchema,
    // This is a server-side flow to protect the API key.
    // Running AI analysis server-side prevents exposing your API key
    // to the client, which is a crucial security measure.
  },
  async (input) => {
    const { fullText, selectionText, instruction } = input;

    // Configure the Gemini model.
    const gemini = ai.generativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
    });

    let prompt: string;

    // Determine the prompt based on the input.
    if (selectionText && instruction) {
      // Prompt for editing a specific selection with an instruction.
      prompt = `Given the full text:\n\n"${fullText}"\n\nAnd the selected portion:\n\n"${selectionText}"\n\nApply the following instruction specifically to the selected text:\n\n"${instruction}"\n\nProvide the edited text of the selection only.`;
    } else if (fullText && instruction && !selectionText) {
       // Prompt for full script cleanup if no selection is provided with a cleanup instruction
       // Assuming a cleanup instruction might contain keywords like "cleanup", "format", "polish", etc.
       // A more robust check might be needed based on expected cleanup instructions.
       const cleanupInstructions = ["cleanup", "format", "polish", "improve flow", "correct grammar"]; // Example keywords
       const isCleanupInstruction = cleanupInstructions.some(keyword => instruction.toLowerCase().includes(keyword));

       if (isCleanupInstruction) {
           prompt = `Review the following full script and perform a general cleanup. This includes correcting grammar and punctuation, improving sentence structure, and ensuring a smooth flow. Do not change the core content or meaning.\n\nScript:\n\n"${fullText}"\n\nProvide the cleaned-up full script.`;
       } else {
           // Handle cases with fullText and instruction but not a cleanup instruction or selectionText
           throw new Error("Invalid instruction for full text processing without selection.");
       }
    }
     else {
      // Handle cases where required input is missing.
      throw new Error("Either provide fullText and a cleanup instruction, or provide fullText, selectionText, and an instruction.");
    }


    try {
      // Send the prompt to the Gemini model.
      const result = await gemini.generate({
        prompt: prompt,
      });

      // Extract the edited text from the model's response.
      const editedText = result.text();

      // Return the edited text in the specified JSON format.
      return { editedText: editedText };
    } catch (error) {
      console.error('Error during script assistance:', error);
      // Re-throw a more specific error or return a default error response
      throw new Error("Failed to process script with AI.");
    }
  }
);