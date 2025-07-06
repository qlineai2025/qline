'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  listGoogleSlides,
  getGoogleSlidesContent,
  type GoogleSlide,
  type GoogleSlideContent,
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
import { Presentation, Loader2 } from 'lucide-react';

interface GoogleSlidePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (slideContents: GoogleSlideContent[]) => void;
}

export function GoogleSlidePicker({
  open,
  onOpenChange,
  onImport,
}: GoogleSlidePickerProps) {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [presentations, setPresentations] = useState<GoogleSlide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  useEffect(() => {
    if (open && accessToken) {
      const fetchSlides = async () => {
        setIsLoading(true);
        try {
          const slides = await listGoogleSlides({ accessToken });
          setPresentations(slides);
        } catch (error) {
          console.error(error);
          toast({
            variant: 'destructive',
            title: 'Error Fetching Presentations',
            description: 'Could not load your Google Slides. Please try signing out and in again.',
          });
          onOpenChange(false);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSlides();
    }
  }, [open, accessToken, toast, onOpenChange]);

  const handleSlideSelect = async (presId: string) => {
    if (!accessToken) return;
    setIsImporting(presId);
    try {
      const slideContents = await getGoogleSlidesContent({
        accessToken,
        presentationId: presId,
      });
      onImport(slideContents);
      toast({
        title: 'Import Successful',
        description: 'Your presentation has been loaded.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Import Error',
        description: 'Could not import the selected presentation.',
      });
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import from Google Slides</DialogTitle>
        </DialogHeader>
        <div className="h-[400px]">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : presentations.length > 0 ? (
                presentations.map((pres) => (
                  <div
                    key={pres.id}
                    className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Presentation className="h-5 w-5 text-orange-500" />
                      <span className="font-medium truncate">{pres.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSlideSelect(pres.id)}
                      disabled={!!isImporting}
                    >
                      {isImporting === pres.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Import
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground pt-8">
                  No Google Slides presentations found.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
