"use client";

import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { adjustScrollSpeed } from "@/ai/flows/adjust-scroll-speed";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Play, Pause, Mic, MicOff, Settings, FileText } from "lucide-react";

const DEFAULT_TEXT = `Welcome to AutoScroll Teleprompter.

You can start by pasting your script here, or by importing a .txt file.

Press the play button to start scrolling.

Enable voice control to have the teleprompter automatically adjust its speed to your reading pace.

Use the settings on the left to adjust the font size, margins, and manual scroll speed.
`;

export default function Home() {
  const { toast } = useToast();
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [scrollSpeed, setScrollSpeed] = useState<number>(20);
  const [fontSize, setFontSize] = useState<number>(64);
  const [margin, setMargin] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceControlOn, setIsVoiceControlOn] = useState<boolean>(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);

  const displayRef = useRef<HTMLDivElement>(null);
  const scrollRequestRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileText = e.target?.result as string;
        setText(fileText);
        toast({
          title: "File imported",
          description: `${file.name} has been loaded into the teleprompter.`,
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select a .txt file.",
      });
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const blobToDataUri = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to data URI'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const handleAdjustSpeed = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsProcessingAudio(true);
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    audioChunksRef.current = [];
    
    try {
      const audioDataUri = await blobToDataUri(audioBlob);
      const result = await adjustScrollSpeed({ audioDataUri, currentScrollSpeed: scrollSpeed });
      const newSpeed = Math.max(0, result.adjustedScrollSpeed);
      setScrollSpeed(newSpeed);
      toast({
        title: "Speed Adjusted",
        description: `Voice analysis set scroll speed to ${newSpeed.toFixed(0)}.`,
      });
    } catch (error) {
      console.error("Error adjusting speed:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not adjust speed based on audio.",
      });
    } finally {
      setIsProcessingAudio(false);
    }
  }, [scrollSpeed, toast]);

  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.onstop = handleAdjustSpeed;
        mediaRecorderRef.current.start();

        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = setInterval(() => {
          mediaRecorderRef.current?.stop();
          mediaRecorderRef.current?.start();
        }, 5000);

      }).catch(err => {
        console.error("Error accessing microphone:", err);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice control.",
        });
        setIsVoiceControlOn(false);
      });
  }, [handleAdjustSpeed, toast]);

  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  const scroll = useCallback(() => {
    if (!displayRef.current || !isPlaying) return;

    const currentDisplay = displayRef.current;
    const pixelsPerSecond = scrollSpeed;
    const scrollAmount = pixelsPerSecond / 60.0; // Assuming 60fps from requestAnimationFrame

    currentDisplay.scrollTop += scrollAmount;

    if (currentDisplay.scrollTop + currentDisplay.clientHeight >= currentDisplay.scrollHeight) {
      setIsPlaying(false);
    }
  }, [isPlaying, scrollSpeed]);

  useEffect(() => {
    const animate = () => {
      scroll();
      scrollRequestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      scrollRequestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (scrollRequestRef.current) {
        cancelAnimationFrame(scrollRequestRef.current);
      }
    };
  }, [isPlaying, scroll]);

  useEffect(() => {
    if (isPlaying && isVoiceControlOn) {
      startRecording();
    } else {
      stopRecording();
    }
    return stopRecording;
  }, [isPlaying, isVoiceControlOn, startRecording, stopRecording]);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = 0;
    }
  }, [text]);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-screen-2xl mx-auto">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-primary"/>
                Script Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your script here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-64 text-base resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="text-primary"/>
                Controls & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-center gap-4">
                <Button onClick={triggerFileUpload} variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" /> Import .txt
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />

                <Button onClick={() => setIsPlaying(!isPlaying)} className="w-full">
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-control" className="flex items-center gap-2">
                    {isVoiceControlOn ? <Mic className="text-accent" /> : <MicOff />}
                    Voice Control
                  </Label>
                   <Switch
                    id="voice-control"
                    checked={isVoiceControlOn}
                    onCheckedChange={setIsVoiceControlOn}
                  />
                </div>
                 {isProcessingAudio && <p className="text-sm text-muted-foreground text-center">Adjusting speed...</p>}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="speed">Scroll Speed: {scrollSpeed.toFixed(0)}</Label>
                  <Slider
                    id="speed"
                    min={0}
                    max={100}
                    step={1}
                    value={[scrollSpeed]}
                    onValueChange={(value) => setScrollSpeed(value[0])}
                    disabled={isVoiceControlOn}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size: {fontSize}px</Label>
                  <Slider
                    id="font-size"
                    min={12}
                    max={120}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin">Margin: {margin}%</Label>
                  <Slider
                    id="margin"
                    min={0}
                    max={40}
                    step={1}
                    value={[margin]}
                    onValueChange={(value) => setMargin(value[0])}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-[85vh] flex flex-col">
            <CardContent className="p-0 flex-grow overflow-hidden">
              <div
                ref={displayRef}
                className="h-full overflow-y-scroll scroll-smooth p-4"
                style={{
                  paddingLeft: `${margin}%`,
                  paddingRight: `${margin}%`,
                }}
              >
                <div
                  className="text-foreground whitespace-pre-wrap break-words"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
