
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { trackSpeechPosition } from "@/ai/flows/track-speech-position";
import { assistWithScript, ScriptAssistantCommand } from "@/ai/flows/script-assistant-flow.ts";
import { cn } from "@/lib/utils";

import { useAuth } from "@/components/auth-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";

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
  ScreenShare,
  RotateCcw,
  Save,
  Check,
  Search,
  Trash2,
  Loader2,
  SpellCheck,
  PenSquare,
  WrapText,
  ChevronsUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleDocPicker } from "@/components/google-doc-picker";


const DEFAULT_TEXT = `Welcome to AutoScroll Teleprompter.

You can start by pasting your script here.

Right-click on selected text to get AI assistance.

Press the play button to start scrolling. The app will automatically enter full-screen mode.

Enable voice control (on by default) to have the teleprompter automatically adjust its speed to your reading pace.

Use the settings on the left to adjust the font size, margins, and manual scroll speed.
`;

const DEFAULT_SETTINGS = {
  scrollSpeed: 30,
  fontSize: 40,
  horizontalMargin: 20,
  verticalMargin: 18,
};

interface SavedSetting {
  id: string;
  name: string;
  scrollSpeed: number;
  fontSize: number;
  horizontalMargin: number;
  verticalMargin: number;
}


export default function Home() {
  const { toast } = useToast();
  const { user, loading, setAccessToken } = useAuth();

  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [scrollSpeed, setScrollSpeed] = useState<number>(DEFAULT_SETTINGS.scrollSpeed);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_SETTINGS.fontSize);
  const [horizontalMargin, setHorizontalMargin] = useState<number>(DEFAULT_SETTINGS.horizontalMargin);
  const [verticalMargin, setVerticalMargin] = useState<number>(DEFAULT_SETTINGS.verticalMargin);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceControlOn, setIsVoiceControlOn] = useState<boolean>(true);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isFlippedHorizontally, setIsFlippedHorizontally] = useState<boolean>(false);
  const [isFlippedVertically, setIsFlippedVertically] = useState<boolean>(false);
  const [isPresenterModeActive, setIsPresenterModeActive] = useState(false);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);


  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const [speedInput, setSpeedInput] = useState(String(scrollSpeed));

  const [isFontSizePopoverOpen, setIsFontSizePopoverOpen] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));

  const [isHorizontalMarginPopoverOpen, setIsHorizontalMarginPopoverOpen] = useState(false);
  const [horizontalMarginInput, setHorizontalMarginInput] = useState(String(horizontalMargin));
  
  const [isVerticalMarginPopoverOpen, setIsVerticalMarginPopoverOpen] = useState(false);
  const [verticalMarginInput, setVerticalMarginInput] = useState(String(verticalMargin));

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  const [savedSettings, setSavedSettings] = useState<SavedSetting[]>([]);
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [newSettingName, setNewSettingName] = useState('');
  const [isLoadPopoverOpen, setIsLoadPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedSettingName, setLoadedSettingName] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectionStart: number; selectionEnd: number; } | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(scrollSpeed);
  
  const prompterWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);

  useEffect(() => { setSpeedInput(String(scrollSpeed)) }, [scrollSpeed]);
  useEffect(() => { setFontSizeInput(String(fontSize)) }, [fontSize]);
  useEffect(() => { setHorizontalMarginInput(String(horizontalMargin)) }, [horizontalMargin]);
  useEffect(() => { setVerticalMarginInput(String(verticalMargin)) }, [verticalMargin]);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("teleprompter_presets");
      if (storedSettings) {
        setSavedSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Could not load presets from localStorage", e);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("teleprompter_presets", JSON.stringify(savedSettings));
    } catch (e) {
      console.error("Could not save presets to localStorage", e);
    }
  }, [savedSettings]);
  
  // Autofocus search input when load popover opens
  useEffect(() => {
    if (isLoadPopoverOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isLoadPopoverOpen]);

  // Initialize broadcast channel for presenter mode
  useEffect(() => {
    channelRef.current = new BroadcastChannel("teleprompter_channel");
    
    const handleUnload = () => {
      prompterWindowRef.current?.close();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      channelRef.current?.close();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);
  
  // Check if presenter window is closed
  useEffect(() => {
    if (!isPresenterModeActive) return;

    const intervalId = setInterval(() => {
        if (prompterWindowRef.current?.closed) {
            setIsPresenterModeActive(false);
            clearInterval(intervalId);
        }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPresenterModeActive]);

  // Sync settings with localStorage and presenter window
  useEffect(() => {
    const settings = {
      text,
      fontSize,
      horizontalMargin,
      verticalMargin,
      isHighContrast,
      isFlippedHorizontally,
      isFlippedVertically,
      scrollSpeed,
    };
    try {
        localStorage.setItem("teleprompter_settings", JSON.stringify(settings));
        channelRef.current?.postMessage({ type: "settings_update", payload: settings });
    } catch (e) {
        console.error("Could not write to localStorage", e);
    }
  }, [text, fontSize, horizontalMargin, verticalMargin, isHighContrast, isFlippedHorizontally, isFlippedVertically, scrollSpeed]);


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
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setAccessToken(token);
      }
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
      setAccessToken(null);
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

  const handleImport = (content: string) => {
    setText(content);
    setIsPickerOpen(false);
  };
  
  const handleGoogleImport = (type: 'Docs' | 'Slides' | 'Sheets') => {
    if (type === 'Docs') {
      setIsPickerOpen(true);
    } else {
      toast({
        title: "Coming Soon!",
        description: `Import from Google ${type} is not yet implemented.`,
      });
    }
  };

  const handlePresent = () => {
    if (prompterWindowRef.current && !prompterWindowRef.current.closed) {
      prompterWindowRef.current.focus();
    } else {
      prompterWindowRef.current = window.open("/presenter", "_blank");
      if (prompterWindowRef.current) {
        setIsPresenterModeActive(true);
      } else {
        toast({
            variant: "destructive",
            title: "Popup Blocked",
            description: "Please allow popups for this site to use Assist Mode.",
        });
      }
    }
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

  const updatePositionFromSpeech = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsProcessingAudio(true);
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    audioChunksRef.current = [];
    
    try {
      const audioDataUri = await blobToDataUri(audioBlob);
      const { lastSpokenWordIndex, adjustedScrollSpeed } = await trackSpeechPosition({
        audioDataUri,
        scriptText: text,
        currentScrollSpeed: scrollSpeedRef.current,
      });
      
      if (adjustedScrollSpeed) {
        setScrollSpeed(adjustedScrollSpeed);
      }
      
      const targetWord = document.getElementById(`word-${lastSpokenWordIndex}`);
      if (targetWord) {
        targetWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
        channelRef.current?.postMessage({ type: 'scroll_to_word', payload: { wordIndex: lastSpokenWordIndex } });
      }

    } catch (error: any) {
      console.error("Error tracking speech position:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: error.message || "Could not track speech position.",
      });
    } finally {
      setIsProcessingAudio(false);
    }
  }, [text, toast]);

  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.onstop = updatePositionFromSpeech;
        mediaRecorderRef.current.start();

        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          if (mediaRecorderRef.current?.state === "inactive") {
            mediaRecorderRef.current.start();
          }
        }, 2000);

      }).catch(err => {
        console.error("Error accessing microphone:", err);
        toast({
          variant: "destructive",
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice control.",
        });
        setIsVoiceControlOn(false);
      });
  }, [updatePositionFromSpeech, toast]);

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

  const scrollAnimation = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (displayRef.current) {
      const currentDisplay = displayRef.current;
      if (currentDisplay.scrollHeight > currentDisplay.clientHeight) {
        const scrollAmount = (scrollSpeedRef.current / 60) * (deltaTime / (1000/60));
        currentDisplay.scrollTop += scrollAmount;
      }
      
      if (currentDisplay.scrollTop + currentDisplay.clientHeight >= currentDisplay.scrollHeight - 1) {
          setIsPlaying(false);
      } else {
          animationFrameRef.current = requestAnimationFrame(scrollAnimation);
      }
    }
  }, []);

  const startScroll = useCallback(() => {
    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(scrollAnimation);
  }, [scrollAnimation]);

  const stopScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startScroll();
    } else {
      stopScroll();
    }
    return stopScroll;
  }, [isPlaying, startScroll, stopScroll]);


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
        if (contextMenu) setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMaximized, isSpeedPopoverOpen, isFontSizePopoverOpen, isHorizontalMarginPopoverOpen, isVerticalMarginPopoverOpen, contextMenu]);

  const handlePlayPause = () => {
    const newIsPlaying = !isPlaying;
    if (newIsPlaying) {
      setIsMaximized(true);
      if (displayRef.current) {
        if (displayRef.current.scrollTop + displayRef.current.clientHeight >= displayRef.current.scrollHeight - 1) {
          displayRef.current.scrollTop = 0;
          channelRef.current?.postMessage({ type: "reset" });
        }
      }
    }
    setIsPlaying(newIsPlaying);
    channelRef.current?.postMessage({ type: newIsPlaying ? "play" : "pause" });
  };
  
  const popoverContentClass = "w-[150px] p-2";
  
  const processedText = useCallback(() => {
    const words = text.split(/(\s+)/);
    let wordCount = 0;
    return words.map((word, index) => {
      if (word.trim().length > 0) {
        const wordIndex = wordCount;
        wordCount++;
        return (
          <span key={index} id={`word-${wordIndex}`}>
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  }, [text]);

  const handleResetSettings = () => {
    setScrollSpeed(DEFAULT_SETTINGS.scrollSpeed);
    setFontSize(DEFAULT_SETTINGS.fontSize);
    setHorizontalMargin(DEFAULT_SETTINGS.horizontalMargin);
    setVerticalMargin(DEFAULT_SETTINGS.verticalMargin);
    setLoadedSettingName(null);
    toast({ title: "Settings Reset", description: "All settings have been reset to their default values." });
  };

  const handleSaveCurrentSettings = () => {
    if (!newSettingName.trim()) {
      toast({ variant: "destructive", title: "Save Error", description: "Please enter a name for your settings." });
      return;
    }
    const newSetting: SavedSetting = {
      id: Date.now().toString(),
      name: newSettingName,
      scrollSpeed,
      fontSize,
      horizontalMargin,
      verticalMargin,
    };
    setSavedSettings(prev => [...prev, newSetting]);
    setIsSavePopoverOpen(false);
    setNewSettingName('');
    toast({ title: "Settings Saved", description: `"${newSetting.name}" has been saved.` });
  };

  const handleLoadSettings = (setting: SavedSetting) => {
    setScrollSpeed(setting.scrollSpeed);
    setFontSize(setting.fontSize);
    setHorizontalMargin(setting.horizontalMargin);
    setVerticalMargin(setting.verticalMargin);
    setLoadedSettingName(setting.name);
    setIsLoadPopoverOpen(false);
    toast({ title: "Settings Loaded", description: `Applied settings from "${setting.name}".` });
  };
  
  const handleDeleteSetting = (id: string) => {
    setSavedSettings(prev => prev.filter(s => s.id !== id));
    toast({ title: "Setting Deleted", description: "The preset has been removed." });
  };
  
  const handleAiAssist = async (command: ScriptAssistantCommand) => {
    if (!contextMenu) return;

    const { selectionStart, selectionEnd } = contextMenu;
    const selectedText = text.substring(selectionStart, selectionEnd);

    if (!selectedText) {
        toast({
            variant: "destructive",
            title: "Empty Selection",
            description: "Please select some text to modify.",
        });
        return;
    }
    
    setContextMenu(null);
    setIsAiEditing(true);

    try {
        const modifiedSelection = await assistWithScript({ scriptText: text, command, selectedText });
        const newText = text.substring(0, selectionStart) + modifiedSelection + text.substring(selectionEnd);
        setText(newText);
        toast({
            title: "Script Updated",
            description: `Your selection has been updated by AI.`,
        });
    } catch (error: any) {
        console.error("AI script assistance error:", error);
        toast({
            variant: "destructive",
            title: "AI Error",
            description: error.message || "Could not modify the script.",
        });
    } finally {
        setIsAiEditing(false);
    }
  };

  const filteredSettings = savedSettings.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (selectionStart !== selectionEnd) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        selectionStart,
        selectionEnd,
      });
    }
  };

  // Effect to clear loadedSettingName if settings are changed from a loaded preset
  useEffect(() => {
    if (!loadedSettingName) return;

    const currentSettingsMatch = savedSettings.find(s => 
      s.name === loadedSettingName &&
      s.scrollSpeed === scrollSpeed &&
      s.fontSize === fontSize &&
      s.horizontalMargin === horizontalMargin &&
      s.verticalMargin === verticalMargin
    );

    if (!currentSettingsMatch) {
      setLoadedSettingName(null);
    }
  }, [scrollSpeed, fontSize, horizontalMargin, verticalMargin, loadedSettingName, savedSettings]);

  return (
    <main className="flex h-screen flex-col bg-background" onClickCapture={() => { if (contextMenu) setContextMenu(null)}}>
      <div className="grid flex-1 grid-cols-[auto_1fr] gap-4 p-4 min-h-0">
        <div className="h-full overflow-y-auto">
            <Card className="w-[280px]">
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
                            <DropdownMenuItem onClick={() => handleGoogleImport('Docs')}>Google Docs</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGoogleImport('Slides')}>Google Slides</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGoogleImport('Sheets')}>Google Sheets</DropdownMenuItem>
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

                    <div className="flex items-center justify-center pt-2 border-t w-full">
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
                                <Button variant="ghost" size="icon" onClick={handlePresent} className={cn(isPresenterModeActive && "text-accent")}>
                                    <ScreenShare />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Assist Mode</p></TooltipContent>
                        </Tooltip>
                    </div>
                     {isProcessingAudio && <p className="text-sm text-muted-foreground text-center">Syncing to your voice...</p>}
                     
                    <div className="flex flex-col w-full items-center gap-2 pt-2 border-t">
                      <div className="flex items-center justify-center gap-2 w-full text-sm font-medium text-muted-foreground">
                        <Popover open={isLoadPopoverOpen} onOpenChange={setIsLoadPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:no-underline hover:text-accent-foreground focus-visible:ring-0">
                                {loadedSettingName || 'Prompter Settings'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-2" align="start">
                            <div className="grid gap-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  ref={searchInputRef}
                                  placeholder="Search presets..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="h-9 pl-9 border-none bg-secondary shadow-none focus-visible:ring-0"
                                />
                              </div>
                              <ScrollArea className="h-[200px]">
                                {filteredSettings.length > 0 ? (
                                  <div className="space-y-1">
                                    {filteredSettings.map(setting => (
                                      <div key={setting.id} className="group flex items-center justify-between rounded-md hover:bg-accent">
                                        <Button
                                          variant="ghost"
                                          className="w-full justify-start font-normal"
                                          onClick={() => handleLoadSettings(setting)}
                                        >
                                          {setting.name}
                                        </Button>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                                    onClick={() => handleDeleteSetting(setting.id)}
                                                    >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right"><p>Delete Preset</p></TooltipContent>
                                        </Tooltip>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-sm text-muted-foreground py-8">No presets found.</p>
                                )}
                              </ScrollArea>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={handleResetSettings}>
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Reset to default</p></TooltipContent>
                        </Tooltip>

                        <Popover open={isSavePopoverOpen} onOpenChange={setIsSavePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setNewSettingName(`Settings ${savedSettings.length + 1}`)}>
                              <Save className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                           <PopoverContent className="w-[200px] p-1"
                              onPointerDownOutside={(e) => {
                                if ((e.target as HTMLElement).closest('[data-radix-popover-trigger]')) {
                                  e.preventDefault();
                                }
                              }}
                           >
                            <div className="flex items-center gap-1">
                                <Input
                                    value={newSettingName}
                                    onChange={(e) => setNewSettingName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveCurrentSettings();
                                    }}
                                    className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0"
                                    placeholder="Preset name..."
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveCurrentSettings}>
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                           </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-start justify-between w-full px-2">
                        <div className="flex flex-col items-center gap-3">
                          <Popover open={isSpeedPopoverOpen} onOpenChange={setIsSpeedPopoverOpen}>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0" disabled={isVoiceControlOn}><Gauge className="h-4 w-4"/></Button>
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
                      {processedText()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsHighContrast(!isHighContrast)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60 shadow-lg",
                        isHighContrast && isMaximized ? "bg-black text-white hover:bg-black/80 hover:text-white" : ""
                      )}
                    >
                      <Contrast className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>High Contrast</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsFlippedHorizontally(!isFlippedHorizontally)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60 shadow-lg",
                        isHighContrast && isMaximized ? "bg-black text-white hover:bg-black/80 hover:text-white" : ""
                      )}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>Flip Horizontal</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsFlippedVertically(!isFlippedVertically)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60 shadow-lg",
                        isHighContrast && isMaximized ? "bg-black text-white hover:bg-black/80 hover:text-white" : ""
                      )}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>Flip Vertical</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsMaximized(!isMaximized)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60 shadow-lg",
                        isHighContrast && isMaximized ? "bg-black text-white hover:bg-black/80 hover:text-white" : ""
                      )}
                    >
                    {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>{isMaximized ? 'Exit Full Screen' : 'Full Screen'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
      <div className={cn("px-4 pb-4 w-full", isMaximized ? "hidden" : "block")}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-1 pl-4 bg-muted/20">
            <h3 className="text-sm font-medium text-muted-foreground">
              Script Editor
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                  >
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isEditorExpanded ? "Collapse" : "Expand"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className={cn(isEditorExpanded ? "border-t" : "")}>
            <div className={cn("relative", !isEditorExpanded && "hidden")}>
              <Textarea
                placeholder="Paste your script here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onContextMenu={handleContextMenu}
                className="h-32 text-base resize-none w-full rounded-none border-0 bg-transparent focus-visible:ring-0"
                disabled={isAiEditing}
              />
              {isAiEditing && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
       <GoogleDocPicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onImport={handleImport}
      />
      {contextMenu && (
        <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
            <button
                onClick={() => handleAiAssist('fix')}
                className="w-full relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <SpellCheck className="h-4 w-4" />
                <span>Fix Spelling & Grammar</span>
            </button>
            <button
                onClick={() => handleAiAssist('rewrite')}
                className="w-full relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <PenSquare className="h-4 w-4" />
                <span>Rewrite Selection</span>
            </button>
            <button
                onClick={() => handleAiAssist('format')}
                className="w-full relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <WrapText className="h-4 w-4" />
                <span>Format Selection</span>
            </button>
        </div>
      )}
    </main>
  );
}
