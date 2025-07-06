# AutoScroll Teleprompter: User Manual & Design Guide

This document provides a complete guide to the features, design patterns, and functionality of the AutoScroll Teleprompter application.

## 1. User Manual: How to Use the App

This guide will walk you through all the features of the AutoScroll Teleprompter.

### Getting Started

*   **Pasting Your Script**: The primary way to get your text into the prompter is by using the **Script Editor** at the bottom of the screen. Simply click into the text area and paste or type your script. The prompter display will update in real-time.
*   **Importing from Google (Coming Soon)**: You can sign in with your Google account to enable import options from Google Docs, Slides, and Sheets. This feature is currently under development.

### Main Controls

Located in the top-left of the control panel:

*   **Sign In / Import**:
    *   If you are not signed in, this button allows you to sign in with Google.
    *   Once signed in, this button becomes an "Import" dropdown, providing options to import scripts from your Google Drive.
*   **Play / Pause Button**:
    *   Press **Play** to start the teleprompter. This will automatically switch the prompter to full-screen mode for an immersive experience.
    *   Press **Pause** to stop the scrolling.

### Display & Functionality Toggles

These are icon-based buttons in the control panel. Their color changes when active, and you can hover over them to see a tooltip explaining their function.

*   **Voice Control (Mic Icon)**: When enabled (on by default), the app listens to your voice and automatically adjusts the scrolling speed to match your reading pace. If you pause, the scrolling slows down or stops. If you speak faster, it speeds up. When disabled, you must control the speed manually with the slider.
*   **High Contrast (Contrast Icon)**: Toggles the display between standard mode (black text on a light background) and high-contrast mode (white text on a black background). It is on by default for maximum readability.
*   **Flip Horizontal (ArrowLeftRight Icon)**: Mirrors the prompter text horizontally. This is essential for use with physical teleprompter hardware that uses a mirror.
*   **Flip Vertical (ArrowUpDown Icon)**: Flips the prompter text vertically.
*   **Full Screen (Maximize/Minimize Icon)**: Located in the bottom-right corner of the prompter area. This button manually toggles the full-screen view. Note that pressing "Play" also automatically enters full-screen. Pressing the 'Escape' key will exit full-screen mode.

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

*   **Maximized Prompter Space**: The layout prioritizes the prompter display area. Controls are condensed into a narrow side panel, and the script editor is placed at the bottom to not interfere with the primary view.
*   **Independent Scrolling**: The "Controls & Settings" panel can scroll independently from the main content, ensuring all controls are accessible regardless of screen height.
*   **Responsive Design**: The layout adapts gracefully to different screen sizes.

### Core UI Patterns

#### 1. Compact, Icon-Driven Control Panel
The left-hand control panel is designed to be narrow and unobtrusive.
*   **Icons as Controls**: Toggles and slider identifiers are represented by icons. This saves space and creates a clean, modern aesthetic.
*   **Tooltips for Clarity**: To ensure usability, all icon-only buttons are wrapped in a `<Tooltip>`. Hovering over an icon reveals its function and, for sliders, its current value.
*   **Vertical Sliders**: Sliders are oriented vertically to fit the narrow panel. This is achieved by applying `orientation="vertical"` to the component and ensuring the component's CSS supports it.

#### 2. Popovers for Precise Input
To allow users to input exact numeric values for sliders without using a disruptive modal:
*   **Trigger**: Clicking the icon associated with a slider.
*   **Component**: A lightweight `<Popover>` is used instead of a `<Dialog>`.
*   **Interaction**: The popover appears next to the icon, containing a single number input. It has no header or buttons.
*   **Behavior**: The popover is dismissed and the value is saved when the user presses 'Enter' or clicks anywhere outside the popover's bounds. This creates a seamless and low-friction editing experience.

#### 3. Centered & Responsive Prompter Area
The main prompter display is engineered to be robust and flexible.
*   **True Centering**: The text content is always centered horizontally and vertically within the bounds defined by the margin sliders. This is achieved using a flexbox container (`flex items-center justify-center`) on the parent and `m-auto` on the text block itself.
*   **Dynamic Margins**: The horizontal and vertical margin sliders dynamically adjust the `padding` of the container, effectively controlling the size of the text area while maintaining centering.
*   **Rounded Corners**: When not in full-screen mode, the prompter area has rounded corners (`rounded-lg`) to visually separate it from the rest of the UI.
*   **Seamless Full-Screen**:
    *   Full-screen mode is triggered automatically on "Play" or manually via the dedicated button.
    *   In full-screen mode, the prompter area expands to fill the entire viewport, and its borders/rounding are removed for a completely immersive view.
    *   The full-screen button's style adapts to high-contrast mode (changing from a ghost style to solid black) to ensure it is always visible.

#### 4. Minimalist Script Editor
The script editor at the bottom of the screen is intentionally minimalist.
*   **Headerless Design**: The `<CardHeader>` and `<CardTitle>` have been removed to maximize the vertical space available for the `<Textarea>`.
*   **Full-Width Layout**: It spans the entire width of the application window, providing an ample and comfortable area for script editing.
*   **Clean Integration**: By removing the outer `<Card>` border and background, the `<Textarea>` component integrates directly into the main application background, feeling less like a separate widget and more like a core part of the layout.

#### 5. Smooth, Time-Based Scrolling Animation
To ensure a fluid and professional teleprompter experience, the scrolling is driven by a custom animation loop.
*   **`requestAnimationFrame`**: The application uses `requestAnimationFrame` for all scrolling animations. This is a browser API specifically designed for creating smooth, efficient animations that are synchronized with the display's refresh rate, which prevents stuttering and tearing.
*   **Time-Based Calculation**: The scroll speed is not based on fixed pixel increments per frame. Instead, it is calculated based on the actual time elapsed between frames (`deltaTime`). This ensures that the scrolling speed remains consistent and accurate, regardless of the device's performance or screen refresh rate.
*   **Independent of CSS**: The animation logic is handled entirely in JavaScript, avoiding conflicts with CSS properties like `scroll-behavior: smooth`. This gives us precise programmatic control over the scrolling, allowing for real-time speed adjustments from the slider without any visual glitches.
