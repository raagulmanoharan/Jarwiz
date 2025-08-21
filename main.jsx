import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { Tldraw, useEditor, TldrawUiMenuItem } from '@tldraw/tldraw'
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
      try {
        const zoom = Math.round(editor.getZoomLevel() * 100)
        setCurrentZoom(zoom)
      } catch (error) {
        console.warn('Error updating zoom:', error)
      }
    }

    // Listen to camera changes
    let unsubscribe
    try {
      unsubscribe = editor.store.listen(() => {
        updateZoom()
      })
      updateZoom()
    } catch (error) {
      console.warn('Error setting up zoom listener:', error)
    }

    return () => {
      try {
        if (unsubscribe) {
          unsubscribe()
        }
      } catch (error) {
        console.warn('Error cleaning up zoom listener:', error)
      }
    }
  }, [editor])

  const handleZoomIn = () => {
    if (editor) {
      editor.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (editor) {
      editor.zoomOut()
    }
  }

  const handleZoomTo100 = () => {
    if (editor) {
      editor.resetZoom()
    }
  }

  const handleZoomToFit = () => {
    if (editor) {
      editor.zoomToFit()
    }
  }

  const handleZoomToSelection = () => {
    if (editor) {
      editor.zoomToSelection()
    }
  }

  if (!editor) return null

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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.warn('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>
    }

    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Header />
        <Tldraw
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
            InFrontOfTheCanvas: CustomNavigation,
          }}
        >
        </Tldraw>
        <AskInput />
      </div>
    </ErrorBoundary>
  )
}

const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(<App />)