
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { adjustScrollSpeed } from "@/ai/flows/adjust-scroll-speed";
import { cn } from "@/lib/utils";

import { useAuth } from "@/components/auth-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Mic,
  MicOff,
  Settings,
  Maximize,
  Minimize,
  Contrast,
  ArrowLeftRight,
  ArrowUpDown,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";


const DEFAULT_TEXT = `Welcome to AutoScroll Teleprompter.

You can start by pasting your script here, or by importing a .txt file.

Press the play button to start scrolling.

Enable voice control to have the teleprompter automatically adjust its speed to your reading pace.

Use the settings on the left to adjust the font size, margins, and manual scroll speed.
`;

export default function Home() {
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [scrollSpeed, setScrollSpeed] = useState<number>(20);
  const [fontSize, setFontSize] = useState<number>(64);
  const [horizontalMargin, setHorizontalMargin] = useState<number>(10);
  const [verticalMargin, setVerticalMargin] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceControlOn, setIsVoiceControlOn] = useState<boolean>(true);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isFlippedHorizontally, setIsFlippedHorizontally] = useState<boolean>(false);
  const [isFlippedVertically, setIsFlippedVertically] = useState<boolean>(false);


  const displayRef = useRef<HTMLDivElement>(null);
  const scrollRequestRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSignIn = async () => {
    if (!auth || !googleProvider) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase is not configured. Please add your API keys to the .env file.",
      });
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Signed In",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      console.error("Error signing in:", error);
      toast({
        variant: "destructive",
        title: "Sign In Error",
        description: "Could not sign in with Google. Please try again.",
      });
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have successfully signed out.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
       toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "Could not sign out. Please try again.",
      });
    }
  };

  const handleGoogleImport = () => {
    toast({
      title: "Coming Soon!",
      description: "Import from Google is not yet implemented.",
    });
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
    } catch (error)
    {
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMaximized && event.key === 'Escape') {
        setIsMaximized(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMaximized]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      setIsMaximized(true);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <main
      className={cn(
        "min-h-screen bg-background transition-all duration-300",
        isMaximized ? "p-0" : "p-4 sm:p-6 md:p-8"
      )}
    >
      <div
        className={cn(
          "grid gap-8 max-w-screen-2xl mx-auto",
          isMaximized ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
        )}
      >
        <div className={cn("lg:col-span-1", isMaximized ? "hidden" : "block")}>
          <div className="h-[85vh] overflow-y-auto pr-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="text-primary"/>
                  Controls & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex items-center justify-center gap-4">
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                           <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="currentColor"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.56 2.03-3.86 0-7-3.14-7-7s3.14-7 7-7c2.29 0 3.63.86 4.5 1.75l2.4-2.4C18.49 3.46 15.9 2 12.48 2c-5.45 0-9.94 4.45-9.94 9.9s4.49 9.9 9.94 9.9c3.31 0 5.21-1.1 6.84-2.73 1.69-1.69 2.23-4.03 2.23-6.14s-.04-1.2-.1-1.73h-9.04z"/></svg>
                          Import from Google
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleGoogleImport}>Google Docs</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleGoogleImport}>Google Slides</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleGoogleImport}>Google Sheets</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button onClick={handleSignIn} variant="outline" className="w-full">
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="currentColor"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.56 2.03-3.86 0-7-3.14-7-7s3.14-7 7-7c2.29 0 3.63.86 4.5 1.75l2.4-2.4C18.49 3.46 15.9 2 12.48 2c-5.45 0-9.94 4.45-9.94 9.9s4.49 9.9 9.94 9.9c3.31 0 5.21-1.1 6.84-2.73 1.69-1.69 2.23-4.03 2.23-6.14s-.04-1.2-.1-1.73h-9.04z"/></svg>
                      Sign in to Import
                    </Button>
                  )}
                  
                  <Button onClick={handlePlayPause} className="w-full">
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

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-contrast" className="flex items-center gap-2">
                      <Contrast className="h-4 w-4" />
                      High Contrast
                    </Label>
                     <Switch
                      id="high-contrast"
                      checked={isHighContrast}
                      onCheckedChange={setIsHighContrast}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="flip-horizontal" className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Flip Horizontal
                    </Label>
                     <Switch
                      id="flip-horizontal"
                      checked={isFlippedHorizontally}
                      onCheckedChange={setIsFlippedHorizontally}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="flip-vertical" className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Flip Vertical
                    </Label>
                     <Switch
                      id="flip-vertical"
                      checked={isFlippedVertically}
                      onCheckedChange={setIsFlippedVertically}
                    />
                  </div>
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
                    <Label htmlFor="horizontal-margin">Horizontal Margin: {horizontalMargin}%</Label>
                    <Slider
                      id="horizontal-margin"
                      min={0}
                      max={40}
                      step={1}
                      value={[horizontalMargin]}
                      onValueChange={(value) => setHorizontalMargin(value[0])}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vertical-margin">Vertical Margin: {verticalMargin}%</Label>
                    <Slider
                      id="vertical-margin"
                      min={0}
                      max={40}
                      step={1}
                      value={[verticalMargin]}
                      onValueChange={(value) => setVerticalMargin(value[0])}
                    />
                  </div>
                </div>

                {user && (
                  <>
                    <Separator/>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''}/>
                                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                                <p className="font-medium text-sm">{user.displayName}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleSignOut}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          className={cn(
            "lg:col-span-2 flex flex-col gap-8",
            isMaximized ? "col-span-1 lg:col-span-3 h-screen" : "h-[85vh]"
          )}
        >
          <div className="flex-1 min-h-0 relative">
            <Card
              className={cn(
                "h-full flex flex-col",
                isMaximized && "rounded-none border-none"
              )}
            >
              <CardContent className="p-0 flex-grow overflow-hidden">
                <div
                  ref={displayRef}
                  className={cn(
                    "h-full overflow-y-auto scroll-smooth flex justify-center items-center",
                    isHighContrast && "bg-black",
                    isFlippedHorizontally && "scale-x-[-1]",
                    isFlippedVertically && "scale-y-[-1]"
                  )}
                  style={{
                    paddingTop: `${verticalMargin}%`,
                    paddingBottom: `${verticalMargin}%`,
                  }}
                >
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words",
                      isHighContrast ? "text-white" : "text-foreground"
                    )}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.5,
                      width: `${100 - horizontalMargin * 2}%`,
                    }}
                  >
                    {text}
                  </div>
                </div>
              </CardContent>
            </Card>
             <Button onClick={() => setIsMaximized(!isMaximized)} variant="outline" size="icon" className="absolute bottom-4 right-4 z-10">
               {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
             </Button>
          </div>
          <div className={cn(isMaximized ? "hidden" : "block")}>
            <Textarea
              placeholder="Paste your script here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-64 text-base resize-none"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
