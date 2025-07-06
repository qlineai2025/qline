'use server';
/**
 * @fileOverview Flows for interacting with Google Drive, Google Docs, and Google Slides APIs.
 *
 * - listGoogleDocs - Fetches a list of Google Docs from the user's Drive.
 * - getGoogleDocContent - Fetches and parses the text content of a specific Google Doc.
 * - listGoogleSlides - Fetches a list of Google Slides from the user's Drive.
 * - getGoogleSlidesContent - Fetches image URLs and speaker notes for all slides in a presentation.
 * - GoogleDoc - The type for a single Google Doc file.
 * - ListGoogleDocsInput - The input type for the listGoogleDocs function.
 * - GetGoogleDocContentInput - The input type for the getGoogleDocContent function.
 * - GoogleSlide - The type for a single Google Slide file.
 * - ListGoogleSlidesInput - The input type for the listGoogleSlides function.
 * - GetGoogleSlidesContentInput - The input type for the getGoogleSlidesContent function.
 * - GoogleSlideContent - The type for a single slide's content (image URL and speaker notes).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import type {slides_v1} from 'googleapis';

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

// Schema for a single Google Slide file
const GoogleSlideSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type GoogleSlide = z.infer<typeof GoogleSlideSchema>;

// Input schema for listing Google Slides
const ListGoogleSlidesInputSchema = z.object({
  accessToken: z.string().describe('The OAuth2 access token for the user.'),
});
export type ListGoogleSlidesInput = z.infer<typeof ListGoogleSlidesInputSchema>;

// Schema for the content of a single Google Slide
const GoogleSlideContentSchema = z.object({
  imageUrl: z.string(),
  speakerNotes: z.string(),
});
export type GoogleSlideContent = z.infer<typeof GoogleSlideContentSchema>;


// Input schema for getting Google Slide content
const GetGoogleSlidesContentInputSchema = z.object({
  accessToken: z.string().describe('The OAuth2 access token for the user.'),
  presentationId: z.string().describe('The ID of the Google Slides presentation to fetch.'),
});
export type GetGoogleSlidesContentInput = z.infer<typeof GetGoogleSlidesContentInputSchema>;


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

/**
 * Fetches a list of Google Slides from the user's Google Drive.
 */
export const listGoogleSlides = ai.defineFlow(
  {
    name: 'listGoogleSlidesFlow',
    inputSchema: ListGoogleSlidesInputSchema,
    outputSchema: z.array(GoogleSlideSchema),
  },
  async (input) => {
    try {
      const auth = getAuthenticatedClient(input.accessToken);
      const drive = google.drive({ version: 'v3', auth });
      
      const response = await drive.files.list({
        pageSize: 50,
        fields: 'files(id, name)',
        q: "mimeType='application/vnd.google-apps.presentation'",
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
      console.error('Error fetching Google Slides list:', error);
      throw new Error('Failed to fetch Google Slides. The access token might be expired or invalid.');
    }
  }
);


/**
 * Extracts the text from a TextElement array.
 * @param textElements An array of TextElement objects.
 * @returns The concatenated string content.
 */
const extractText = (textElements: slides_v1.Schema$TextElement[] | undefined): string => {
  if (!textElements) return '';
  return textElements
    .map(textElement => textElement.textRun?.content || '')
    .join('');
};

/**
 * Fetches the image URLs and speaker notes of all slides in a presentation.
 */
export const getGoogleSlidesContent = ai.defineFlow(
  {
    name: 'getGoogleSlidesContentFlow',
    inputSchema: GetGoogleSlidesContentInputSchema,
    outputSchema: z.array(GoogleSlideContentSchema),
  },
  async (input) => {
    try {
      const auth = getAuthenticatedClient(input.accessToken);
      const slidesApi = google.slides({ version: 'v1', auth });

      const presentation = await slidesApi.presentations.get({
        presentationId: input.presentationId,
        fields: 'slides(objectId,slideProperties.notesPage),notesMasters',
      });
      
      const slides = presentation.data.slides;
      if (!slides?.length) {
        return [];
      }

      const slidesContent = await Promise.all(
        slides.map(async (slide) => {
          const pageId = slide.objectId!;
          let speakerNotes = '';
          
          // Get Thumbnail
          const thumbnail = await slidesApi.presentations.pages.getThumbnail({
            presentationId: input.presentationId,
            pageObjectId: pageId,
            'thumbnailProperties.thumbnailSize': 'LARGE'
          });
          const imageUrl = thumbnail.data.contentUrl!;

          // Get Speaker Notes
          const notesPageId = slide.slideProperties?.notesPage?.objectId;
          if (notesPageId) {
            const notesPage = await slidesApi.presentations.pages.get({
              presentationId: input.presentationId,
              pageObjectId: notesPageId
            });
            const notesBody = notesPage.data.pageElements?.find(el => el.shape?.placeholder?.type === 'BODY');
            speakerNotes = extractText(notesBody?.shape?.text?.textElements);
          }
          
          return { imageUrl, speakerNotes };
        })
      );
      
      return slidesContent.filter(content => !!content.imageUrl);
    } catch (error) {
      console.error('Error fetching Google Slides content:', error);
      throw new Error('Failed to fetch Google Slides content.');
    }
  }
);
