'use server';
/**
 * @fileOverview Flows for interacting with Google Drive and Google Docs APIs.
 *
 * - listGoogleDocs - Fetches a list of Google Docs from the user's Drive.
 * - getGoogleDocContent - Fetches and parses the text content of a specific Google Doc.
 * - GoogleDoc - The type for a single Google Doc file.
 * - ListGoogleDocsInput - The input type for the listGoogleDocs function.
 * - GetGoogleDocContentInput - The input type for the getGoogleDocContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';

// Schema for a single Google Doc file
const GoogleDocSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type GoogleDoc = z.infer<typeof GoogleDocSchema>;

// Input schema for listing Google Docs
const ListGoogleDocsInputSchema = z.object({
  accessToken: z.string().describe('The OAuth2 access token for the user.'),
});
export type ListGoogleDocsInput = z.infer<typeof ListGoogleDocsInputSchema>;

// Input schema for getting Google Doc content
const GetGoogleDocContentInputSchema = z.object({
  accessToken: z.string().describe('The OAuth2 access token for the user.'),
  documentId: z.string().describe('The ID of the Google Doc to fetch.'),
});
export type GetGoogleDocContentInput = z.infer<
  typeof GetGoogleDocContentInputSchema
>;

/**
 * Sets up an authenticated OAuth2 client.
 * @param accessToken The user's OAuth2 access token.
 * @returns An authenticated OAuth2 client instance.
 */
function getAuthenticatedClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

/**
 * Fetches a list of Google Docs from the user's Google Drive.
 * @param input The input containing the user's access token.
 * @returns A promise that resolves to an array of Google Docs.
 */
export const listGoogleDocs = ai.defineFlow(
  {
    name: 'listGoogleDocsFlow',
    inputSchema: ListGoogleDocsInputSchema,
    outputSchema: z.array(GoogleDocSchema),
  },
  async (input) => {
    try {
      const auth = getAuthenticatedClient(input.accessToken);
      const drive = google.drive({ version: 'v3', auth });
      
      const response = await drive.files.list({
        pageSize: 50,
        fields: 'files(id, name)',
        q: "mimeType='application/vnd.google-apps.document'",
        orderBy: 'modifiedTime desc',
      });

      const files = response.data.files;
      if (!files) {
        return [];
      }
      return files.map((file) => ({
        id: file.id!,
        name: file.name!,
      }));
    } catch (error) {
      console.error('Error fetching Google Docs list:', error);
      throw new Error('Failed to fetch Google Docs. The access token might be expired or invalid.');
    }
  }
);


/**
 * Fetches the content of a specific Google Doc.
 * @param input The input containing the access token and document ID.
 * @returns A promise that resolves to the text content of the document.
 */
export const getGoogleDocContent = ai.defineFlow(
  {
    name: 'getGoogleDocContentFlow',
    inputSchema: GetGoogleDocContentInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const auth = getAuthenticatedClient(input.accessToken);
      const docs = google.docs({ version: 'v1', auth });

      const response = await docs.documents.get({
        documentId: input.documentId,
      });
      
      const docContent = response.data.body?.content;
      if (!docContent) {
        return '';
      }

      // Parse the document content to extract plain text.
      let text = '';
      for (const element of docContent) {
        if (element.paragraph) {
          for (const paragraphElement of element.paragraph.elements!) {
            if (paragraphElement.textRun && paragraphElement.textRun.content) {
              text += paragraphElement.textRun.content;
            }
          }
        }
      }
      return text;

    } catch (error) {
      console.error('Error fetching Google Doc content:', error);
      throw new Error('Failed to fetch Google Doc content.');
    }
  }
);
