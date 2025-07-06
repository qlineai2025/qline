
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { adjustScrollSpeed } from "@/ai/flows/adjust-scroll-speed";
import { cn } from "@/lib/utils";

import { useAuth } from "@/components/auth-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Mic,
  Maximize,
  Minimize,
  Contrast,
  ArrowLeftRight,
  ArrowUpDown,
  LogOut,
  Gauge,
  Text as TextIcon,
  StretchHorizontal,
  StretchVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";


const DEFAULT_TEXT = `Welcome to AutoScroll Teleprompter.

You can start by pasting your script here.

Press the play button to start scrolling. The app will automatically enter full-screen mode.

Enable voice control (on by default) to have the teleprompter automatically adjust its speed to your reading pace.

Use the settings on the left to adjust the font size, margins, and manual scroll speed.
`;

export default function Home() {
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [scrollSpeed, setScrollSpeed] = useState<number>(30);
  const [fontSize, setFontSize] = useState<number>(40);
  const [horizontalMargin, setHorizontalMargin] = useState<number>(20);
  const [verticalMargin, setVerticalMargin] = useState<number>(18);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceControlOn, setIsVoiceControlOn] = useState<boolean>(true);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isFlippedHorizontally, setIsFlippedHorizontally] = useState<boolean>(false);
  const [isFlippedVertically, setIsFlippedVertically] = useState<boolean>(false);

  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const [speedInput, setSpeedInput] = useState(String(scrollSpeed));

  const [isFontSizePopoverOpen, setIsFontSizePopoverOpen] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));

  const [isHorizontalMarginPopoverOpen, setIsHorizontalMarginPopoverOpen] = useState(false);
  const [horizontalMarginInput, setHorizontalMarginInput] = useState(String(horizontalMargin));
  
  const [isVerticalMarginPopoverOpen, setIsVerticalMarginPopoverOpen] = useState(false);
  const [verticalMarginInput, setVerticalMarginInput] = useState(String(verticalMargin));


  const displayRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const scrollSpeedRef = useRef(scrollSpeed);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);
  useEffect(() => { setSpeedInput(String(scrollSpeed)) }, [scrollSpeed]);
  useEffect(() => { setFontSizeInput(String(fontSize)) }, [fontSize]);
  useEffect(() => { setHorizontalMarginInput(String(horizontalMargin)) }, [horizontalMargin]);
  useEffect(() => { setVerticalMarginInput(String(verticalMargin)) }, [verticalMargin]);

  const handleSave = (setter: React.Dispatch<React.SetStateAction<number>>, value: string, min: number, max: number, popoverSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      setter(numValue);
    }
    popoverSetter(false);
  };

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
      const result = await adjustScrollSpeed({ audioDataUri, currentScrollSpeed: scrollSpeedRef.current });
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
  }, [toast]);

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

  useEffect(() => {
    let lastTime: number | null = null;
    
    const animationLoop = (currentTime: number) => {
      if (!displayRef.current) return;
      if (lastTime === null) {
        lastTime = currentTime;
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      const currentDisplay = displayRef.current;
      if (currentDisplay.scrollHeight > currentDisplay.clientHeight) {
        const pixelsPerSecond = scrollSpeedRef.current;
        const scrollAmount = (pixelsPerSecond * deltaTime) / 1000;
        currentDisplay.scrollTop += scrollAmount;
      }

      if (currentDisplay.scrollTop + currentDisplay.clientHeight >= currentDisplay.scrollHeight - 1) {
        setIsPlaying(false);
      } else {
        animationFrameRef.current = requestAnimationFrame(animationLoop);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

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
      if (event.key === 'Escape') {
        if(isMaximized) setIsMaximized(false);
        if(isSpeedPopoverOpen) setIsSpeedPopoverOpen(false);
        if(isFontSizePopoverOpen) setIsFontSizePopoverOpen(false);
        if(isHorizontalMarginPopoverOpen) setIsHorizontalMarginPopoverOpen(false);
        if(isVerticalMarginPopoverOpen) setIsVerticalMarginPopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMaximized, isSpeedPopoverOpen, isFontSizePopoverOpen, isHorizontalMarginPopoverOpen, isVerticalMarginPopoverOpen]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      setIsMaximized(true);
      if (displayRef.current) {
        if (displayRef.current.scrollTop + displayRef.current.clientHeight >= displayRef.current.scrollHeight -1) {
          displayRef.current.scrollTop = 0;
        }
      }
    }
    setIsPlaying(!isPlaying);
  };
  
  const popoverContentClass = "w-[150px] p-2";

  return (
    <main className="flex h-screen flex-col bg-background">
      <div className="grid flex-1 grid-cols-[auto_1fr] gap-4 p-4 min-h-0">
        <div className="h-full overflow-y-auto pr-2">
            <Card className="w-[140px]">
              <CardContent className="flex flex-col items-center gap-4 p-2">
                 <TooltipProvider>
                    <div className="flex flex-col items-center justify-center gap-2 w-full">
                      {loading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : user ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full">
                               <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="currentColor"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.56 2.03-3.86 0-7-3.14-7-7s3.14-7 7-7c2.29 0 3.63.86 4.5 1.75l2.4-2.4C18.49 3.46 15.9 2 12.48 2c-5.45 0-9.94 4.45-9.94 9.9s4.49 9.9 9.94 9.9c3.31 0 5.21-1.1 6.84-2.73 1.69-1.69 2.23-4.03 2.23-6.14s-.04-1.2-.1-1.73h-9.04z"/></svg>
                              Import
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
                          Sign in
                        </Button>
                      )}
                      
                      <Button onClick={handlePlayPause} className="w-full">
                        {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isPlaying ? "Pause" : "Play"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-around pt-2 border-t w-full">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setIsVoiceControlOn(!isVoiceControlOn)}>
                                    <Mic className={cn(isVoiceControlOn && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Voice Control</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setIsHighContrast(!isHighContrast)}>
                                    <Contrast className={cn(isHighContrast && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>High Contrast</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setIsFlippedHorizontally(!isFlippedHorizontally)}>
                                    <ArrowLeftRight className={cn(isFlippedHorizontally && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Flip Horizontal</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setIsFlippedVertically(!isFlippedVertically)}>
                                    <ArrowUpDown className={cn(isFlippedVertically && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Flip Vertical</p></TooltipContent>
                        </Tooltip>
                    </div>
                     {isProcessingAudio && <p className="text-sm text-muted-foreground text-center">Adjusting speed...</p>}

                    <div className="flex items-start justify-between pt-2 border-t w-full">
                        <div className="flex flex-col items-center gap-3">
                          <Popover open={isSpeedPopoverOpen} onOpenChange={setIsSpeedPopoverOpen}>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0"><Gauge className="h-4 w-4"/></Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Scroll Speed: {scrollSpeed.toFixed(0)}</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setScrollSpeed, speedInput, 30, 100, setIsSpeedPopoverOpen)}>
                                    <Input
                                      id="speed-input"
                                      type="number"
                                      value={speedInput}
                                      onChange={(e) => setSpeedInput(e.target.value)}
                                      min={30}
                                      max={100}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setScrollSpeed, speedInput, 30, 100, setIsSpeedPopoverOpen)
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="speed"
                            orientation="vertical"
                            min={30}
                            max={100}
                            step={1}
                            value={[scrollSpeed]}
                            onValueChange={(value) => setScrollSpeed(value[0])}
                            disabled={isVoiceControlOn}
                            className="h-24"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-3">
                           <Popover open={isFontSizePopoverOpen} onOpenChange={setIsFontSizePopoverOpen}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0"><TextIcon className="h-4 w-4"/></Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Font Size: {fontSize}px</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setFontSize, fontSizeInput, 12, 120, setIsFontSizePopoverOpen)}>
                                    <Input
                                      id="font-size-input"
                                      type="number"
                                      value={fontSizeInput}
                                      onChange={(e) => setFontSizeInput(e.target.value)}
                                      min={12}
                                      max={120}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setFontSize, fontSizeInput, 12, 120, setIsFontSizePopoverOpen);
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="font-size"
                            orientation="vertical"
                            min={12}
                            max={120}
                            step={1}
                            value={[fontSize]}
                            onValueChange={(value) => setFontSize(value[0])}
                            className="h-24"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-3">
                          <Popover open={isHorizontalMarginPopoverOpen} onOpenChange={setIsHorizontalMarginPopoverOpen}>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0"><StretchHorizontal className="h-4 w-4"/></Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Horizontal Margin: {horizontalMargin}%</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setHorizontalMargin, horizontalMarginInput, 0, 40, setIsHorizontalMarginPopoverOpen)}>
                                    <Input
                                      id="h-margin-input"
                                      type="number"
                                      value={horizontalMarginInput}
                                      onChange={(e) => setHorizontalMarginInput(e.target.value)}
                                      min={0}
                                      max={40}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setHorizontalMargin, horizontalMarginInput, 0, 40, setIsHorizontalMarginPopoverOpen);
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="horizontal-margin"
                            orientation="vertical"
                            min={0}
                            max={40}
                            step={1}
                            value={[horizontalMargin]}
                            onValueChange={(value) => setHorizontalMargin(value[0])}
                            className="h-24"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-3">
                          <Popover open={isVerticalMarginPopoverOpen} onOpenChange={setIsVerticalMarginPopoverOpen}>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0"><StretchVertical className="h-4 w-4"/></Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Vertical Margin: {verticalMargin}%</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setVerticalMargin, verticalMarginInput, 0, 40, setIsVerticalMarginPopoverOpen)}>
                                    <Input
                                      id="v-margin-input"
                                      type="number"
                                      value={verticalMarginInput}
                                      onChange={(e) => setVerticalMarginInput(e.target.value)}
                                      min={0}
                                      max={40}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setVerticalMargin, verticalMarginInput, 0, 40, setIsVerticalMarginPopoverOpen);
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="vertical-margin"
                            orientation="vertical"
                            min={0}
                            max={40}
                            step={1}
                            value={[verticalMargin]}
                            onValueChange={(value) => setVerticalMargin(value[0])}
                            className="h-24"
                          />
                        </div>
                    </div>

                    {user && (
                      <>
                        <Separator/>
                        <div className="flex items-center justify-between w-full">
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
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleSignOut}>
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Sign Out</p></TooltipContent>
                            </Tooltip>
                        </div>
                      </>
                    )}
                 </TooltipProvider>
              </CardContent>
            </Card>
          </div>

        <div
          className={cn(
            "flex flex-col min-h-0",
            isMaximized ? "absolute inset-0 p-0 z-20" : ""
          )}
        >
          <div className="flex-1 min-h-0 relative">
            <Card
              className={cn(
                "h-full flex flex-col",
                isMaximized ? "rounded-none border-none" : "rounded-lg"
              )}
            >
              <CardContent className="p-0 flex-grow overflow-hidden rounded-lg">
                <div
                  ref={displayRef}
                  className={cn(
                    "h-full overflow-y-auto",
                    isHighContrast && "bg-black",
                    isFlippedHorizontally && "scale-x-[-1]",
                    isFlippedVertically && "scale-y-[-1]"
                  )}
                  style={{
                    paddingLeft: `${horizontalMargin}%`,
                    paddingRight: `${horizontalMargin}%`,
                  }}
                >
                  <div
                    className="w-full min-h-full flex justify-center items-center m-auto"
                     style={{
                      paddingTop: `${verticalMargin}%`,
                      paddingBottom: `${verticalMargin}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words m-auto",
                        isHighContrast ? "text-white" : "text-foreground"
                      )}
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.5,
                      }}
                    >
                      {text}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
             <Button
                onClick={() => setIsMaximized(!isMaximized)}
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute bottom-4 right-4 z-10",
                  isHighContrast && "bg-black text-white hover:bg-black/80 hover:text-white"
                )}
              >
               {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
             </Button>
          </div>
        </div>
      </div>
      <div className={cn("px-4 pb-4 w-full", isMaximized ? "hidden" : "block")}>
        <Textarea
          placeholder="Paste your script here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-32 text-base resize-none w-full"
        />
      </div>
    </main>
  );
}
