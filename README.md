# Jarwiz

A modern infinite canvas drawing application built with TLdraw SDK, featuring a clean and intuitive interface.

## Features

- **Infinite Canvas** - Unlimited drawing space powered by TLdraw
- **Custom UI** - Clean, minimal interface with JARWIZ branding
- **Smart Input** - Expandable ask input with spacebar shortcut activation
- **Zoom Controls** - Custom zoom controls positioned at bottom-left
- **Editable Board Title** - Click to rename your board inline
- **Consistent Design** - Poppins font, rounded corners, and cohesive styling

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:5173`

## UI Components

### Header
- **JARWIZ** branding on the left
- **Editable board title** in the center (click to edit)
- Positioned at top-left with 16px padding

### Ask Input
- **Collapsed state**: Shows "Ask Jarwiz anything..." with spacebar shortcut hint
- **Expanded state**: Full-width input with send button
- **Keyboard shortcut**: Press `Space` to expand (when not typing)
- Positioned at bottom-center

### Zoom Controls
- **Zoom in/out** buttons with percentage display
- **Zoom menu** with keyboard shortcuts (click percentage)
- Positioned at bottom-left
- Matches canvas background color (#EFEFEF)

## Keyboard Shortcuts

- `Space` - Expand ask input
- `⌘ +` / `⌘ =` - Zoom in
- `⌘ -` - Zoom out
- `⇧ 0` - Zoom to 100%
- `⇧ 1` - Zoom to fit
- `⇧ 2` - Zoom to selection
- `Enter` - Submit ask input

## Design System

- **Font**: Poppins (400, 500, 600 weights)
- **Text Color**: #202020
- **Canvas Background**: #EFEFEF
- **Border Radius**: 12px
- **Padding**: 16px system-wide
- **Component Height**: 44px (header, input), dynamic (zoom controls)

## Tech Stack

- **React 19** - UI framework
- **TLdraw** - Infinite canvas and drawing engine
- **Vite** - Build tool and development server
- **CSS3** - Custom styling with modern features

## Project Structure

```
src/
├── main.jsx           # App entry point and TLdraw setup
├── Header.jsx         # Top header with branding and title
├── AskInput.jsx       # Bottom expandable input component
├── header.css         # Header styling
├── ask-input.css      # Ask input styling
├── custom-navigation.css # Zoom controls and canvas styling
├── index.html         # HTML template
└── package.json       # Dependencies and scripts
```

## Development

The app uses Vite for fast development and hot module replacement. All UI components are built as separate modules for maintainability.

### Key Files
- `main.jsx` - Main app component with TLdraw integration
- `Header.jsx` - Floating header with editable title
- `AskInput.jsx` - Smart expandable input with keyboard shortcuts
- Custom CSS files for each component with consistent design tokens

## License

MIT