# CuePilot AI: User Manual & Design Guide

This document provides a complete guide to the features, design patterns, and functionality of the CuePilot AI application.

## 1. User Manual: How to Use the App

This guide will walk you through all the features of CuePilot AI.

### Getting Started

*   **Pasting Your Script**: The primary way to get your text into the prompter is by using the **Script Editor** at the bottom of the screen. Simply click into the text area and paste or type your script. The prompter display will update in real-time.
*   **Importing from Google**: You can sign in with your Google account to enable import options. Currently, you can import from Google Docs and Google Slides.
*   **Set Your API Key**: To unlock the AI-powered features (like Voice Control and AI Editing), you must add your Google AI API key to the `.env` file in the project. For video countdowns, you may also need to enable the **YouTube Data API v3** in your Google Cloud Project.

### Main Controls

Located in the top-left of the control panel:

*   **Sign In / Import**:
    *   If you are not signed in, this button allows you to sign in with Google.
    *   Once signed in, this button becomes an "Import" dropdown, providing options to import scripts from your Google Drive.
*   **Play / Pause Button**:
    *   Press **Play** to start the teleprompter. This will automatically switch the prompter to full-screen mode and initiate a start delay countdown if one is set.
    *   Press **Pause** to stop the scrolling.

### Display & Functionality Toggles

These icon-based buttons give you control over the teleprompter's functionality and appearance. Their color changes when active, and you can hover over them to see a tooltip explaining their function.

#### Controls in the Side Panel
*   **Voice Control (Mic Icon)**: When enabled, the app uses an AI-powered system that listens for both verbal commands and your reading pace.
    *   **Command Recognition**: You can control the prompter with your voice. The available commands are: "next slide", "previous slide", "go to slide [number]", "stop"/"pause", "start"/"play"/"go", "rewind", and in-text navigation like "go back to [a phrase from your script]". The AI prioritizes commands over script reading.
    *   **Voice-Controlled Editing**: You can also edit your script with voice commands. The AI is trained to understand instructions like: "change the phrase 'data security' to 'data privacy'", "delete the sentence 'this is no longer needed'", or "add the text 'let me reiterate' before the final paragraph". The AI will process your request and update the script in the editor instantly.
    *   **Pace Matching & Position Tracking**: If no command is detected, the AI falls back to its original behavior: it intelligently matches the scrolling speed to your reading pace and periodically re-centers the view on the last word you spoke.
    *   **Automatic Slide Navigation**: When in "Notes View" for a presentation, the prompter will automatically advance to the next slide once you've finished reading all the notes for the current one.
*   **Assist Mode (ScreenShare Icon)**: This button opens a clean, secondary prompter window. You can drag this window to a second monitor and make it full-screen. It stays perfectly in sync with the main window's text, settings, and scrolling.
*   **Start Delay (Timer Icon)**: Click this icon to open a popover and set a countdown delay (in seconds). When you press play, a large countdown will appear on-screen before the scrolling begins. This gives you time to get ready. The default is 3 seconds.
*   **Command Logging (ClipboardList Icon)**: Toggles the command logging feature. When active, every voice command, pause, resume, or jump is captured with a timestamp and a "take" number. This is invaluable for reviewing a session or preparing a video for editing.
*   **Download Log (Download Icon)**: This button becomes active once you have logged at least one command. Clicking it reveals a menu to download the session log as a `.CSV` file (for spreadsheets) or a `.SRT` file (a standard subtitle format perfect for video editing timelines).
*   **Audio Input (AudioLines Icon)**: Click this icon to open a popover listing all available microphones connected to your computer. This allows you to easily switch between your system default, a USB mic, or other audio inputs without leaving the app.
*   **Notes View (NotebookText Icon)**: When a Google Slides presentation is loaded, this button appears. It allows you to toggle the main prompter display between showing the full slide image and showing the speaker notes for that slide as scrollable text.
*   **Embedded Cues in Speaker Notes**: When using "Notes View", you can embed cues for videos and timed pauses in your speaker notes.
    *   **Video Playback**: In your Google Slides speaker notes, type `[PLAY VIDEO 1]` where you want the video to start. The number should correspond to the order of the video on the slide (the first video is 1, the second is 2, etc.). When you read past this cue with Voice Control active, the app will pause scrolling and display a countdown for the full duration of the video, cueing you on when to resume speaking. Scrolling will automatically continue after the countdown finishes.
    *   **Planned Pauses**: In your script or speaker notes, type `[PAUSE 3 SECONDS]` where you want a timed pause. When the app detects this cue, it will pause scrolling and display a countdown. This is perfect for dramatic pauses or giving your audience time to absorb a key point.

#### Controls on the Prompter View
These controls are overlaid on the bottom-right of the prompter display area. They have a subtle, semi-transparent style to ensure they are visible on any background.
*   **Rewind (Rewind Icon)**: Instantly stops playback and scrolls the teleprompter content to the very top. If playback was active, it will automatically re-initiate the countdown and start again. This action also marks the beginning of a new **take** in the command log.
*   **High Contrast (Contrast Icon)**: Toggles the display between standard mode (black text on a light background) and high-contrast mode (white text on a black background).
*   **Flip Horizontal (ArrowLeftRight Icon)**: Mirrors the prompter text horizontally. This is essential for use with physical teleprompter hardware that uses a mirror.
*   **Flip Vertical (ArrowUpDown Icon)**: Flips the prompter text vertically.
*   **Full Screen (Maximize/Minimize Icon)**: Manually toggles the full-screen view. Note that pressing "Play" also automatically enters full-screen. Pressing the 'Escape' key will exit full-screen mode.

### Fine-Tuning Controls (Sliders & Presets)

The control panel features four vertical sliders for precise adjustments, as well as a powerful preset management system.

#### Adjusting Settings with Sliders
*   **How to Use**:
    *   **Drag the slider handle** for quick, visual adjustments.
    *   **Hover over the icon** above the slider to see the current value in a tooltip.
    *   **Click the icon** to open a popover where you can type a precise numeric value. Press 'Enter' or click outside the popover to save.
*   **Controls**:
    *   **Scroll Speed (Gauge Icon)**: Sets the manual scrolling speed. This slider is disabled when Voice Control is active.
    *   **Font Size (TextIcon)**: Increases or decreases the size of the prompter text.
    *   **Horizontal Margin (StretchHorizontal Icon)**: Adjusts the empty space on the left and right sides of the text.
    *   **Vertical Margin (StretchVertical Icon)**: Adjusts the empty space at the top and bottom of the prompter area.

#### Managing Setting Presets
Directly within the "Prompter Settings" header, you can save, load, and manage your slider configurations.
*   **Loading Presets**: Click the header title (e.g., "Prompter Settings") to open a popover listing all your saved presets.
    *   **Search**: The popover has an auto-focused search bar, so you can immediately start typing to filter your presets.
    *   **Activate**: Click on a preset name to load its settings. The header title will update to show the name of the currently active preset.
    *   **Delete**: Hover over a preset and click the `Trash2` icon to delete it.
*   **Saving Presets**: Click the `Save` icon in the header. A small popover will appear, allowing you to name your current settings. The name is editable inline, and you simply click the `Check` icon to save.
*   **Resetting to Default**: Click the `RotateCcw` icon in the header to instantly reset all sliders to their default values. The header will revert to "Prompter Settings".

### Script Editor

The script editor is located at the bottom of the page and includes several powerful features to help you prepare your text.

*   **Expand/Collapse Editor (ChevronsUpDown Icon)**: Click this icon in the top-right corner to toggle the editor's height, giving you more space to write when you need it.
*   **One-Click AI Cleanup (Wand2 Icon)**: Click this "magic wand" icon to have the AI automatically clean up your entire script. It removes timecode stamps (from SRT/VTT files), formats paragraphs, and converts speaker names to ALL CAPS for a professional, teleprompter-ready format.
*   **Contextual AI Editing**: For more targeted changes, highlight a portion of your script and **right-click**. A context menu will appear at your cursor, allowing you to:
    *   Fix Spelling & Grammar
    *   Rewrite the selection for clarity and impact
    *   Format the selection for better readability

### Production & Logging

CuePilot AI includes features designed for a professional production workflow, particularly for video recording and editing.

*   **Understanding "Takes"**: The app automatically tracks your performance in "takes." A new take is started whenever you resume from a pause, use the rewind function, or jump to a different part of the script with your voice. This creates a granular record of every continuous performance segment.
*   **Log Files for Editing**: By enabling **Command Logging**, you can export this performance data as a `.SRT` file. When imported into video editing software like Adobe Premiere Pro, this file will place markers on your timeline for every take, pause, and command, dramatically speeding up the editing process.

### User Profile

When signed in, your profile picture and email will appear at the bottom of the control panel, with a button to sign out.

---

## 2. Design System & Functionality Guide

This section outlines the UI patterns and design choices that define the application's user experience.

### Layout Philosophy

The application is designed around a **compact, efficient, and intuitive layout**. Key principles include:

*   **Maximized Prompter Space**: The layout prioritizes the prompter display area. Controls are condensed into a wider side panel for better visual balance, and the script editor is placed at the bottom to not interfere with the primary view.
*   **Independent Scrolling**: The "Controls & Settings" panel can scroll independently from the main content, ensuring all controls are accessible regardless of screen height.
*   **Responsive Design**: The layout adapts gracefully to different screen sizes.

### Core UI Patterns

#### 1. Compact, Icon-Driven Control Panel
The left-hand control panel is designed to be clear and unobtrusive.
*   **Icons as Controls**: Toggles and identifiers are represented by icons (`Mic`, `ScreenShare`, `Timer`, `ClipboardList`). This saves space and creates a clean, modern aesthetic. The preset management system (Load, Save, Reset) is also integrated directly into the settings header using icons.
*   **Tooltips for Clarity**: To ensure usability, all icon-only buttons are wrapped in a `<Tooltip>`. Hovering over an icon reveals its function.
*   **Vertical Sliders**: Sliders are oriented vertically to fit the panel.

#### 2. Popovers for Precise & Complex Input
To allow for advanced user input without using disruptive modals:
*   **Precise Value Input**: Clicking a slider's icon or the `Timer` icon opens a lightweight `<Popover>` to type an exact number.
*   **Preset Management**: More complex popovers are used for saving and loading setting presets. The "Save" popover features an inline, headerless input for a seamless experience. The "Load" popover contains a list, a search field, and delete functionality, creating a mini-dashboard for managing presets.
*   **Device Selection**: The `AudioLines` popover provides a simple radio-button list for selecting an input device.

#### 3. Overlay Controls on Prompter Area
To keep essential display controls accessible without cluttering the main panel, key toggles (`Rewind`, `High Contrast`, `Flip`, `Full Screen`) are placed as overlay buttons on the bottom-right of the prompter itself.
*   **Visibility**: These buttons have a semi-transparent style and their colors adapt to high-contrast mode, ensuring they are always visible but never distracting.
*   **Grouping**: This logically groups view-manipulation controls with the view itself.

#### 4. Minimalist & Functional Script Editor
The script editor is designed to be powerful yet unobtrusive.
*   **Icon-Driven Header**: Instead of a static text header, the editor uses icon controls in the top-right corner for `Expand/Collapse` and `AI Cleanup`. This maximizes vertical space and keeps the interface clean.
*   **Collapsible Height**: The editor's height can be toggled, allowing it to be compact by default but expandable for serious editing sessions.

#### 5. Contextual AI Editing
To provide a seamless and professional editing experience, AI assistance is not triggered by persistent on-screen buttons. Instead, it's integrated via a **contextual right-click menu**.
*   **Interaction**: This pattern feels native to modern text editors. The menu appears directly at the user's point of focus.
*   **Intelligent Flow**: The `assistWithScript` AI flow is designed to handle both full-script and partial-script modifications. When operating on a selection, it uses the surrounding text for context but intelligently returns only the modified portion, which is then swapped into the original text.

#### 6. Real-Time Presenter Mode Sync
The second-screen "Assist Mode" is architected for robust, real-time synchronization between the main control window and the secondary display window.
*   **`localStorage` for Initial State**: When the presenter window first opens, it immediately reads all current settings (script text, font size, margins, etc.) from `localStorage`. This ensures it instantly mirrors the main app's state.
*   **`BroadcastChannel` for Live Updates**: After initializing, a `BroadcastChannel` is established. This modern browser API creates a direct communication line between the two windows.
*   **Event-Driven Sync**: Any action in the main window—playing/pausing, changing settings, editing the script, or a new scroll position from voice control—posts a message to the channel. The presenter window listens for these messages and updates its display instantly.

#### 7. AI-Powered Voice Control
The voice control feature is an advanced AI system that interprets user speech for one of three purposes: command execution, script editing, or pace tracking.
*   **Command-First Architecture**: The application sends audio snippets to a Genkit AI flow (`controlTeleprompter`). This flow is prompted to first check for specific verbal commands (e.g., "next slide," "pause") or editing commands (e.g., "change this to that"). Commands are given top priority.
*   **Fallback to Pace Tracking**: If the AI determines the user is not giving a command, it treats the audio as script reading. It then performs the pace-tracking function: it returns both an `adjustedScrollSpeed` based on the user's reading pace and the `lastSpokenWordIndex` to keep the prompter perfectly synchronized.
*   **State-Aware Logic**: The flow is also sent the current state of the prompter (e.g., `isPlaying`, `prompterMode`, `currentSlideIndex`), allowing it to make intelligent decisions based on context. For example, "next slide" only has an effect if `prompterMode` is 'slides'.
*   **Embedded Cue Detection**: The frontend logic works with the pace tracking to identify when the user reads past a special cue in the speaker notes (e.g., `[PLAY VIDEO #]` or `[PAUSE # SECONDS]`). When this happens, it pauses scrolling and initiates a countdown timer, providing a seamless transition for the presenter.

#### 8. Smooth, Time-Based Scrolling Animation
To ensure a fluid teleprompter experience, the scrolling is driven by a custom animation loop.
*   **`requestAnimationFrame`**: This browser API synchronizes animations with the display's refresh rate, preventing stuttering.
*   **Time-Based Calculation**: The scroll speed is calculated based on the actual time elapsed between frames (`deltaTime`). This ensures that the scrolling speed remains consistent regardless of device performance.
