# AutoScroll Teleprompter: User Manual & Design Guide

This document provides a complete guide to the features, design patterns, and functionality of the AutoScroll Teleprompter application.

## 1. User Manual: How to Use the App

This guide will walk you through all the features of the AutoScroll Teleprompter.

### Getting Started

*   **Pasting Your Script**: The primary way to get your text into the prompter is by using the **Script Editor** at the bottom of the screen. Simply click into the text area and paste or type your script. The prompter display will update in real-time.
*   **Importing from Google**: You can sign in with your Google account to enable import options. Currently, you can import from Google Docs, with Slides and Sheets support coming soon.

### Main Controls

Located in the top-left of the control panel:

*   **Sign In / Import**:
    *   If you are not signed in, this button allows you to sign in with Google.
    *   Once signed in, this button becomes an "Import" dropdown, providing options to import scripts from your Google Drive.
*   **Play / Pause Button**:
    *   Press **Play** to start the teleprompter. This will automatically switch the prompter to full-screen mode for an immersive experience.
    *   Press **Pause** to stop the scrolling.

### Display & Functionality Toggles

These icon-based buttons give you control over the teleprompter's functionality and appearance. Their color changes when active, and you can hover over them to see a tooltip explaining their function.

#### Controls in the Side Panel
*   **Voice Control (Mic Icon)**: When enabled (on by default), the app uses an advanced, AI-powered hybrid system for a seamless hands-free experience.
    *   **Pace Matching**: It intelligently anticipates your reading speed, and the teleprompter scrolls continuously to match your pace.
    *   **Position Tracking**: Every few seconds, it also pinpoints the exact word you're saying and gently re-centers the screen, ensuring you never lose your place.
    This makes the prompter feel incredibly responsive and synchronized with your natural voice. When disabled, you must control scrolling manually with the speed slider.
*   **Presenter Mode (ScreenShare Icon)**: This button opens a clean, secondary prompter window. You can drag this window to a second monitor and make it full-screen. It stays perfectly in sync with the main window's text, settings, and scrolling.

#### Controls on the Prompter View
These controls are overlaid on the bottom-right of the prompter display area. They have a subtle shadow effect to ensure they are visible on any background.
*   **High Contrast (Contrast Icon)**: Toggles the display between standard mode (black text on a light background) and high-contrast mode (white text on a black background).
*   **Flip Horizontal (ArrowLeftRight Icon)**: Mirrors the prompter text horizontally. This is essential for use with physical teleprompter hardware that uses a mirror.
*   **Flip Vertical (ArrowUpDown Icon)**: Flips the prompter text vertically.
*   **Full Screen (Maximize/Minimize Icon)**: Manually toggles the full-screen view. Note that pressing "Play" also automatically enters full-screen. Pressing the 'Escape' key will exit full-screen mode.

### Fine-Tuning Controls (Vertical Sliders)

The control panel features four vertical sliders for precise adjustments.

*   **How to Use**:
    *   **Drag the slider handle** for quick, visual adjustments.
    *   **Hover over the icon** above the slider to see the current value in a tooltip.
    *   **Click the icon** to open a popover where you can type a precise numeric value. Press 'Enter' or click outside the popover to save.

*   **Controls**:
    *   **Scroll Speed (Gauge Icon)**: Sets the manual scrolling speed. This slider is disabled when Voice Control is active.
    *   **Font Size (TextIcon)**: Increases or decreases the size of the prompter text.
    *   **Horizontal Margin (StretchHorizontal Icon)**: Adjusts the empty space on the left and right sides of the text, making the text column narrower or wider.
    *   **Vertical Margin (StretchVertical Icon)**: Adjusts the empty space at the top and bottom of the prompter area.

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
*   **Icons as Controls**: Toggles and slider identifiers are represented by icons. This saves space and creates a clean, modern aesthetic.
*   **Tooltips for Clarity**: To ensure usability, all icon-only buttons are wrapped in a `<Tooltip>`. Hovering over an icon reveals its function and, for sliders, its current value.
*   **Vertical Sliders**: Sliders are oriented vertically to fit the panel. This is achieved by applying `orientation="vertical"` to the component and ensuring the component's CSS supports it.

#### 2. Popovers for Precise Input
To allow users to input exact numeric values for sliders without using a disruptive modal:
*   **Trigger**: Clicking the icon associated with a slider.
*   **Component**: A lightweight `<Popover>` is used instead of a `<Dialog>`.
*   **Interaction**: The popover appears next to the icon, containing a single number input. It has no header or buttons.
*   **Behavior**: The popover is dismissed and the value is saved when the user presses 'Enter' or clicks anywhere outside the popover's bounds. This creates a seamless and low-friction editing experience.

#### 3. Overlay Controls on Prompter Area
To keep essential display controls accessible without cluttering the main panel, key toggles (`High Contrast`, `Flip`, `Full Screen`) are placed as overlay buttons on the bottom-right of the prompter itself.
*   **Visibility**: These buttons have a semi-transparent style with a subtle shadow effect. Their colors adapt to high-contrast mode, ensuring they are always visible but never distracting.
*   **Grouping**: This logically groups view-manipulation controls with the view itself, creating an intuitive user experience.

#### 4. Centered & Responsive Prompter Area
The main prompter display is engineered to be robust and flexible.
*   **True Centering**: The text content is always centered horizontally and vertically within the bounds defined by the margin sliders. This is achieved using a flexbox container (`flex items-center justify-center`).
*   **Dynamic Margins**: The horizontal and vertical margin sliders dynamically adjust the `padding` of the container, effectively controlling the size of the text area while maintaining centering.
*   **Seamless Full-Screen**: In full-screen mode, the prompter area expands to fill the entire viewport, and its borders/rounding are removed for a completely immersive view.

#### 5. Minimalist Script Editor
The script editor at the bottom of the screen is intentionally minimalist.
*   **Headerless Design**: The `<CardHeader>` and `<CardTitle>` have been removed to maximize the vertical space available for the `<Textarea>`.
*   **Full-Width Layout**: It spans the entire width of the application window, providing an ample and comfortable area for script editing.
*   **Clean Integration**: By removing the outer `<Card>` border and background, the `<Textarea>` component integrates directly into the main application background, feeling less like a separate widget and more like a core part of the layout.

#### 6. Smooth, Time-Based Scrolling Animation
To ensure a fluid and professional teleprompter experience, the scrolling is driven by a custom animation loop.
*   **`requestAnimationFrame`**: The application uses `requestAnimationFrame` for all scrolling animations. This is a browser API specifically designed for creating smooth, efficient animations that are synchronized with the display's refresh rate, which prevents stuttering and tearing.
*   **Time-Based Calculation**: The scroll speed is not based on fixed pixel increments per frame. Instead, it is calculated based on the actual time elapsed between frames (`deltaTime`). This ensures that the scrolling speed remains consistent and accurate, regardless of the device's performance or screen refresh rate.
*   **Independent of CSS**: The animation logic is handled entirely in JavaScript, avoiding conflicts with CSS properties like `scroll-behavior: smooth`. This gives us precise programmatic control over the scrolling, allowing for real-time speed adjustments from the slider without any visual glitches.

#### 7. AI-Powered Voice Control
The voice control feature is a hybrid system designed for maximum responsiveness.
*   **Continuous Scrolling**: The app maintains a constant, smooth scroll based on a target speed.
*   **AI-Powered Corrections**: Every two seconds, an audio snippet of the user's voice is sent to a Genkit AI flow (`trackSpeechPosition`).
*   **Dual Output**: This AI flow returns two key pieces of information:
    1.  `adjustedScrollSpeed`: An updated scroll speed based on the user's current reading pace.
    2.  `lastSpokenWordIndex`: The precise index of the last word spoken in the script.
*   **Seamless Updates**: The application uses the `adjustedScrollSpeed` to update the continuous scrolling animation, and simultaneously performs a smooth `scrollIntoView` to re-center the prompter on the `lastSpokenWordIndex`. This dual-correction approach ensures the teleprompter is always in sync with the speaker in both speed and position.

#### 8. Real-Time Presenter Mode Sync
The second-screen "Presenter Mode" is architected for robust, real-time synchronization between the main control window and the secondary display window.
*   **`localStorage` for Initial State**: When the presenter window first opens, it immediately reads all current settings (script text, font size, margins, etc.) from `localStorage`. This ensures it isn't a blank screen and instantly mirrors the main app's state.
*   **`BroadcastChannel` for Live Updates**: After initializing, a `BroadcastChannel` is established. This modern browser API creates a direct communication line between the two windows.
*   **Event-Driven Sync**: Any action in the main window—playing/pausing, changing settings, editing the script, or most importantly, a new scroll position from voice control—posts a message to the channel. The presenter window listens for these messages and updates its display instantly, guaranteeing a perfect, real-time mirror of the main prompter.
