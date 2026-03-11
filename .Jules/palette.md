## 2024-05-14 - Non-semantic Main Navigation

**Learning:** The application uses `<div class="nav-item">` with `onclick` handlers for its main navigation menu instead of semantic elements like `<button>` or `<a>`. This pattern lacks native keyboard accessibility (focus styles, enter/space interaction) and ARIA roles for screen readers. Given the context (a very simple PWA with entirely custom DOM interactions and no test suite), standardizing this to semantic tags might require a broader refactor of the CSS and event handling logic that exceeds the scope of small UX improvements.

**Action:** When adding or modifying interactive elements in this specific application, be aware that many existing elements may lack proper keyboard/focus states. Ensure that new interactive elements either use semantic HTML (e.g., `<button>`) with proper ARIA labels (like the close buttons updated today) or manually add `tabindex` and keyboard event listeners if mimicking this project's custom `div` interaction patterns.

## 2026-03-11 - Retrofitting Accessibility to Interactive Divs

**Learning:** When adding keyboard support (`tabindex="0"` and `keydown` listeners) to existing interactive `div` elements like the `.card` components in this app, it's critical to remember that CSS styling for keyboard focus is missing by default on non-semantic tags. Without an explicitly defined `:focus-visible` state, the interface appears broken to keyboard users as they tab through. Also, custom `keydown` listeners must explicitly handle both `Enter` and `Space` keys and call `e.preventDefault()` to mimic native button behavior accurately and prevent unwanted page scrolling when using the `Space` bar.

**Action:** When making custom `div` elements interactive, always implement a "holy trinity" of a11y: 1) `tabindex="0"`, 2) `keydown` event listener for Enter/Space with `e.preventDefault()`, and 3) explicit `:focus-visible` styling in the CSS.
