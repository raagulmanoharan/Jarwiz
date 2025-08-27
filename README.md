# Jarwiz

A modern infinite canvas drawing application built with TLdraw SDK, featuring a clean and intuitive interface.

## Features

- **Infinite Canvas** - Unlimited drawing space powered by TLdraw
- **Custom UI** - Clean, minimal interface with JARWIZ branding
- **Smart Input** - Expandable ask input with spacebar shortcut activation
- **YouTube Embedding** - Paste YouTube URLs to create movable video players on canvas
- **Excel Table Cards** - Paste Excel files to create beautiful, paginated table cards with progressive loading
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

4. **Try media embedding**
   - Copy any YouTube URL and paste it on the canvas to create a video player
   - Simply drag & drop Excel files (.xlsx, .xls) onto the canvas for instant table cards
   - Or copy/paste Excel files for the same result

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

### YouTube Embedding
- **Paste YouTube URLs** anywhere on the canvas to create embedded video players
- **Supported formats**: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
- **Interactive players**: Videos can be played, paused, and controlled directly on canvas
- **Movable and resizable**: Video players can be repositioned and resized like any other shape
- **Auto-detection**: URLs are automatically recognized and converted to embedded players

### Excel Table Cards
- **Drag & drop or paste Excel files** (.xlsx, .xls, .xlsm) to create interactive table cards
- **Simple drag & drop**: No overlays or visual indicators - just drop files directly on canvas
- **Smart positioning**: Tables appear exactly where you drop the file
- **Progressive loading**: Tables appear immediately and data loads incrementally for smooth UX
- **Smart pagination**: Large datasets automatically split into navigable pages
- **File information**: Shows file name, size, and current page position
- **Fully interactive**: Sort, scroll, and navigate through data directly on canvas
- **Responsive design**: Tables adapt to different screen sizes and data volumes
- **Movable and resizable**: Position and resize table cards anywhere on the canvas

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
- `⌘ V` / `Ctrl V` - Paste (auto-detects YouTube URLs and Excel files)
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
- **SheetJS (xlsx)** - Excel file parsing and processing
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
- `main.jsx` - Main app component with TLdraw integration and custom file handlers
- `Header.jsx` - Floating header with editable title
- `AskInput.jsx` - Smart expandable input with keyboard shortcuts
- `ExcelTable.jsx` - Interactive table component with pagination
- Custom CSS files for each component with consistent design tokens

## License

MIT