# AgileFlow: Design System & UI Patterns

This document outlines the established UI patterns and design choices that ensure a consistent and intuitive user experience across the AgileFlow application. These patterns serve as a guide for both current and future development.

## Core UI Patterns

---

### 1. Card & Content Padding
The application favors a compact, information-dense layout. Card components are the primary building block for displaying content.

-   **Gold Standard**: The login form (`/login`) serves as the ideal example of "perfect" padding. It has a larger header area and tighter content padding (`p-2`) which makes the card feel like a single, cohesive unit.
-   **Global Default**: To align with this, the global default `CardContent` padding has been reduced from `p-6` to a tighter `p-4`. This affects all cards in the app, creating a more consistent look.
-   **Contextual Overrides**: Specific components may use even tighter padding (like `p-2` or `p-0` for lists and grids) when it enhances clarity and aligns with the compact design philosophy.

---

### 2. Inline Editor
This pattern allows for seamless, direct text editing within the main application layout, avoiding disruptive dialog boxes or popovers for simple text changes.

- **Trigger:** Clicking directly on a text element (e.g., a section title, a badge name, a phone number).
- **Interaction:**
    - The text element transforms into an input field.
    - The input field must be styled to perfectly match the font, size, weight, and color of the original text element it replaces.
    - **Crucially, the input must have a transparent background and no borders or box-shadow**, ensuring it blends seamlessly into the UI.
- **Behavior:**
    - Typing modifies the text value.
    - Pressing 'Enter' saves the changes and reverts the input back to a standard text element.
    - Pressing 'Escape' cancels the edit without saving.
    - **A `useEffect` hook must be implemented to add a 'mousedown' event listener to the document. This listener should check if the click occurred outside the input field's ref and, if so, trigger the save function. This ensures that clicking anywhere else on the page correctly dismisses and saves the editor.**
- **Application:** Used for editing entity names, labels, and other simple text fields directly in the UI.

---

### 3. Compact Search Input
This pattern provides a clean, minimal interface for search functionality, especially in UIs where space is a consideration or a full search bar is not always needed.

- **Trigger:** Clicking a search icon (`search`).
- **Interaction:**
  - The search icon is replaced by an inline search input field, with the search icon now appearing inside the input's bounds to maintain context.
  - The input field appears with a transparent background and no borders or box-shadow, to maintain a minimal, "inline text" look.
  - The input field automatically gains focus.
- **Behavior:**
  - Typing into the field filters the relevant content on the page in real-time.
  - Clicking outside the input (`onBlur`) when it is empty will cause it to revert back to the simple search icon. If the field contains text, it remains visible.
- **Application:** Used for filtering lists of icons, users, or other filterable content within popovers and other compact spaces.

---

### 4. Text-based Inputs
This pattern transforms standard form inputs into minimalist, text-like elements, creating a cleaner and more compact interface. It is primarily used for authentication forms.

-   **Appearance**:
    -   Initially, the input appears as plain text (a placeholder, like "Email" or "Password") next to an icon. It has no visible border or background.
    -   It uses a muted color to indicate it's an interactive, but unfocused, element.
-   **Interaction**:
    -   Clicking on the text or icon transforms the element into a live input field.
    -   The icon remains visible, and the placeholder text is replaced by the user's cursor.
    -   The input field itself remains borderless and transparent to maintain the clean aesthetic.
-   **Behavior**:
    -   Standard input behavior applies once focused.
    -   Pressing 'Enter' or 'Tab' in one field (e.g., Email) should seamlessly transition focus to the next logical field (e.g., Password) without requiring an extra click.
    -   Losing focus (`onBlur`) without entering any text will revert the element to its initial placeholder state.
-   **Application**: Used for the login and sign-up forms to create a more modern and less cluttered user experience.

---

### 5. Integrated Add Button
This pattern replaces large, card-style "Add New" buttons with a more compact and contextually relevant control.

- **Appearance:** A circular button containing a plus (`+`) or `add_circle` icon.
- **Placement:** Positioned directly adjacent to the title of the section or list it pertains to.
- **Behavior:** Clicking the button initiates the process of adding a new item, typically by opening a dialog or form.
- **Application:** Used for creating new items in a list or grid, such as adding a new team, priority strategy, or a badge to a collection.

---

### 6. Icon & Color Editing Flow
This is the consistent reference pattern for allowing a user to change both an icon and its color.

- **Trigger:** A single, interactive unit composed of a primary icon button and a smaller color swatch badge overlaid on its corner.
- **Interaction:**
  - Clicking the main part of the button opens an icon picker popover. This popover uses the **Compact Search Input** pattern for filtering.
  - Clicking the color swatch badge opens a color picker popover.
- **Application:** Used for editing team icons/colors, admin group icons/colors, and page icons/colors.

---

### 7. Entity Sharing & Linking
This pattern describes how a single entity (like a Badge or BadgeCollection) can exist in multiple contexts while maintaining a single source of truth.

- **Mechanism**: Sharing is controlled at the `BadgeCollection` level. An owner of a collection can click a "Share" icon (`share`) in the card's menu or drag the collection card onto the "Shared Collections" side panel to make it globally available. This action makes the original collection and its badges visible in the shared panel for all other teams. From this panel, other teams can:
    - **Link the entire collection**: Dragging the collection's card from the panel to their main board adds a *link* to that collection to their team. This does not create a copy; it's a pointer to the original shared collection.
    - **Link individual badges**: Dragging a single badge from a shared collection (either in the panel or from a linked collection on their board) and dropping it into one of their *owned* collections creates a link to that specific badge.
- **Visual Cues**:
  - **Owned & Shared Externally (`upload`)**: An item created by the current team that has been explicitly shared with other teams is marked with an `upload` icon overlay. This indicates it is the "source of truth." **The color of this icon badge matches the owner team's color.**
  - **Internally Linked (`change_circle`)**: An item that is used in multiple places within the *same* team (e.g., a badge appearing in two collections) is marked with a `change_circle` icon overlay on its linked instances. The original instance does not get this icon unless it is also shared externally. **The color of this icon badge matches the owner team's color.**
  - **Shared-to-You (`downloading`)**: An item created in another team and being used in the current context is marked with a `downloading` icon overlay. **The color of this icon badge matches the source team's color.**
  - **Owned and Not Shared/Linked**: An item that is owned and exists only in its original location does not get an icon.
- **Behavior**:
  - Editing a shared item (e.g., changing a badge's name or icon) modifies the original "source of truth" item, and the changes are instantly reflected in all other places where it is used.
  - **Smart Deletion**: Deleting an item follows contextual rules:
    - Deleting a *shared-to-you* or *internally linked* instance only removes that specific link/instance. The original remains untouched. This is a low-risk action confirmed via a `Compact Action Dialog`.
    - Deleting the *original, shared* item (i.e., an item that is currently linked elsewhere) will trigger a high-risk `AlertDialog` to prevent accidental removal of a widely-used resource.
    - Deleting an *original, un-shared* item is a low-risk action confirmed via a `Compact Action Dialog`.
- **Application**: Used for sharing Badges and Badge Collections between Teams.

---

### 8. Draggable Card Management (The Gold Standard)
This is the application's perfected, gold-standard pattern for managing a collection of entities displayed as cards. It provides a fluid, intuitive, and grid-responsive way for users to reorder and duplicate items.

-   **Layout**: Entities are presented in a responsive grid of cards (`<Card>`).
-   **Draggable & Pinned States**:
    -   **Draggable Cards**: Most cards can be freely reordered within the grid.
    -   **Pinned Cards**: Certain cards are designated as "pinned" and cannot be dragged. They act as fixed anchors in the layout.
-   **Reordering with Guardrails**:
    -   **Interaction**: Users can drag any non-pinned card and drop it between other non-pinned cards to change its order. The grid reflows smoothly to show the drop position.
    -   **Top Guardrail**: If a card is dropped *before* the first pinned item, it is automatically repositioned to be *after* it.
    -   **Bottom Guardrail**: If a card is dropped *after* the last pinned item, it is automatically repositioned to be *before* it. This ensures the integrity of the pinned items.
-   **Drop Zone Highlighting**: Drop zones provide visual feedback when an item is dragged over them. To maintain a clean UI, highlights primarily use rings without background fills.
    -   **Standard & Duplication Zones (Reordering, Moving, Duplicating):** The drop area is highlighted with a `1px` inset, **colorless** ring using the standard border color (`ring-1 ring-border ring-inset`). This is the universal style for all non-destructive drop actions.
    -   **Destructive Zones (Deleting):** The drop area is highlighted with a `1px` ring in the destructive theme color (`ring-1 ring-destructive`).
-   **Drag-to-Duplicate**:
    -   **Interaction**: A designated "Add New" icon (`<Button>`) acts as a drop zone. While a card is being dragged, this zone becomes highlighted to indicate it can accept a drop.
    -   **Behavior**: Dropping any card (pinned or not) onto this zone creates a deep, independent copy of the original. The new card is given a unique ID, a modified name (e.g., with `(Copy)`), and is placed immediately after the original in the list.
-   **Layout Stability**: To prevent "janky" or shifting layouts during a drag operation (especially when dragging an item out of one card and over another), ensure that the container cards (e.g., `TeamCard`) maintain a consistent height. This can be achieved by using `flexbox` properties (e.g., `h-full` on the card and `flex-grow` on its main content area) to make the content container fill the available space, even when a draggable item is temporarily removed from the layout.
-   **Application**: This is the required pattern for managing Pages, Calendars, and Teams.

---

### 9. Compact Action Dialog
This is a minimalist dialog for focused actions, such as entering a code or a short piece of information, or for low-risk confirmations where a full-screen modal is unnecessary.

- **Component**: Uses the standard `<Dialog>` component, which allows the user to dismiss the action by clicking the overlay or pressing 'Escape'.
- **Appearance**:
    - No footer buttons ("Cancel", "Save").
    - The primary action (e.g., Save, Verify, Delete) is represented by a single, icon-only button (e.g., `<GoogleSymbol name="check" />`) positioned in the top-right corner of the dialog content.
    - The content is focused and minimal, often using other compact patterns like "Text-based Inputs" for a clean interface.
- **Behavior**:
    - Clicking the action icon in the corner performs the primary action (e.g., saves or verifies the input).
    - Clicking the overlay dismisses the dialog without performing the action.
- **Application**: Used for Two-Factor Authentication, quick edits, simple forms, and for confirming lower-risk destructive actions, such as deleting a **Page**, an **Admin Group**, a **Team**, or an un-shared **Badge Collection**.

---

### 10. Compact Deletion Dialog
When a **high-risk destructive action** requires user confirmation (like deleting a **Calendar** or a shared **Badge Collection**), the standard `AlertDialog` component is used. This is distinct from the `Compact Action Dialog` as it is intentionally more difficult to dismiss.

- **Appearance**: A modal dialog centered on the screen, overlaying the content.
- **Interaction**:
    - The dialog contains a clear title, a description of the consequences, and explicit "Cancel" and "Continue" (or similar) buttons in the footer.
    - The "Continue" button for the destructive action is styled with the `destructive` variant to draw attention.
- **Behavior**: Clicking "Cancel" closes the dialog with no action taken. Clicking "Continue" performs the destructive action. This dialog **cannot** be dismissed by clicking the overlay, forcing an explicit choice.
- **Application**: Used for confirming the deletion of **major entities** where accidental dismissal could be problematic, such as Calendars or shared Badge Collections.

---

### 11. Icon Tabs for Page Navigation
- **Description**: For primary navigation within a page (e.g., switching between "Admin Groups" and "Pages" on the Admin Management screen), tabs should be clear, full-width, and provide strong visual cues.
- **Appearance**:
  - Each tab trigger includes both an icon and a text label.
  - The icon is visually aligned with the text and uses the default text color.
  - The active tab is indicated by colored text (`text-primary`).
  - The entire tab list has a subtle divider underneath it, separating it from the content below.
- **Application**: Used for all main page-level tab navigation, such as on the Admin, Service Delivery, and Team Management pages.

---

### 12. Seamless Single-Tab Pages

- **Description**: This pattern ensures a streamlined user experience for pages that contain only a single content tab. Instead of displaying a redundant page header *and* a tab header, the tab's content becomes the page itself.
- **Behavior**:
  - When a page is configured with exactly one associated tab, the main page layout does not render its own title or icon.
  - The single tab's component is rendered directly within the main content area.
  - The tab's component is responsible for displaying the page's title and icon, effectively promoting its header to become the page's header.
- **Application**: Applied automatically to any page in the dynamic routing system (`/dashboard/[...page]`) that meets the single-tab condition. This creates a more integrated and less cluttered UI.

## Visual & Theming Elements

### Icons & Hover Effects

- **Icon Set**: We exclusively use **Google Material Symbols** via the `<GoogleSymbol />` component. This ensures a consistent visual language. The font library is a variable font, which means we can adjust its properties.
- **Icon Styles**: The application loads the `Outlined`, `Rounded`, and `Sharp` styles from Google's library. You can specify which one to use with the `variant` prop. The `Outlined` style is the default.
  - `<GoogleSymbol name="star" variant="rounded" />`
  - `<GoogleSymbol name="star" variant="sharp" />`
- **Filled Icons**: To use the filled style of an icon, pass the `filled` prop to the component: `<GoogleSymbol name="star" filled />`. This works with any of the three main styles.
- **Hover Behavior**: The color of icons on hover is typically determined by their parent element. For example, an icon inside a `<Button variant="ghost">` will change to the primary theme color on hover because the button's text color changes, and the icon inherits that color. This creates a clean and predictable interaction.
- **Destructive Actions**: Delete or other destructive action icons (like `delete`, `close`, `cancel`) are `text-muted-foreground` by default and become `text-destructive` on hover to provide a clear but not overwhelming visual warning.
- **Tooltips for Clarity**: Icon-only buttons (those without visible text) must always be wrapped in a `<Tooltip>` to provide context on their function. This is crucial for accessibility and user experience.

### Theming & Button Styles

- **Theme Selection**: Users can choose between `light` and `dark` themes. This selection is presented as a set of tab-like buttons, each with an icon and a label. The active theme's button has its text and icon colored with the primary theme color.
- **Custom Primary Color**: Users can select a custom primary color using a color picker popover, which is triggered by a ghost-style palette icon button. This custom color overrides the theme's default primary color.
- **Primary Button Gradient**: Primary buttons have a special gradient effect on hover, which is unique to each theme. This provides a subtle but polished visual feedback for key actions.
- **Text-based Button Hover**: For text-based buttons (like those on the login page), the hover and focus state is indicated *only* by the text color changing to the primary theme color. No background color is applied.

### Global Focus & Highlight Style
This is the single source of truth for indicating user interaction state across the entire application.

-   **Keyboard Focus (`focus-visible`)**: All interactive elements (buttons, inputs, checkboxes, custom cards, etc.) share a consistent focus indicator. When an element is focused via keyboard navigation, a subtle, `1px` ring with 50% opacity appears directly on its border (`focus-visible:ring-1 focus-visible:ring-ring/50`). This provides a clean, minimal, and non-intrusive focus indicator that aligns with the app's elegant aesthetic.
-   **Selected/Highlighted State**: To indicate a persistently selected or highlighted state (e.g., the designated "Group Admin" in a list), a similar `1px` ring is used, but with the primary theme color (`ring-1 ring-primary`). This creates a clear visual connection between the temporary focus state and the persistent selected state.

### List Item States (Dropdowns & Popovers)
- **Hover & Focus**: When hovering over or navigating to list items (like in dropdowns or popovers) using the keyboard, the item's text color changes to `text-primary`. **No background highlight is applied**, ensuring a clean and consistent look across the application.
- **Selection**: The currently selected item within a list is indicated by a checkmark icon, which also uses the `primary` color.

### User Notifications

- **Toaster Notifications**: Used for providing brief, non-blocking feedback for user actions (e.g., "Badge Deleted").
    - **Appearance**: Simple, clean, and without a close button. They have a `cursor-pointer` style to indicate they can be dismissed.
    - **Behavior**:
        - Automatically dismisses after a short period (e.g., 2 seconds).
        - Can be dismissed instantly by clicking anywhere on the notification.

### Subtle Visual Cues

- **Lunch Break Pattern**: A subtle diagonal line pattern is used in calendar views to visually block out the typical lunch period (12:00 - 14:30). This serves as a non-intrusive reminder to avoid scheduling meetings during that time.
- **Icon as Badge**: An icon displayed as a small, circular overlay on another element (e.g., an Avatar or another icon) to provide secondary information. The size of the icon within the badge should be large enough to be clearly identifiable while fitting neatly within its container.
    - **Appearance**: A circular badge (e.g., `h-5 w-5`) with a `border-2` of the parent element's background color (e.g., `border-card` or `border-background`) to create a "punched out" effect. The icon inside should be sized appropriately (e.g., `font-size: 14px` or similar, depending on container).
    - **Placement**: Typically positioned on the bottom-right or top-right corner of the parent element.
    - **Application**: Used for displaying a user's admin group on their avatar, a shared group status on a role icon, or a `share` icon on a shared Badge.
