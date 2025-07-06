'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  listGoogleDocs,
  getGoogleDocContent,
  type GoogleDoc,
} from '@/ai/flows/google-drive-flows';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2 } from 'lucide-react';

interface GoogleDocPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string) => void;
}

export function GoogleDocPicker({
  open,
  onOpenChange,
  onImport,
}: GoogleDocPickerProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<GoogleDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  useEffect(() => {
    if (open && accessToken) {
      const fetchDocs = async () => {
        setIsLoading(true);
        try {
          const docs = await listGoogleDocs({ accessToken });
          setDocuments(docs);
        } catch (error) {
          console.error(error);
          toast({
            variant: 'destructive',
            title: 'Error Fetching Documents',
            description: 'Could not load your Google Docs. Please try signing out and in again.',
          });
          onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDocs();
    }
  }, [open, accessToken, toast, onOpenChange]);

  const handleDocSelect = async (docId: string) => {
    if (!accessToken) return;
    setIsImporting(docId);
    try {
      const content = await getGoogleDocContent({
        accessToken,
        documentId: docId,
      });
      onImport(content);
      toast({
        title: 'Import Successful',
        description: 'Your document has been loaded into the editor.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: 'Could not import the selected document.',
      });
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import from Google Docs</DialogTitle>
        </DialogHeader>
        <div className="h-[400px]">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="font-medium truncate">{doc.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDocSelect(doc.id)}
                      disabled={!!isImporting}
                    >
                      {isImporting === doc.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Import
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground pt-8">
                  No Google Docs found.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
