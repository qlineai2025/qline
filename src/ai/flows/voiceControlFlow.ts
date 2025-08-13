import {ai, stream} from 'genkit';
import {z} from 'zod';

// Define the input and output schemas for the flow.
// The input is a stream of audio chunks (represented as Blobs).
// The output is a stream of potential commands (JSON objects or null).
const VoiceControlInputSchema = z.object({
  audioChunk: z.instanceof(Blob),
});

const VoiceControlOutputSchema = z.object({
  command: z.enum(['scroll_down']).nullable(),
  speed: z.enum(['medium']).nullable(),
});

// Define the Genkit flow as a real-time, bidirectional stream.
export const voiceControlFlow = ai.defineStreamingFlow(
  {
    name: 'voiceControlFlow',
    input: VoiceControlInputSchema,
    output: VoiceControlOutputSchema,
    // This is a server-side flow to protect the API key.
    // Running AI analysis server-side prevents exposing your API key
    // to the client, which is a crucial security measure.
  },
  async (input, streamingHandle) => {
    // Configure the Gemini model to respond with JSON.
    const gemini = ai.generativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      config: {
        responseMimeType: 'application/json',
      },
    });

    // Process the incoming audio stream.
    for await (const chunk of input) {
      const audioPart = new stream.Part({
        mimeType: chunk.audioChunk.type,
        data: chunk.audioChunk,
      });

      // Define the prompt for the Gemini model.
      const prompt = `Analyze the provided audio for any significant pauses in speech. A significant pause is a silence lasting longer than 1.5 seconds. If a pause is detected, respond with a JSON object containing a "command" field set to "scroll_down" and a "speed" field set to "medium". If no significant pause is detected, respond with a null or empty JSON object.`;

      try {
        // Send the audio chunk and prompt to the Gemini model for analysis.
        const result = await gemini.generate({
          prompt: [prompt, audioPart],
        });

        // Parse the JSON output from the model.
        const output = JSON.parse(result.text());

        // Stream the output back to the client.
        await streamingHandle.stream(output);
      } catch (error) {
        console.error('Error analyzing audio chunk:', error);
        // Optionally stream an error or a specific null/empty object
        // to the client to indicate an issue.
        await streamingHandle.stream(null);
      }
    }
  }
);