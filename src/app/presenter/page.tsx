
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PresenterSettings {
  text: string;
  fontSize: number;
  horizontalMargin: number;
  verticalMargin: number;
  isHighContrast: boolean;
  isFlippedHorizontally: boolean;
  isFlippedVertically: boolean;
  scrollSpeed: number;
  prompterMode: 'text' | 'slides';
  slides: string[];
  currentSlideIndex: number;
}

const DEFAULT_SETTINGS: PresenterSettings = {
  text: 'Waiting for content from main window...',
  fontSize: 40,
  horizontalMargin: 20,
  verticalMargin: 18,
  isHighContrast: true,
  isFlippedHorizontally: false,
  isFlippedVertically: false,
  scrollSpeed: 30,
  prompterMode: 'text',
  slides: [],
  currentSlideIndex: 0,
};

function processedTextForPresenter(text: string) {
    const words = text.split(/(\s+)/);
    let wordCount = 0;
    return words.map((word, index) => {
      if (word.trim().length > 0) {
        const wordIndex = wordCount;
        wordCount++;
        return (
          <span key={index} id={`presenter-word-${wordIndex}`}>
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
}

export default function PresenterPage() {
  const [settings, setSettings] = useState<PresenterSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const displayRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(settings.scrollSpeed);

  useEffect(() => { scrollSpeedRef.current = settings.scrollSpeed; }, [settings.scrollSpeed]);
  
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('teleprompter_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error("Could not read settings from localStorage", e);
    }
    
    const channel = new BroadcastChannel('teleprompter_channel');
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'settings_update':
          setSettings(payload);
          break;
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'reset':
          if (displayRef.current) displayRef.current.scrollTop = 0;
          break;
        case 'scroll_to_word':
          const targetWord = document.getElementById(`presenter-word-${payload.wordIndex}`);
          targetWord?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        case 'slide_change':
          setSettings(s => ({ ...s, currentSlideIndex: payload.newIndex }));
          break;
      }
    };

    return () => channel.close();
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
    if (isPlaying && settings.prompterMode === 'text') {
      startScroll();
    } else {
      stopScroll();
    }
    return stopScroll;
  }, [isPlaying, startScroll, stopScroll, settings.prompterMode]);

  return (
    <main className="h-screen w-screen bg-black overflow-hidden">
        {settings.prompterMode === 'text' ? (
            <div
                ref={displayRef}
                className={cn(
                "h-full overflow-y-auto",
                settings.isHighContrast && "bg-black",
                settings.isFlippedHorizontally && "scale-x-[-1]",
                settings.isFlippedVertically && "scale-y-[-1]"
                )}
                style={{
                paddingLeft: `${settings.horizontalMargin}%`,
                paddingRight: `${settings.horizontalMargin}%`,
                }}
            >
                <div
                className="w-full min-h-full flex justify-center items-center m-auto"
                    style={{
                    paddingTop: `${settings.verticalMargin}%`,
                    paddingBottom: `${settings.verticalMargin}%`,
                }}
                >
                <div
                    className={cn(
                    "whitespace-pre-wrap break-words m-auto",
                    settings.isHighContrast ? "text-white" : "text-foreground"
                    )}
                    style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: 1.5,
                    }}
                >
                    {processedTextForPresenter(settings.text)}
                </div>
                </div>
            </div>
        ) : settings.slides.length > 0 ? (
            <div
                className={cn(
                "h-full w-full flex items-center justify-center",
                settings.isHighContrast && "bg-black",
                settings.isFlippedHorizontally && "scale-x-[-1]",
                settings.isFlippedVertically && "scale-y-[-1]"
                )}
            >
                <img
                    src={settings.slides[settings.currentSlideIndex]}
                    alt={`Slide ${settings.currentSlideIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                />
            </div>
        ) : null}
    </main>
  );
}
