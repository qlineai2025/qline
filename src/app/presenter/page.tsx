'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { GoogleSlideContent } from '@/ai/flows/google-drive-flows';

interface PresenterSettings {
  text: string;
  fontSize: number;
  horizontalMargin: number;
  verticalMargin: number;
  isPrompterHighContrast: boolean;
  isFlippedHorizontally: boolean;
  isFlippedVertically: boolean;
  scrollSpeed: number;
  prompterMode: 'text' | 'slides';
  slides: GoogleSlideContent[];
  currentSlideIndex: number;
  slideDisplayMode: 'slide' | 'notes';
  prompterBrightness: number;
}

const DEFAULT_SETTINGS: PresenterSettings = {
  text: 'Waiting for content from main window...',
  fontSize: 40,
  horizontalMargin: 20,
  verticalMargin: 40,
  isPrompterHighContrast: true,
  isFlippedHorizontally: false,
  isFlippedVertically: false,
  scrollSpeed: 10,
  prompterMode: 'text',
  slides: [],
  currentSlideIndex: 0,
  slideDisplayMode: 'slide',
  prompterBrightness: 100
};

// This helper function renders the text with IDs for scrolling, but it's outside the component to avoid re-renders.
function processedTextForPresenter(text: string) {
    const regex = /(\[PLAY VIDEO \d+\]|\[PAUSE \d+ SECONDS\])/g;
    const parts = text.split(regex);
    const elements: React.ReactNode[] = [];
    let wordCount = 0;
    let partKey = 0;

    parts.forEach((part) => {
        if (part.match(regex)) {
            // This part is a cue, render nothing visible for it
        } else {
            const words = part.split(/(\s+)/);
            words.forEach((word, wordKey) => {
                if (word.trim().length > 0) {
                    const currentWordIndex = wordCount;
                    wordCount++;
                    elements.push(<span key={`presenter-word-${partKey}-${wordKey}`} id={`presenter-word-${currentWordIndex}`}>{word}</span>);
                } else {
                    elements.push(<span key={`presenter-space-${partKey}-${wordKey}`}>{word}</span>);
                }
            });
        }
        partKey++;
    });

    return elements;
}

// ✅ IMPROVEMENT: Moved helper function outside component since it doesn't need state.
const mapSliderToEffectiveSpeed = (sliderValue: number): number => {
  return 2.25 * sliderValue + 25;
};

export default function PresenterPage() {
  const [settings, setSettings] = useState<PresenterSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const displayRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(settings.scrollSpeed);

  const scrollAnimation = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    const deltaTime = timestamp - lastTimeRef.current; // time in ms
    lastTimeRef.current = timestamp;

    if (displayRef.current) {
      const currentDisplay = displayRef.current;
      if (currentDisplay.scrollHeight > currentDisplay.clientHeight) {
        const effectiveSpeed = mapSliderToEffectiveSpeed(scrollSpeedRef.current); // px/sec
        const scrollAmount = effectiveSpeed * (deltaTime / 1000); // px
        currentDisplay.scrollTop += scrollAmount;
      }
      
      if (currentDisplay.scrollTop + currentDisplay.clientHeight >= currentDisplay.scrollHeight - 1) {
          setIsPlaying(false);
      } else {
          animationFrameRef.current = requestAnimationFrame(scrollAnimation);
      }
    }
  }, []); // ✅ FIXED: Removed unnecessary dependencies for a stable callback.

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
    const shouldScroll = isPlaying && (settings.prompterMode === 'text' || (settings.prompterMode === 'slides' && settings.slideDisplayMode === 'notes'));
    if (shouldScroll) {
      startScroll();
    } else {
      stopScroll();
    }
    return stopScroll;
  }, [isPlaying, startScroll, stopScroll, settings.prompterMode, settings.slideDisplayMode]);
  
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('teleprompter_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        scrollSpeedRef.current = parsedSettings.scrollSpeed;
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
          scrollSpeedRef.current = payload.scrollSpeed;
          if (displayRef.current) displayRef.current.scrollTop = 0;
          break;
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'scroll_to_word':
          const targetWord = document.getElementById(`presenter-word-${payload.wordIndex}`);
          targetWord?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        case 'reset':
          if (displayRef.current) displayRef.current.scrollTop = 0;
          break;
      }
    };

    return () => channel.close();
  }, []);


  const PrompterContent = () => (
    <div
      ref={displayRef}
      className={cn(
        "h-full overflow-y-auto",
        settings.isPrompterHighContrast ? "bg-black" : "bg-white",
        settings.isFlippedHorizontally && "scale-x-[-1]",
        settings.isFlippedVertically && "scale-y-[-1]"
      )}
      style={{
        paddingLeft: `${settings.horizontalMargin}%`,
        paddingRight: `${settings.horizontalMargin}%`,
        // ✅ NEW: Apply brightness filter to the container for consistency
        filter: !settings.isPrompterHighContrast ? `brightness(${settings.prompterBrightness}%)` : 'none'
      }}
    >
      <div
        className="w-full"
        style={{
          paddingTop: `${settings.verticalMargin}vh`,
          paddingBottom: `calc(100vh - ${settings.verticalMargin}vh)`,
        }}
      >
        <div
          className={cn(
            "whitespace-pre-wrap break-words m-auto",
            settings.isPrompterHighContrast ? "text-white" : "text-black"
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
  );

  const SlideContent = () => {
    if (!settings.slides || settings.slides.length === 0) return null;
    return (
       <div
        className={cn(
          "h-full w-full flex items-center justify-center",
          settings.isPrompterHighContrast ? "bg-black" : "bg-white",
          settings.isFlippedHorizontally && "scale-x-[-1]",
          settings.isFlippedVertically && "scale-y-[-1]"
        )}
      >
        <img
          src={settings.slides[settings.currentSlideIndex]?.imageUrl}
          alt={`Slide ${settings.currentSlideIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          // ✅ FIXED: Added brightness filter to the slide content
          style={{
            filter: !settings.isPrompterHighContrast ? `brightness(${settings.prompterBrightness}%)` : 'none'
          }}
        />
      </div>
    );
  };
  
  return (
    <main className="h-screen w-screen bg-black overflow-hidden"
    // ✅ NEW: Apply brightness filter to the main tag when in high contrast mode
      style={{
        filter: settings.isPrompterHighContrast ? `brightness(${settings.prompterBrightness}%)` : 'none'
      }}>
        {settings.prompterMode === 'text' && <PrompterContent />}
        {settings.prompterMode === 'slides' && (
          settings.slideDisplayMode === 'notes' ? <PrompterContent /> : <SlideContent />
        )}
    </main>
  );
}