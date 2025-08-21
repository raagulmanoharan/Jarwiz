import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import './custom-navigation.css'
import Header from './Header'
import AskInput from './AskInput'

function CustomNavigation() {
  const editor = useEditor()
  const [showZoomMenu, setShowZoomMenu] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(100)

  React.useEffect(() => {
    if (!editor) return
    
    const updateZoom = () => {
      const zoom = Math.round(editor.getZoomLevel() * 100)
      setCurrentZoom(zoom)
    }

    editor.on('camera', updateZoom)
    updateZoom()

    return () => {
      editor.off('camera', updateZoom)
    }
  }, [editor])

  const handleZoomIn = () => {
    editor.zoomIn()
  }

  const handleZoomOut = () => {
    editor.zoomOut()
  }

  const handleZoomTo100 = () => {
    editor.resetZoom()
  }

  const handleZoomToFit = () => {
    editor.zoomToFit()
  }

  const handleZoomToSelection = () => {
    editor.zoomToSelection()
  }

  return (
    <div className="custom-navigation">
      {showZoomMenu && (
        <div className="zoom-menu">
          <button onClick={handleZoomIn} className="zoom-menu-item">
            <span>Zoom in</span>
            <span className="shortcut">⌘ =</span>
          </button>
          <button onClick={handleZoomOut} className="zoom-menu-item">
            <span>Zoom out</span>
            <span className="shortcut">⌘ -</span>
          </button>
          <button onClick={handleZoomTo100} className="zoom-menu-item">
            <span>Zoom to 100%</span>
            <span className="shortcut">⇧ 0</span>
          </button>
          <button onClick={handleZoomToFit} className="zoom-menu-item">
            <span>Zoom to fit</span>
            <span className="shortcut">⇧ 1</span>
          </button>
          <button onClick={handleZoomToSelection} className="zoom-menu-item">
            <span>Zoom to selection</span>
            <span className="shortcut">⇧ 2</span>
          </button>
        </div>
      )}
      
      <div className="zoom-controls">
          <button onClick={handleZoomOut} className="zoom-button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button 
            onClick={() => setShowZoomMenu(!showZoomMenu)} 
            className="zoom-display"
          >
            {currentZoom}%
          </button>
          <button onClick={handleZoomIn} className="zoom-button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
    </div>
  )
}

function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Header />
      <Tldraw
        hideUi={false}
        components={{
          NavigationPanel: null,
          ZoomMenu: null,
          MainMenu: null,
          ActionsMenu: null,
          HelpMenu: null,
          PageMenu: null,
          Toolbar: null,
          StylePanel: null,
          DebugMenu: null,
          DebugPanel: null,
        }}
      >
        <CustomNavigation />
      </Tldraw>
      <AskInput />
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(<App />)