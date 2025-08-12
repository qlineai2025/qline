

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { controlTeleprompter } from "@/ai/flows/teleprompter-control-flow.ts";
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
  DropdownMenuSeparator,
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
  Wand2,
  ChevronLeft,
  ChevronRight,
  NotebookText,
  Rewind,
  ClipboardList,
  Download,
  Timer,
  AudioLines,
  ListVideo,
  FileText,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleDocPicker } from "@/components/google-doc-picker";
import { GoogleSlidePicker } from "@/components/google-slide-picker";
import { GoogleSlideContent } from "@/ai/flows/google-drive-flows";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


const DEFAULT_TEXT = `Welcome to Cue Line, your intelligent teleprompter.

This is your script editor. Paste your text here to begin.

Key Features:
- Press the Play button to start scrolling.
- Use the settings on the left to customize font size, margins, and scroll speed.
- Enable Voice Control (the microphone icon) to have the speed match your reading pace automatically.

With Voice Control on, you can also use commands like:
- "pause" or "stop"
- "play" or "start"
- "rewind" to go to the top
- "next slide" (when using Google Slides)

This prompter also recognizes special cues in your script. When you read past them, it will trigger an action.

For example, a countdown is about to start... [PAUSE 3 SECONDS] ...see?

You can also get AI help. Just select some text and right-click to rewrite it, fix grammar, or reformat it.

Enjoy your flawless presentation!`;

const DEFAULT_SETTINGS = {
  scrollSpeed: 10,
  fontSize: 40,
  horizontalMargin: 20,
  verticalMargin: 40,
  startDelay: 3,
};

interface SavedSetting {
  id: string;
  name: string;
  scrollSpeed: number;
  fontSize: number;
  horizontalMargin: number;
  verticalMargin: number;
}

interface CommandLogEntry {
  take: number;
  timestamp: Date;
  command: string;
  details: string;
}


export default function Home() {
  const { toast } = useToast();
  const { user, loading, setAccessToken } = useAuth();

  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [scrollSpeed, setScrollSpeed] = useState<number>(DEFAULT_SETTINGS.scrollSpeed);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_SETTINGS.fontSize);
  const [horizontalMargin, setHorizontalMargin] = useState<number>(DEFAULT_SETTINGS.horizontalMargin);
  const [verticalMargin, setVerticalMargin] = useState<number>(DEFAULT_SETTINGS.verticalMargin);
  const [startDelay, setStartDelay] = useState<number>(DEFAULT_SETTINGS.startDelay);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVoiceControlOn, setIsVoiceControlOn] = useState<boolean>(true);
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isFlippedHorizontally, setIsFlippedHorizontally] = useState<boolean>(false);
  const [isFlippedVertically, setIsFlippedVertically] = useState<boolean>(false);
  const [isPresenterModeActive, setIsPresenterModeActive] = useState(false);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);
  const [isEditorClosed, setIsEditorClosed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [areCuesEnabled, setAreCuesEnabled] = useState<boolean>(true);
  const [isIndicatorVisible, setIsIndicatorVisible] = useState<boolean>(false);
  
  const [prompterMode, setPrompterMode] = useState<'text' | 'slides'>('text');
  const [slideDisplayMode, setSlideDisplayMode] = useState<'slide' | 'notes'>('slide');
  const [slides, setSlides] = useState<GoogleSlideContent[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [isSpeedPopoverOpen, setIsSpeedPopoverOpen] = useState(false);
  const [speedInput, setSpeedInput] = useState(String(scrollSpeed));

  const [isFontSizePopoverOpen, setIsFontSizePopoverOpen] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState(String(fontSize));

  const [isHorizontalMarginPopoverOpen, setIsHorizontalMarginPopoverOpen] = useState(false);
  const [horizontalMarginInput, setHorizontalMarginInput] = useState(String(horizontalMargin));
  
  const [isVerticalMarginPopoverOpen, setIsVerticalMarginPopoverOpen] = useState(false);
  const [verticalMarginInput, setVerticalMarginInput] = useState(String(verticalMargin));

  const [isDelayPopoverOpen, setIsDelayPopoverOpen] = useState(false);
  const [delayInput, setDelayInput] = useState(String(startDelay));

  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const [isSlidePickerOpen, setIsSlidePickerOpen] = useState(false);
  
  const [savedSettings, setSavedSettings] = useState<SavedSetting[]>([]);
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [newSettingName, setNewSettingName] = useState('');
  const [isLoadPopoverOpen, setIsLoadPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedSettingName, setLoadedSettingName] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; selectionStart: number; selectionEnd: number; } | null>(null);

  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [takeNumber, setTakeNumber] = useState(1);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isMicPickerOpen, setIsMicPickerOpen] = useState(false);

  const [videoCountdown, setVideoCountdown] = useState<number | null>(null);
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  const [triggeredCues, setTriggeredCues] = useState<number[]>([]);
  const [upcomingCue, setUpcomingCue] = useState<number | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(scrollSpeed);
  const wasPlayingBeforeCueRef = useRef(false);
  
  const prompterWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);

  useEffect(() => { setSpeedInput(String(scrollSpeed)) }, [scrollSpeed]);
  useEffect(() => { setFontSizeInput(String(fontSize)) }, [fontSize]);
  useEffect(() => { setHorizontalMarginInput(String(horizontalMargin)) }, [horizontalMargin]);
  useEffect(() => { setVerticalMarginInput(String(verticalMargin)) }, [verticalMargin]);
  useEffect(() => { setDelayInput(String(startDelay)) }, [startDelay]);

  useEffect(() => {
    // Set initial theme based on system preference
    const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isSystemDark);
    setIsHighContrast(isSystemDark);
  }, []);

  const getAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      toast({ variant: "destructive", title: "Unsupported Browser", description: "Your browser does not support audio device enumeration." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(audioInputs);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Could not get audio devices:", err);
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Cannot list microphones without permission.",
      });
      setIsMicPickerOpen(false);
    }
  }, [toast]);

  useEffect(() => {
    const handleDeviceChange = () => {
      if (isMicPickerOpen) {
          getAudioDevices();
      }
    };
    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    return () => {
        if (navigator.mediaDevices) {
            navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
    };
  }, [getAudioDevices, isMicPickerOpen]);


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

  useEffect(() => {
    try {
      localStorage.setItem("teleprompter_presets", JSON.stringify(savedSettings));
    } catch (e) {
      console.error("Could not save presets to localStorage", e);
    }
  }, [savedSettings]);
  
  useEffect(() => {
    if (isLoadPopoverOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isLoadPopoverOpen]);

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
      prompterMode,
      slides,
      currentSlideIndex,
      slideDisplayMode,
    };
    try {
        localStorage.setItem("teleprompter_settings", JSON.stringify(settings));
        channelRef.current?.postMessage({ type: "settings_update", payload: settings });
    } catch (e) {
        console.error("Could not write to localStorage", e);
    }
  }, [text, fontSize, horizontalMargin, verticalMargin, isHighContrast, isFlippedHorizontally, isFlippedVertically, scrollSpeed, prompterMode, slides, currentSlideIndex, slideDisplayMode]);

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
    setPrompterMode('text');
    setText(content);
    setSlides([]);
    setSlideDisplayMode('slide');
    setIsDocPickerOpen(false);
  };

  const handleSlideImport = (slideContents: GoogleSlideContent[]) => {
    if (slideContents.length > 0) {
        setPrompterMode('slides');
        setSlideDisplayMode('slide');
        setSlides(slideContents);
        setCurrentSlideIndex(0);
        setText(slideContents[0]?.speakerNotes || '');
        setIsPlaying(false);
    }
    setIsSlidePickerOpen(false);
  };
  
  const handleGoogleImport = (type: 'Docs' | 'Slides' | 'Sheets') => {
    if (type === 'Docs') {
      setIsDocPickerOpen(true);
    } else if (type === 'Slides') {
      setIsSlidePickerOpen(true);
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

  const handleNextSlide = useCallback(() => {
    const newIndex = Math.min(currentSlideIndex + 1, slides.length - 1);
    setCurrentSlideIndex(newIndex);
    setText(slides[newIndex]?.speakerNotes || '');
    channelRef.current?.postMessage({ type: 'slide_change', payload: { newIndex } });
  }, [currentSlideIndex, slides]);

  const handlePrevSlide = useCallback(() => {
    const newIndex = Math.max(currentSlideIndex - 1, 0);
    setCurrentSlideIndex(newIndex);
    setText(slides[newIndex]?.speakerNotes || '');
    channelRef.current?.postMessage({ type: 'slide_change', payload: { newIndex } });
  }, [currentSlideIndex, slides]);

  const mapSliderToEffectiveSpeed = (sliderValue: number): number => {
    // New mapping: Slider 0-100 -> Speed 25-250 px/s
    // y = mx + b
    // m = (250 - 25) / (100 - 0) = 2.25
    // b = 25
    return 2.25 * sliderValue + 25;
  };

  const scrollAnimation = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastTimeRef.current; // time in ms
    lastTimeRef.current = timestamp;

    if (displayRef.current) {
      const currentDisplay = displayRef.current;
      if (currentDisplay.scrollHeight > currentDisplay.clientHeight) {
        const effectiveSpeed = mapSliderToEffectiveSpeed(scrollSpeedRef.current); // this is px/sec
        const scrollAmount = effectiveSpeed * (deltaTime / 1000); // px/sec * sec = px
        currentDisplay.scrollTop += scrollAmount;
      }
      
      const isAtEnd = currentDisplay.scrollTop + currentDisplay.clientHeight >= currentDisplay.scrollHeight - 1;

      if (isAtEnd) {
        if (prompterMode === 'slides' && slideDisplayMode === 'notes' && currentSlideIndex < slides.length - 1) {
            handleNextSlide();
        } else {
            setIsPlaying(false);
        }
      } else {
          animationFrameRef.current = requestAnimationFrame(scrollAnimation);
      }
    }
  }, [prompterMode, slideDisplayMode, currentSlideIndex, slides, handleNextSlide]);

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

  const stopPlayback = useCallback(() => {
    if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setIsPlaying(false);
    stopScroll();
    channelRef.current?.postMessage({ type: "pause" });
  }, [stopScroll]);

  const startPlayback = useCallback(() => {
    if (!hasStartedPlayback) {
      setHasStartedPlayback(true);
      if (isLogging) {
        setCommandLog(prev => [
            ...prev,
            {
                take: takeNumber,
                timestamp: new Date(),
                command: 'NEW_TAKE',
                details: `Playback started (Take ${takeNumber})`,
            },
        ]);
      }
    }

    if (!isPresenterModeActive) {
      setIsMaximized(true);
    }

    if (displayRef.current) {
        if (displayRef.current.scrollTop + displayRef.current.clientHeight >= displayRef.current.scrollHeight - 1) {
            displayRef.current.scrollTop = 0;
            channelRef.current?.postMessage({ type: "reset" });
        }
    }

    if (startDelay > 0) {
        setCountdown(startDelay);
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev === null) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    return null;
                }
                if (prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                    setIsPlaying(true);
                    channelRef.current?.postMessage({ type: "play" });
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        setIsPlaying(true);
        channelRef.current?.postMessage({ type: "play" });
    }
  }, [startDelay, hasStartedPlayback, isLogging, takeNumber, isPresenterModeActive]);

  const handlePlayPause = () => {
    if (prompterMode === 'slides' && slideDisplayMode === 'slide') return;

    if (isPlaying || countdown !== null) {
        stopPlayback();
    } else {
        if (hasStartedPlayback) {
            const newTakeNumber = takeNumber + 1;
            setTakeNumber(newTakeNumber);
            if (isLogging) {
                setCommandLog(prev => [
                    ...prev,
                    {
                        take: newTakeNumber,
                        timestamp: new Date(),
                        command: 'NEW_TAKE',
                        details: `Resumed playback (Take ${newTakeNumber})`,
                    },
                ]);
            }
        }
        startPlayback();
    }
  };
  
  const handleRewind = () => {
    const wasPlaying = isPlaying;
    stopPlayback();
    
    const newTakeNumber = takeNumber + 1;
    setTakeNumber(newTakeNumber);

    if (isLogging) {
        setCommandLog(prev => [
            ...prev,
            {
                take: newTakeNumber,
                timestamp: new Date(),
                command: 'NEW_TAKE',
                details: `Rewind (Take ${newTakeNumber})`,
            },
        ]);
    }
    
    if (displayRef.current) {
        displayRef.current.scrollTop = 0;
    }
    channelRef.current?.postMessage({ type: "reset" });

    if (wasPlaying) {
        startPlayback();
    }
  };

  const scriptCues = useMemo(() => {
    if (!text) return [];

    const cues: { wordIndex: number; type: 'video' | 'pause'; duration: number; videoIndex?: number }[] = [];
    const regex = /(\[PLAY VIDEO \d+\]|\[PAUSE \d+ SECONDS\])/g;
    let cumulativeWordCount = 0;

    text.split(regex).forEach(part => {
        const videoMatch = part.match(/\[PLAY VIDEO (\d+)\]/);
        const pauseMatch = part.match(/\[PAUSE (\d+) SECONDS\]/);

        if (videoMatch && prompterMode === 'slides') {
            const videoIndex = parseInt(videoMatch[1], 10) - 1;
            const video = slides[currentSlideIndex]?.videos[videoIndex];
            if (video) {
                cues.push({
                    wordIndex: cumulativeWordCount,
                    type: 'video',
                    duration: video.duration,
                    videoIndex: videoIndex
                });
            }
        } else if (pauseMatch) {
            const duration = parseInt(pauseMatch[1], 10);
            if (!isNaN(duration)) {
                 cues.push({
                    wordIndex: cumulativeWordCount,
                    type: 'pause',
                    duration: duration
                });
            }
        } else {
            cumulativeWordCount += part.split(/(\s+)/).filter(w => w.trim().length > 0).length;
        }
    });
    return cues;
  }, [text, prompterMode, slides, currentSlideIndex]);

  useEffect(() => {
    setTriggeredCues([]);
  }, [currentSlideIndex, text]);

  const playPauseDisabled = (prompterMode === 'slides' && slideDisplayMode === 'slide') || videoCountdown !== null || pauseCountdown !== null;
  const voiceControlDisabled = playPauseDisabled;
  const speedSliderDisabled = isVoiceControlOn || playPauseDisabled;

  const updatePositionFromSpeech = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsProcessingAudio(true);
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    audioChunksRef.current = [];
    
    try {
      const audioDataUri = await blobToDataUri(audioBlob);
      const prompterState = {
          isPlaying,
          prompterMode,
          totalSlides: slides.length,
          currentSlideIndex,
      };
      
      const result = await controlTeleprompter({
        audioDataUri,
        scriptText: text,
        currentScrollSpeed: scrollSpeedRef.current,
        prompterState,
      });

      if (isLogging) {
        const timestamp = new Date();
        const { command, slideNumber, targetWordIndex, lastSpokenWordIndex, adjustedScrollSpeed } = result;

        let details = '';
        switch (command) {
            case 'next_slide': details = 'N/A'; break;
            case 'previous_slide': details = 'N/A'; break;
            case 'go_to_slide': details = `Slide ${slideNumber || 'N/A'}`; break;
            case 'stop_scrolling': details = 'N/A'; break;
            case 'start_scrolling': details = 'N/A'; break;
            case 'rewind': details = 'N/A'; break;
            case 'go_to_text': details = `Word index ${targetWordIndex || 'N/A'}`; break;
            case 'edit_text': details = 'Script modified via voice'; break;
            case 'no_op': 
            default:
                details = `Pace tracking. Speed: ${adjustedScrollSpeed?.toFixed(2)}, Word Index: ${lastSpokenWordIndex}`;
                break;
        }

        setCommandLog(prev => [...prev, { take: takeNumber, timestamp, command, details }]);
      }
      
      const { command, slideNumber, targetWordIndex, modifiedScript, lastSpokenWordIndex, adjustedScrollSpeed } = result;

      switch (command) {
        case 'next_slide':
            if (prompterMode === 'slides') handleNextSlide();
            break;
        case 'previous_slide':
            if (prompterMode === 'slides') handlePrevSlide();
            break;
        case 'go_to_slide':
            if (prompterMode === 'slides' && slideNumber !== null && slideNumber >= 1 && slideNumber <= slides.length) {
                const newIndex = slideNumber - 1;
                setCurrentSlideIndex(newIndex);
                setText(slides[newIndex]?.speakerNotes || '');
                channelRef.current?.postMessage({ type: 'slide_change', payload: { newIndex } });
            }
            break;
        case 'stop_scrolling':
            if (isPlaying || countdown !== null) stopPlayback();
            break;
        case 'start_scrolling':
             if (!playPauseDisabled && !isPlaying && countdown === null) {
                startPlayback();
            }
            break;
        case 'rewind':
            handleRewind();
            break;
        case 'go_to_text':
            if (targetWordIndex !== null) {
                const newTakeNumber = takeNumber + 1;
                setTakeNumber(newTakeNumber);
                if (isLogging) {
                    setCommandLog(prev => [
                        ...prev,
                        {
                            take: newTakeNumber,
                            timestamp: new Date(),
                            command: 'NEW_TAKE',
                            details: `Jumped to text (Take ${newTakeNumber})`,
                        },
                    ]);
                }

                const targetWord = document.getElementById(`word-${targetWordIndex}`);
                if (targetWord) {
                    targetWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    channelRef.current?.postMessage({ type: 'scroll_to_word', payload: { wordIndex: targetWordIndex } });
                }
            }
            break;
        case 'edit_text':
            if (modifiedScript) {
                setText(modifiedScript);
                toast({
                    title: "Script Updated",
                    description: "Your script was updated by voice command.",
                });
            }
            break;
        case 'no_op':
        default:
            if (adjustedScrollSpeed) {
              setScrollSpeed(adjustedScrollSpeed);
            }
            
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            if (
              prompterMode === 'slides' &&
              slideDisplayMode === 'notes' &&
              wordCount > 0 &&
              lastSpokenWordIndex >= wordCount - 2 
            ) {
              if (currentSlideIndex < slides.length - 1) {
                handleNextSlide();
                return; 
              } else {
                if (isPlaying) stopPlayback();
              }
            } else if (lastSpokenWordIndex !== null) {
                if (areCuesEnabled) {
                    const nextCue = scriptCues.find(cue => 
                        cue.wordIndex > lastSpokenWordIndex && 
                        !triggeredCues.includes(cue.wordIndex)
                    );
        
                    if (nextCue) {
                        const wordsUntilCue = nextCue.wordIndex - lastSpokenWordIndex;
                        if (wordsUntilCue <= 10 && upcomingCue !== nextCue.wordIndex) {
                            setUpcomingCue(nextCue.wordIndex);
                            setTimeout(() => {
                                setUpcomingCue(null);
                            }, 2000);
                        }
                    }

                    const triggeredCue = scriptCues.find(cue => 
                        lastSpokenWordIndex >= cue.wordIndex && !triggeredCues.includes(cue.wordIndex)
                    );

                    if (triggeredCue) {
                        wasPlayingBeforeCueRef.current = isPlaying;
                        stopPlayback();
                        setTriggeredCues(prev => [...prev, triggeredCue.wordIndex]);
                        setUpcomingCue(null);

                        if (triggeredCue.type === 'video') {
                            setVideoCountdown(triggeredCue.duration);
                        } else if (triggeredCue.type === 'pause') {
                            setPauseCountdown(triggeredCue.duration);
                        }
                        return;
                    }
                }
            }

            const targetWord = document.getElementById(`word-${lastSpokenWordIndex}`);
            if (targetWord) {
              targetWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
              channelRef.current?.postMessage({ type: 'scroll_to_word', payload: { wordIndex: lastSpokenWordIndex } });
            }
            break;
      }

    } catch (error: any) {
      console.error("Error processing voice input:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: error.message || "Could not process voice input.",
      });
    } finally {
      setIsProcessingAudio(false);
    }
  }, [text, toast, prompterMode, slideDisplayMode, currentSlideIndex, slides, handleNextSlide, handlePrevSlide, isPlaying, isLogging, startPlayback, stopPlayback, countdown, takeNumber, scriptCues, triggeredCues, areCuesEnabled, upcomingCue, playPauseDisabled, handleRewind]);

  const startRecording = useCallback(() => {
    const audioConstraints = {
      audio: selectedDeviceId === 'default'
        ? true
        : { deviceId: { exact: selectedDeviceId } }
    };

    navigator.mediaDevices.getUserMedia(audioConstraints)
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
  }, [updatePositionFromSpeech, toast, selectedDeviceId]);

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
    const isNotesViewScrolling = prompterMode === 'slides' && slideDisplayMode === 'notes';
    const isTextViewScrolling = prompterMode === 'text';

    if (isPlaying && (isTextViewScrolling || isNotesViewScrolling)) {
      startScroll();
    } else {
      stopScroll();
    }
    return stopScroll;
  }, [isPlaying, startScroll, stopScroll, prompterMode, slideDisplayMode]);


  useEffect(() => {
    const isNotesViewVoiceControl = prompterMode === 'slides' && slideDisplayMode === 'notes';
    const isTextViewVoiceControl = prompterMode === 'text';
    
    if (isPlaying && isVoiceControlOn && (isTextViewVoiceControl || isNotesViewVoiceControl)) {
      startRecording();
    } else {
      stopRecording();
    }
    return stopRecording;
  }, [isPlaying, isVoiceControlOn, startRecording, stopRecording, prompterMode, slideDisplayMode]);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = 0;
    }
  }, [text]);

  useEffect(() => {
    return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (videoCountdownIntervalRef.current) clearInterval(videoCountdownIntervalRef.current);
        if (pauseCountdownIntervalRef.current) clearInterval(pauseCountdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (videoCountdownIntervalRef.current) {
      clearInterval(videoCountdownIntervalRef.current);
    }
    if (videoCountdown !== null && videoCountdown > 0) {
      videoCountdownIntervalRef.current = setInterval(() => {
        setVideoCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (videoCountdownIntervalRef.current) clearInterval(videoCountdownIntervalRef.current);
            if (wasPlayingBeforeCueRef.current) {
              startPlayback();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (videoCountdown === 0) {
      setVideoCountdown(null);
      if (wasPlayingBeforeCueRef.current) {
        startPlayback();
      }
    }
    return () => {
      if (videoCountdownIntervalRef.current) clearInterval(videoCountdownIntervalRef.current);
    };
  }, [videoCountdown, startPlayback]);

  useEffect(() => {
    if (pauseCountdownIntervalRef.current) {
      clearInterval(pauseCountdownIntervalRef.current);
    }
    if (pauseCountdown !== null && pauseCountdown > 0) {
      pauseCountdownIntervalRef.current = setInterval(() => {
        setPauseCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (pauseCountdownIntervalRef.current) clearInterval(pauseCountdownIntervalRef.current);
            if (wasPlayingBeforeCueRef.current) {
              startPlayback();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (pauseCountdown === 0) {
      setPauseCountdown(null);
      if (wasPlayingBeforeCueRef.current) {
        startPlayback();
      }
    }
    return () => {
      if (pauseCountdownIntervalRef.current) clearInterval(pauseCountdownIntervalRef.current);
    };
  }, [pauseCountdown, startPlayback]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if(isMaximized) setIsMaximized(false);
        if(isSpeedPopoverOpen) setIsSpeedPopoverOpen(false);
        if(isFontSizePopoverOpen) setIsFontSizePopoverOpen(false);
        if(isHorizontalMarginPopoverOpen) setIsHorizontalMarginPopoverOpen(false);
        if(isVerticalMarginPopoverOpen) setIsVerticalMarginPopoverOpen(false);
        if(isDelayPopoverOpen) setIsDelayPopoverOpen(false);
        if (contextMenu) setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMaximized, isSpeedPopoverOpen, isFontSizePopoverOpen, isHorizontalMarginPopoverOpen, isVerticalMarginPopoverOpen, isDelayPopoverOpen, contextMenu]);
  
  const popoverContentClass = "w-[150px] p-2";
  
  const processedText = useCallback(() => {
    const regex = /(\[PLAY VIDEO \d+\]|\[PAUSE \d+ SECONDS\])/g;
    const parts = text.split(regex);
    const elements: React.ReactNode[] = [];
    let wordCount = 0;
    let partKey = 0;

    parts.forEach((part) => {
        const videoMatch = part.match(/\[PLAY VIDEO (\d+)\]/);
        const pauseMatch = part.match(/\[PAUSE (\d+) SECONDS\]/);

        if (videoMatch || pauseMatch) {
            // This part is the cue, we render nothing visible for it
        } else {
            const words = part.split(/(\s+)/);
            words.forEach((word, wordKey) => {
                if (word.trim().length > 0) {
                    const currentWordIndex = wordCount;
                    wordCount++;
                    elements.push(<span key={`word-${partKey}-${wordKey}`} id={`word-${currentWordIndex}`}>{word}</span>);
                } else {
                    elements.push(<span key={`space-${partKey}-${wordKey}`}>{word}</span>);
                }
            });
        }
        partKey++;
    });

    return elements;
  }, [text]);

  const handleResetSettings = () => {
    setScrollSpeed(DEFAULT_SETTINGS.scrollSpeed);
    setFontSize(DEFAULT_SETTINGS.fontSize);
    setHorizontalMargin(DEFAULT_SETTINGS.horizontalMargin);
    setVerticalMargin(DEFAULT_SETTINGS.verticalMargin);
    setStartDelay(DEFAULT_SETTINGS.startDelay);
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

  const handleCleanupScript = async () => {
    if (!text) {
      toast({
        variant: "destructive",
        title: "Empty Script",
        description: "There is no script to clean up.",
      });
      return;
    }
    setIsAiEditing(true);
    try {
      const modifiedScript = await assistWithScript({ command: 'cleanup', scriptText: text });
      setText(modifiedScript);
      toast({
        title: "Script Cleaned Up",
        description: `The script has been automatically formatted.`,
      });
    } catch (error: any) {
      console.error("AI script cleanup error:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: error.message || "Could not clean up the script.",
      });
    } finally {
        setIsAiEditing(false);
    }
  };

  const filteredSettings = savedSettings.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (prompterMode === 'slides') return;
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

  const handleToggleLogging = () => {
    const nextState = !isLogging;
    if (nextState) { 
        toast({ title: "Command logging enabled." });
        setCommandLog([]); 
        setTakeNumber(1); 
        setHasStartedPlayback(false); 
    } else {
        toast({ title: "Command logging disabled." });
    }
    setIsLogging(nextState);
  };

  const downloadLog = (format: 'csv' | 'srt') => {
    if (commandLog.length === 0) {
        toast({ title: 'No log entries to download.' });
        return;
    }

    let content = '';
    let fileExtension = '';
    let mimeType = '';

    if (format === 'csv') {
        fileExtension = 'csv';
        mimeType = 'text/csv;charset=utf-8;';
        const header = 'Take,Timestamp,Command,Details\n';
        const rows = commandLog.map(log => 
            `${log.take},${log.timestamp.toISOString()},${log.command},"${log.details.replace(/"/g, '""')}"`
        ).join('\n');
        content = header + rows;
    } else { 
        fileExtension = 'srt';
        mimeType = 'application/x-subrip;charset=utf-8;';
        content = commandLog.map((log, index) => {
            const startTime = log.timestamp;
            const endTime = new Date(startTime.getTime() + 2000); 
            
            const toSrtTime = (date: Date) => {
                const h = String(date.getUTCHours()).padStart(2, '0');
                const m = String(date.getUTCMinutes()).padStart(2, '0');
                const s = String(date.getUTCSeconds()).padStart(2, '0');
                const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
                return `${h}:${m}:${s},${ms}`;
            };

            return `${index + 1}\n${toSrtTime(startTime)} --> ${toSrtTime(endTime)}\nTake ${log.take} | ${log.command}: ${log.details}\n`;
        }).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `q_log_${new Date().toISOString()}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsHighContrast(isDark);
  };

  return (
    <main className="flex h-screen flex-col bg-background" onClickCapture={() => { if (contextMenu) setContextMenu(null)}}>
      <div className="grid flex-1 grid-cols-[auto_1fr] gap-4 p-4 min-h-0">
        <div className="h-full overflow-y-auto">
            <Card className="w-[280px] h-full flex flex-col">
              <CardContent className="flex flex-col items-center gap-4 p-2 flex-1">
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
                      
                      <div className="flex w-full">
                        <Button onClick={handlePlayPause} className="w-full rounded-r-none" disabled={playPauseDisabled}>
                          {isPlaying || countdown !== null ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                          {isPlaying || countdown !== null ? "Pause" : "Play"}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="default"
                              size="icon" 
                              onClick={() => setIsVoiceControlOn(!isVoiceControlOn)} 
                              disabled={voiceControlDisabled}
                              className="rounded-l-none"
                            >
                                <Mic className={cn(isVoiceControlOn ? "text-accent" : "text-primary-foreground")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Voice Control</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center justify-center pt-2 border-t w-full">
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handlePresent} className={cn(isPresenterModeActive && "text-accent")}>
                                    <ScreenShare />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Assist Mode</p></TooltipContent>
                        </Tooltip>
                        <Popover open={isDelayPopoverOpen} onOpenChange={setIsDelayPopoverOpen}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon"><Timer /></Button>
                                  </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Start Delay: {startDelay}s</p></TooltipContent>
                          </Tooltip>
                          <PopoverContent className={popoverContentClass}
                          onPointerDownOutside={() => handleSave(setStartDelay, delayInput, 0, 10, setIsDelayPopoverOpen)}>
                              <Input
                                  id="delay-input"
                                  type="number"
                                  value={delayInput}
                                  onChange={(e) => setDelayInput(e.target.value)}
                                  min={0}
                                  max={10}
                                  onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(setStartDelay, delayInput, 0, 10, setIsDelayPopoverOpen)
                                  }}
                              />
                          </PopoverContent>
                        </Popover>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setAreCuesEnabled(!areCuesEnabled)}>
                                    <ListVideo className={cn(areCuesEnabled && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{areCuesEnabled ? 'Disable Script Cues' : 'Enable Script Cues'}</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleToggleLogging}>
                                    <ClipboardList className={cn(isLogging && "text-accent")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{isLogging ? 'Stop Command Logging' : 'Start Command Logging'}</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={commandLog.length === 0}>
                                            <Download />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Download Log</p></TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => downloadLog('csv')}>Download as .CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => downloadLog('srt')}>Download as .SRT</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="!text-destructive focus:bg-destructive/10" 
                                    onClick={() => setCommandLog([])}
                                >
                                    Clear Log
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {isEditorClosed && (
                           <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setIsEditorClosed(false)}>
                                        <FileText />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Show Script Editor</p></TooltipContent>
                            </Tooltip>
                        )}
                        <Popover open={isMicPickerOpen} onOpenChange={(open) => {
                            setIsMicPickerOpen(open);
                            if (open) {
                                getAudioDevices();
                            }
                        }}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <AudioLines />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select Audio Input</p>
                            </TooltipContent>
                          </Tooltip>
                          <PopoverContent className="w-[240px] p-0">
                            <Label className="p-2 text-sm font-medium text-muted-foreground">Audio Input</Label>
                            <RadioGroup value={selectedDeviceId} onValueChange={setSelectedDeviceId} className="p-1">
                                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                    <RadioGroupItem value="default" id="device-default" />
                                    <Label htmlFor="device-default" className="w-full">System Default</Label>
                                </div>
                                {audioDevices.map((device, index) => (
                                    <div key={device.deviceId} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                        <RadioGroupItem value={device.deviceId} id={`device-${device.deviceId}`} />
                                        <Label htmlFor={`device-${device.deviceId}`} className="truncate w-full">{device.label || `Microphone ${index + 1}`}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                          </PopoverContent>
                        </Popover>
                        {prompterMode === 'slides' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setSlideDisplayMode(prev => prev === 'slide' ? 'notes' : 'slide')}>
                                        <NotebookText className={cn(slideDisplayMode === 'notes' && "text-accent")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{slideDisplayMode === 'slide' ? 'Show Speaker Notes' : 'Show Slide'}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                     {isProcessingAudio && <p className="text-sm text-muted-foreground text-center">Syncing to your voice...</p>}
                     
                    <div className="flex flex-col w-full items-center gap-2 pt-2 border-t flex-1">
                      <div className="flex items-center justify-center gap-2 w-full text-sm font-medium text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={handleToggleTheme}>
                                {isHighContrast ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Toggle Theme</p></TooltipContent>
                        </Tooltip>
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
                      <div className="flex flex-1 items-stretch justify-between w-full px-2">
                        <div className="flex flex-col items-center gap-3">
                          <Popover open={isSpeedPopoverOpen} onOpenChange={setIsSpeedPopoverOpen}>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-7 h-7 p-0" disabled={speedSliderDisabled}><Gauge className="h-4 w-4"/></Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Scroll Speed: {scrollSpeed.toFixed(0)}</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setScrollSpeed, speedInput, 0, 100, setIsSpeedPopoverOpen)}>
                                    <Input
                                      id="speed-input"
                                      type="number"
                                      value={speedInput}
                                      onChange={(e) => setSpeedInput(e.target.value)}
                                      min={0}
                                      max={100}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setScrollSpeed, speedInput, 0, 100, setIsSpeedPopoverOpen)
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="speed"
                            orientation="vertical"
                            min={0}
                            max={100}
                            step={1}
                            value={[scrollSpeed]}
                            onValueChange={(value) => setScrollSpeed(value[0])}
                            disabled={speedSliderDisabled}
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
                                <TooltipContent><p>Vertical Margin: {verticalMargin}vh</p></TooltipContent>
                               </Tooltip>
                               <PopoverContent className={popoverContentClass}
                                onPointerDownOutside={() => handleSave(setVerticalMargin, verticalMarginInput, 0, 50, setIsVerticalMarginPopoverOpen)}>
                                    <Input
                                      id="v-margin-input"
                                      type="number"
                                      value={verticalMarginInput}
                                      onChange={(e) => setVerticalMarginInput(e.target.value)}
                                      min={0}
                                      max={50}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(setVerticalMargin, verticalMarginInput, 0, 50, setIsVerticalMarginPopoverOpen);
                                      }}
                                    />
                               </PopoverContent>
                          </Popover>
                          <Slider
                            id="vertical-margin"
                            orientation="vertical"
                            min={0}
                            max={50}
                            step={1}
                            value={[verticalMargin]}
                            onValueChange={(value) => setVerticalMargin(value[0])}
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
                isMaximized && "rounded-none border-none"
              )}
            >
              <CardContent className={cn(
                  "p-0 flex-grow overflow-hidden relative",
                  isMaximized ? "rounded-none" : "rounded-lg"
                )}>
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="h-5 w-5 flex items-center justify-center cursor-pointer rounded-full"
                          onClick={() => setIsIndicatorVisible(!isIndicatorVisible)}
                        >
                          {isPlaying && isVoiceControlOn && isIndicatorVisible && (
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{isIndicatorVisible ? 'Hide Indicator' : 'Show Indicator'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {upcomingCue !== null && (
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 pointer-events-none animate-in fade-in" />
                  )}
                </div>
                
                {prompterMode === 'text' && (
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
                      className="w-full"
                       style={{
                        paddingTop: `${verticalMargin}vh`,
                        paddingBottom: `calc(100vh - ${verticalMargin}vh)`,
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
                )}
                 {prompterMode === 'slides' && slides.length > 0 && (
                  <>
                    {slideDisplayMode === 'slide' ? (
                       <div
                          className={cn(
                              "h-full w-full flex items-center justify-center",
                              isHighContrast && "bg-black",
                              isFlippedHorizontally && "scale-x-[-1]",
                              isFlippedVertically && "scale-y-[-1]"
                          )}
                      >
                          <img
                              src={slides[currentSlideIndex]?.imageUrl}
                              alt={`Slide ${currentSlideIndex + 1}`}
                              className="max-w-full max-h-full object-contain"
                          />
                      </div>
                    ) : (
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
                          className="w-full"
                           style={{
                            paddingTop: `${verticalMargin}vh`,
                            paddingBottom: `calc(100vh - ${verticalMargin}vh)`,
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
                    )}
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevSlide}
                        disabled={currentSlideIndex === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 opacity-50 hover:opacity-100 bg-black/20 hover:bg-black/40 text-white"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextSlide}
                        disabled={currentSlideIndex === slides.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 opacity-50 hover:opacity-100 bg-black/20 hover:bg-black/40 text-white"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                        {currentSlideIndex + 1} / {slides.length}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
             {(countdown !== null || videoCountdown !== null || pauseCountdown !== null) && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
                    <span className="text-white font-bold text-9xl drop-shadow-lg animate-ping">{countdown ?? videoCountdown ?? pauseCountdown}</span>
                </div>
            )}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRewind}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60",
                        isHighContrast && isMaximized ? "bg-black text-white hover:bg-black/80 hover:text-white" : ""
                      )}
                    >
                      <Rewind className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>Rewind to Top</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsFlippedHorizontally(!isFlippedHorizontally)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-60",
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
                        "opacity-60",
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
                        "opacity-60",
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
      {!isEditorClosed && (
        <div className={cn("px-4 pb-4 w-full", isMaximized ? "hidden" : "block")}>
            <Card className="overflow-hidden">
            <div className="relative">
                <TooltipProvider>
                <div className={cn("absolute right-1 top-1 z-10 flex items-center")}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleCleanupScript}
                                disabled={isAiEditing || prompterMode === 'slides'}
                            >
                                <Wand2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Cleanup Script</p>
                        </TooltipContent>
                    </Tooltip>
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsEditorClosed(true)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Close Editor</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                </TooltipProvider>

                <Textarea
                placeholder={prompterMode === 'text' ? "Paste your script here..." : "Speaker notes will appear here..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onContextMenu={handleContextMenu}
                className={cn(
                    'w-full resize-none rounded-none border-0 bg-transparent text-base transition-all duration-300 ease-in-out focus-visible:ring-0',
                    isEditorExpanded ? 'h-96' : 'h-32'
                )}
                disabled={isAiEditing || prompterMode === 'slides'}
                />
                {isAiEditing && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
            </Card>
        </div>
      )}
       <GoogleDocPicker
        open={isDocPickerOpen}
        onOpenChange={setIsDocPickerOpen}
        onImport={handleImport}
      />
      <GoogleSlidePicker
        open={isSlidePickerOpen}
        onOpenChange={setIsSlidePickerOpen}
        onImport={handleSlideImport}
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
