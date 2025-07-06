
### 1. Card & Content Padding
The application favors a compact, information-dense layout. Card components are the primary building block for displaying content.

-   **Gold Standard**: The login form (`/login`) serves as the ideal example of "perfect" padding. It has a larger header area and tighter content padding (`p-2`) which makes the card feel like a single, cohesive unit.
-   **Global Default**: To align with this, the global default `CardContent` padding has been reduced from `p-6` to a tighter `p-4`. This affects all cards in the app, creating a more consistent look.
-   **Card Backgrounds**: Cards use a `bg-transparent` background, relying on their `border` for definition. This creates a lighter, more modern UI.
-   **Text Wrapping**: Card titles and descriptions should gracefully handle long text by wrapping. The `break-words` utility should be used on titles to prevent layout issues from long, unbroken strings.

---

### 2. Inline Editor
This pattern allows for seamless, direct text editing within the main application layout, avoiding disruptive dialog boxes or popovers for simple text changes.

- **Trigger:** Clicking directly on a text element (e.g., a section title, a badge name, a phone number).
- **Interaction:**
    - The text element transforms into an input field.
    - The input field must be styled to perfectly match the font, size, weight, and color of the original text element it replaces (e.g., using the `font-headline font-thin` classes).
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

- **Interaction:**
  - The search input field is always present within its container (e.g., a popover) but may be visually understated.
  - The input field appears with a transparent background and no borders or box-shadow, to maintain a minimal, "inline text" look.
- **Behavior:**
  - The input field **must** automatically gain focus as soon as its parent popover or container becomes visible. This is achieved using a `useEffect` hook that triggers `searchInputRef.current?.focus()` after a short `setTimeout` (e.g., 100ms) to ensure the element is rendered and ready.
  - Typing into the field filters the relevant content on the page in real-time.
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

- **Appearance:** A circular button containing a plus (`+`) or `add_circle` icon. It uses `text-4xl` and `weight={100}` for a large but light appearance.
- **Placement:** Positioned directly adjacent to the title of the section or list it pertains to.
- **Behavior:** Clicking the button initiates the process of adding a new item, typically by opening a dialog or form.
- **Application:** Used for creating new items in a list or grid, such as adding a new team, priority strategy, or a badge to a collection.

---

### 6. Icon & Color Editing Flow
This is the consistent reference pattern for allowing a user to change both an icon and its color.

- **Trigger:** A single, interactive unit composed of a primary icon button and a smaller color swatch badge overlaid on its corner.
- **Interaction:**
  - Clicking the main part of the button opens an icon picker popover. This popover uses the **Compact Search Input** pattern for filtering. The icons inside this picker are rendered at `text-4xl` with a `weight={100}` inside `h-8 w-8` buttons for clarity and ease of selection.
  - Clicking the color swatch badge opens a color picker popover.
- **Application:** Used for editing team icons/colors, admin group icons/colors, and page icons/colors.

---

### 7. Entity Sharing & Linking
This pattern describes how a single entity (like a Badge or BadgeCollection) can exist in multiple contexts while maintaining a single source of truth.

- **Mechanism**: Sharing is controlled at the `BadgeCollection` level. An owner of a collection can perform one of two actions to make it globally available:
    1.  Select "Share Collection" from the card's dropdown menu.
    2.  Drag the owned collection card and drop it onto the "Shared Collections" side panel.
- **Linking**: Once shared, a collection appears in the side panel for all other teams. From this panel, other teams can:
    - **Link the entire collection**: Dragging the collection's card from the panel to their main board adds a *link* to that collection to their team. This is a pointer, not a copy.
    - **Link individual badges**: Dragging a single badge from a shared collection (either in the panel or on their board) and dropping it into one of their *owned* collections creates a link to that specific badge.
- **Visual Cues**:
  - **Owned & Shared Externally (`upload`)**: An item created by the current team that has been explicitly shared with other teams is marked with an `upload` icon overlay. This indicates it is the "source of truth." **The color of this icon badge matches the owner team's color.**
  - **Internally Linked (`change_circle`)**: An item that is used in multiple places within the *same* team (e.g., a badge appearing in two collections) is marked with a `change_circle` icon overlay on its linked instances. The original instance does not get this icon unless it is also shared externally. **The color of this icon badge matches the owner team's color.**
  - **Shared-to-You (`downloading`)**: An item created in another team and being used in the current context is marked with a `downloading` icon overlay. **The color of this icon badge matches the source team's color.**
  - **Owned and Not Shared/Linked**: An item that is owned and exists only in its original location does not get an icon.
- **Behavior**:
  - Editing a shared item (e.g., changing a badge's name or icon) modifies the original "source of truth" item, and the changes are instantly reflected in all other places where it is used.
  - **Local Overrides**: The `applications` for a linked collection (e.g., "Team Members", "Events") can be modified locally without affecting the original, allowing teams to customize how they use a shared resource. These associated application icons are located in the `BadgeCollection` card header, above the description.
  - **Smart Deletion**: Deleting an item follows contextual rules:
    - Deleting a *shared-to-you* or *internally linked* instance only removes that specific link/instance. This is a low-risk action confirmed via a `Compact Action Dialog`.
    - Deleting the *original, shared* item (i.e., an item that is currently linked elsewhere) will trigger a high-risk `AlertDialog` to prevent accidental removal of a widely-used resource.
    - Deleting an *original, un-shared* item is a low-risk action confirmed via a `Compact Action Dialog`.
- **Application**: Used for sharing Badges and Badge Collections between Teams.

---

### 8. Draggable Card Management (The Gold Standard)
This is the application's perfected, gold-standard pattern for managing a collection of entities displayed as cards. It provides a fluid, intuitive, and grid-responsive way for users to reorder and duplicate items.

-   **Layout**: Entities are presented in a responsive grid of cards. To ensure stability during drag operations, especially across multiple rows, the container must use a `flex flex-wrap` layout instead of CSS Grid. Each draggable card item is then given `flex-grow` and `basis` properties to create the responsive columns (e.g., `flex-grow basis-full md:basis-[calc(50%-1.5rem)]`).
-   **Internal Card Layout**: Each card is structured for clarity. The header contains the primary entity identifier (icon and name) and contextual controls (like page access or tab associations, which are positioned inline after the title). The main content area is used for tertiary information (like a URL path) which is anchored to the bottom.
-   **User Item Display**: When users are displayed as items within a management card (e.g., `AdminGroupCard` or `TeamCard`), they are presented **without a border**. Each user item must display their avatar, full name, and professional title underneath the name for consistency.
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
-   **Contextual Hover Actions**: To maintain a clean default UI, action icons like "Remove User" or "Delete Group" must appear only when hovering over their specific context.
    - **Item-level**: A "remove" or "cancel" icon appears in the top-right corner of a list item (e.g., a user card) *only* when the user hovers over that specific item.
    - **Card-level**: A "delete" icon appears in the top-right corner of the main card's header *only* when the user hovers over the header area or the card's general background.
-   **Drag-to-Duplicate**:
    -   **Interaction**: A designated "Add New" icon (`<Button>`) acts as a drop zone. While a card is being dragged, this zone becomes highlighted to indicate it can accept a drop.
    -   **Behavior**: Dropping any card (pinned or not) onto this zone creates a deep, independent copy of the original. The new card is given a unique ID, a modified name (e.g., with `(Copy)`), and is placed immediately after the original in the list.
-   **Layout Stability**: To prevent "janky" or shifting layouts during a drag operation (especially when dragging an item out of one card and over another), ensure that the container cards (e.g., `TeamCard`) maintain a consistent height. This can be achieved by using `flexbox` properties (e.g., `h-full` on the card and `flex-grow` on its main content area) to make the content container fill the available space, even when a draggable item is temporarily removed from the layout.
-   **Application**: This is the required pattern for managing Pages, Calendars, Teams, Admin Groups, and Tabs.

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
  - The icon is `text-4xl` with a `weight={100}` for a large but light appearance.
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

---

### 13. Responsive Header Controls
This pattern describes how a group of controls in a page header can intelligently adapt to changes in the layout, such as the opening and closing of a side panel.

- **Trigger**: Expanding or collapsing a panel that affects the main content area's width.
- **Behavior**:
  - **Grid Awareness**: The page's main content area (e.g., a card grid) dynamically adjusts the number of columns it displays to best fit the available space.
  - **Control Repositioning**: Header controls are grouped together. This entire group intelligently repositions itself to stay aligned with the edge of the content grid it controls. For example, when a right-hand panel opens, the grid shrinks, and the control group moves left to remain aligned with the grid's new right edge.
- **Application**: Used on the **Badge Management** page to keep the search and panel-toggle icons aligned with the collection grid as the "Shared Collections" panel is opened and closed.

---

### 14. Compact Badge Pills
This pattern is a specialized, ultra-compact version of the standard `<Badge>` component, used for displaying multiple badges in a dense layout, such as the "assorted" view mode in Badge Collections.

- **Appearance**: A very thin, pill-shaped badge with minimal padding. It contains a small icon and a short text label.
- **Sizing**:
    - The pill has a reduced height and horizontal padding (`py-0 px-1`).
    - The icon inside is small (e.g., `text-[9px]`).
    - The text label is also small (e.g., `text-[10px]`).
- **Interaction**: A small, circular delete button appears on hover, allowing the user to remove the badge.
- **Application**: Used in the "assorted" view of **Badge Collections** to display many badges in a compact, scannable format.

---
### 15. Team Member Badge Assignment
This pattern describes the user interface for assigning and unassigning badges to team members.
- **Layout**: Within each `TeamMemberCard`, badges are grouped visually by their parent `BadgeCollection`. Each collection is displayed with its name as a sub-header.
- **Interaction**:
    - **Click to Toggle**: A user with the correct permissions can click on any badge pill—assigned or unassigned—to toggle its state for that team member.
    - **Visual States**:
        - **Assigned Badges**: Appear with a solid, colored border and a filled background, indicating a "selected" state.
        - **Unassigned Badges**: Appear with a dashed border and a transparent background, indicating an "available" but unselected state.
- **Application**: Used on the **Team Members** tab within each team's management page.

## Visual & Theming Elements

### Typography
- **Font**: The application exclusively uses the **Roboto** font family for a clean and consistent look.
- **Headline Font**: All major titles (pages, tabs, prominent cards) use the `font-headline` utility class, which is configured to use a `font-thin` weight (`font-weight: 100`). This is also maintained during inline editing for a seamless user experience.
- **Body Font**: All standard body text, labels, and buttons now use a `font-normal` weight. All instances of `font-semibold` or `font-bold` have been removed to create a softer, more modern aesthetic.

### Icons & Hover Effects
- **Icon Set**: We exclusively use **Google Material Symbols** via the `<GoogleSymbol />` component. This ensures a consistent visual language. The font library is a variable font, which means we can adjust its properties.
- **Icon Sizing & Weight**:
  - A `weight={100}` is used for most action icons (`delete`, `edit`, `more_vert`) to maintain a light, clean aesthetic.
  - Icons inside pickers (like the icon picker) are `text-4xl` with a `weight={100}` inside `h-8 w-8` buttons for clarity and ease of selection.
  - Large, circular 'Add New' buttons use `text-4xl` with a `weight={100}` for prominence.
  - Icon picker *trigger* buttons use a large `text-12xl` icon with a `weight={100}` inside a `h-12 w-12` button.
- **Filled Icons**: To use the filled style of an icon, pass the `filled` prop to the component: `<GoogleSymbol name="star" filled />`. This works with any of the three main styles.
- **Hover Behavior**: The color of icons on hover is typically determined by their parent element. For example, an icon inside a `<Button variant="ghost">` will change to the primary theme color on hover because the button's text color changes, and the icon inherits that color. This creates a clean and predictable interaction.
- **Destructive Actions**: Delete or other destructive action icons (like `delete`, `close`, `cancel`) are `text-muted-foreground` by default and become `text-destructive` on hover to provide a clear but not overwhelming visual warning.
- **Tooltips for Clarity**: Icon-only buttons (those without visible text) and icons within pickers (like the **Icon Picker**) must always be wrapped in a `<Tooltip>` to provide context on their function. This is crucial for accessibility and user experience.

### Theming & Button Styles
- **Theme Selection**: Users can choose between `light` and `dark` themes. This selection is presented as a set of tab-like buttons, each with an icon and a label. The active theme's button has its text and icon colored with the primary theme color.
- **Custom Primary Color**: Users can select a custom primary color using a color picker popover, which is triggered by a ghost-style palette icon button. This custom color overrides the theme's default primary color.
- **Primary Button Gradient**: Primary buttons have a special gradient effect on hover, which is unique to each theme. This provides a subtle but polished visual feedback for key actions.
- **Text-based Button Hover**: For text-based buttons (like those on the login page), the hover and focus state is indicated *only* by the text color changing to the primary theme color. No background color is applied.

### Global Focus & Highlight Style
This is the single source of truth for indicating user interaction state across the entire application.

-   **Keyboard Focus (`focus-visible`)**: All interactive elements (buttons, inputs, checkboxes, custom cards, etc.) share a consistent focus indicator. When an element is focused via keyboard navigation, a subtle, `1px` ring with 50% opacity appears directly on its border (`focus-visible:ring-1 focus-visible:ring-ring/50`). This provides a clean, minimal, and non-intrusive focus indicator that aligns with the app's elegant aesthetic.
-   **Selected/Highlighted State**: To indicate a persistently selected or highlighted state (e.g., the designated "Group Admin" in a list), a clear icon badge (e.g., a "key" icon) is used, typically overlaid on the user's avatar. This avoids visually noisy outlines and provides a clear, universally understood symbol for elevated status.

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
- **Icon as Badge**: An icon displayed as a small, circular overlay on another element (e.g., an Avatar or another icon) to provide secondary information.
    - **Appearance**: A circular badge with a `border-2` of the parent element's background color (e.g., `border-background`) to create a "punched out" effect. The icon inside should be sized proportionally.
    - **Sizing**: The standard size for these badges (e.g., color-pickers, ownership status icons) is `h-4 w-4` (`16x16px`). The `GoogleSymbol` inside should be sized to fit, for example using `style={{fontSize: '10px'}}`.
    - **Placement**: Typically positioned on the bottom-right or top-right corner of the parent element.
    - **Application**: Used for displaying a user's admin group status, a shared status on a role icon, or a `share` icon on a shared Badge.
-   **Badges in Assorted View & Team Badges**: Badges in these specific views use a light font weight (`font-thin`) for their text and icons to create a cleaner, more stylized look.
