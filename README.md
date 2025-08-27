# Jarwiz

A modern infinite canvas drawing application built with TLdraw SDK, featuring a clean and intuitive interface.

## Features

- **Infinite Canvas** - Unlimited drawing space powered by TLdraw
- **Custom UI** - Clean, minimal interface with JARWIZ branding
- **Smart Input** - Expandable ask input with spacebar shortcut activation
- **YouTube Embedding** - Paste YouTube URLs to create movable video players on canvas
- **Excel & PDF Cards** - Drag & drop Excel and PDF files to create beautiful, paginated cards with progressive loading
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
   - Drag & drop PDF files (.pdf) onto the canvas for paginated PDF viewers
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

### Excel, CSV & Google Sheets Table Cards
- **Drag & drop table files** (.xlsx, .xls, .xlsm, .csv) or **paste Google Sheets URLs** to create interactive table cards
- **Multiple formats supported**: Excel files (all versions), CSV files, and Google Sheets (via URL)
- **Google Sheets integration**: Paste any Google Sheets sharing URL to instantly import data with smart naming
- **Simple drag & drop**: No overlays or visual indicators - just drop files directly on canvas
- **Smart positioning**: Tables appear exactly where you drop the file or paste the URL
- **Progressive loading**: Tables appear immediately and data loads incrementally for smooth UX
- **Smart pagination**: Large datasets automatically split into navigable pages
- **File information**: Shows file name, size, and current page position
- **Fully interactive**: Sort, scroll, and navigate through data directly on canvas
- **Responsive design**: Tables adapt to different screen sizes and data volumes
- **Movable and resizable**: Position and resize table cards anywhere on the canvas

### PDF Viewer Cards
- **Drag & drop PDF files** (.pdf) to create interactive PDF viewer cards
- **Multi-page support**: Navigate through PDF pages with built-in pagination controls
- **Progressive loading**: PDF appears immediately with smooth page rendering
- **File information**: Shows PDF filename, file size, and current page position
- **Auto-sizing**: PDF viewer automatically adjusts to optimal viewing size
- **Page navigation**: Previous/Next buttons with page counter display
- **High-quality rendering**: PDF.js powered rendering for crisp text and graphics
- **Error handling**: Graceful error display for corrupted or invalid PDF files
- **Consistent styling**: Matches Excel table card design with same shadow and border styling
- **Movable and resizable**: Position and resize PDF cards anywhere on the canvas

### Zoom Controls
- **Zoom in/out** buttons with percentage display
- **Zoom menu** with keyboard shortcuts (click percentage)
- Positioned at bottom-left
- Matches canvas background color (#EFEFEF)

## How to Use Google Sheets

### **📋 Step-by-Step Instructions:**

1. **Open your Google Sheet** in your browser
2. **Make it public**:
   - Click **"Share"** button (top right)
   - Click **"Change to anyone with the link"**
   - Set permission to **"Viewer"**
   - Click **"Done"**
3. **Copy the sharing URL** from your browser address bar
4. **Paste the URL** anywhere on the canvas (`⌘V` / `Ctrl+V`)
5. **Watch it transform** into a beautiful, interactive table card
6. **Navigate through data** using pagination controls if it's a large dataset

### **🔒 Important: Sheet Must Be Public**
- The sheet **must** be set to "Anyone with the link can view"
- Private sheets will show a toast notification with access denied error
- You can make it public temporarily just to import the data
- The app will automatically try multiple methods to access your sheet

### **📱 Toast Notifications**
- **Access Denied Error**: Shows when Google Sheet is private or restricted
- **Clean Design**: Simple error notification with red icon matching system UI
- **Auto-dismiss**: Notification disappears automatically or can be closed manually

**Supported Google Sheets URL formats:**
- `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid={SHEET_TAB_ID}`
- Any Google Sheets sharing URL (automatically detects sheet and tab)

## Keyboard Shortcuts

- `Space` - Expand ask input
- `⌘ +` / `⌘ =` - Zoom in
- `⌘ -` - Zoom out
- `⇧ 0` - Zoom to 100%
- `⇧ 1` - Zoom to fit
- `⇧ 2` - Zoom to selection
- `⌘ V` / `Ctrl V` - Paste (auto-detects YouTube URLs, Google Sheets URLs, and table files)
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
- **Built-in CSV Parser** - Custom CSV parsing with quoted field support
- **Google Sheets API** - Direct integration with Google Sheets via CSV export URLs
- **React-PDF & PDF.js** - High-quality PDF rendering and display
- **Toast Notifications** - Clean error notification system for access issues
- **Multiple CORS Proxies** - Robust fallback system for accessing Google Sheets
- **Vite** - Build tool and development server
- **CSS3** - Custom styling with modern features

## Project Structure

```
src/
├── main.jsx           # App entry point and TLdraw setup
├── Header.jsx         # Top header with branding and title
├── AskInput.jsx       # Bottom expandable input component
├── ExcelTable.jsx     # Excel table viewer component
├── PDFViewer.jsx      # PDF viewer component with pagination
├── LoadingCard.jsx    # Generic loading state component
├── Toast.jsx          # Toast notification system
├── header.css         # Header styling
├── ask-input.css      # Ask input styling
├── custom-navigation.css # Zoom controls and canvas styling
├── excel-table.css    # Excel table card styling
├── pdf-viewer.css     # PDF viewer card styling
├── loading-card.css   # Loading state styling
├── toast.css          # Toast notification styling
├── setup-pdf-worker.js # PDF.js worker setup script
├── index.html         # HTML template
└── package.json       # Dependencies and scripts
```

## Development

The app uses Vite for fast development and hot module replacement. All UI components are built as separate modules for maintainability.

### PDF Setup
The PDF viewer requires PDF.js worker files to be properly configured. This is handled automatically:

- **Automatic setup**: PDF worker is set up automatically during `npm install` 
- **Manual setup**: Run `npm run setup-pdf` if needed
- **Worker location**: PDF worker file is copied to `public/pdf.worker.min.mjs`
- **CORS-free**: Uses local worker file to avoid CDN CORS issues
- **Version matching**: Worker version automatically matches react-pdf's internal PDF.js version

### Key Files
- `main.jsx` - Main app component with TLdraw integration and custom file handlers for Excel and PDF
- `Header.jsx` - Floating header with editable title
- `AskInput.jsx` - Smart expandable input with keyboard shortcuts
- `ExcelTable.jsx` - Interactive table component with pagination for Excel/CSV/Google Sheets
- `PDFViewer.jsx` - PDF viewer component with page navigation and PDF.js integration
- `LoadingCard.jsx` - Reusable loading state component for file processing
- `Toast.jsx` - Toast notification system for user feedback
- `setup-pdf-worker.js` - Automated PDF.js worker setup for proper PDF rendering
- Custom CSS files for each component with consistent design tokens and shadow system

## License

MIT