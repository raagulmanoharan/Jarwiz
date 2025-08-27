import React, { useState, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { Tldraw, useEditor, TldrawUiMenuItem, BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import './custom-navigation.css'
import Header from './Header'
import AskInput from './AskInput'
import ExcelTable from './ExcelTable'
import * as XLSX from 'xlsx'

// YouTube URL detection utility
const detectYouTubeURL = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  return youtubeRegex.test(url)
}

// Extract YouTube video ID from URL
const extractYouTubeVideoId = (url) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : null
}

// Excel file detection utility
const detectExcelFile = (file) => {
  const excelTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
  ]
  return excelTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|xlsm)$/i)
}

// Custom Excel Table Shape Utility
class ExcelTableShapeUtil extends BaseBoxShapeUtil {
  static type = 'excel-table'

  getDefaultProps() {
    return {
      w: 1600,
      h: 650,
      data: [],
      fileName: 'Excel File',
      currentPage: 0,
      isLoading: true,
    }
  }

  component(shape) {
    const { data, fileName, currentPage, isLoading } = shape.props

    const handlePageChange = (newPage) => {
      const editor = this.editor
      if (!editor) return

      try {
        // Use TLdraw's transaction system for atomic updates
        editor.batch(() => {
          const currentShape = editor.getShape(shape.id)
          if (currentShape) {
            editor.updateShape({
              id: shape.id,
              type: 'excel-table',
              props: {
                ...currentShape.props,
                currentPage: newPage,
              },
            })
            console.log('Page updated:', currentShape.props.currentPage, '→', newPage)
          }
        })
      } catch (error) {
        console.error('Error updating page:', error)
      }
    }

    const handleHeightChange = (newHeight) => {
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape) {
          // Prevent infinite growth with maximum bounds
          const maxHeight = 1000 // Maximum reasonable height
          const minHeight = 200  // Minimum height
          
          // Cap the height and add minimal padding
          const boundedHeight = Math.min(Math.max(newHeight + 10, minHeight), maxHeight)
          
          // Only update if there's a significant difference (prevent feedback loops)
          if (Math.abs(currentShape.props.h - boundedHeight) > 10) {
            editor.batch(() => {
              editor.updateShape({
                id: shape.id,
                type: 'excel-table',
                props: {
                  ...currentShape.props,
                  h: boundedHeight,
                },
              })
            })
          }
        }
      } catch (error) {
        console.error('Error updating height:', error)
      }
    }

    return (
      <HTMLContainer
        style={{
          pointerEvents: 'all',
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <ExcelTable
          data={data}
          fileName={fileName}
          isLoading={isLoading}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onHeightChange={handleHeightChange}
        />
      </HTMLContainer>
    )
  }

  indicator(shape) {
    return (
      <rect 
        width={shape.props.w} 
        height={shape.props.h}
        fill="none"
        stroke="#1d4ed8"
        strokeWidth={1}
      />
    )
  }
}

// Component to handle YouTube URL pasting
function YouTubePasteHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handlePaste = (e) => {
      // Get clipboard data
      const clipboardData = e.clipboardData || window.clipboardData
      if (!clipboardData) return

      const pastedText = clipboardData.getData('text')
      if (!pastedText) return

      // Check if it's a YouTube URL
      if (detectYouTubeURL(pastedText)) {
        // Prevent both default browser behavior and TLdraw's built-in paste handling
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        try {
          // Get current viewport center for positioning
          const viewport = editor.getViewportPageBounds()
          const centerX = viewport.x + viewport.w / 2
          const centerY = viewport.y + viewport.h / 2

          // Create embed shape at center of viewport
          editor.createShape({
            type: 'embed',
            x: centerX - 280, // Half of default width (560/2)
            y: centerY - 157.5, // Half of default height (315/2)
            props: {
              url: pastedText,
              w: 560,
              h: 315,
            },
          })
          
          console.log('YouTube video embedded:', pastedText)
        } catch (error) {
          console.error('Error creating YouTube embed:', error)
        }
      }
    }

    // Use capture phase to intercept before TLdraw's handlers
    document.addEventListener('paste', handlePaste, true)
    
    return () => {
      document.removeEventListener('paste', handlePaste, true)
    }
  }, [editor])

  return null // This component doesn't render anything
}

// Component to handle Excel file pasting
function ExcelPasteHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handlePaste = async (e) => {
      // Check if files are being pasted
      const files = Array.from(e.clipboardData?.files || [])
      if (files.length === 0) return

      // Find Excel files
      const excelFiles = files.filter(detectExcelFile)
      if (excelFiles.length === 0) return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      // Process the first Excel file
      const file = excelFiles[0]
      
      try {
        // Get current viewport center for positioning
        const viewport = editor.getViewportPageBounds()
        const centerX = viewport.x + viewport.w / 2
        const centerY = viewport.y + viewport.h / 2

        console.log('Excel file processing started:', file.name)

        // Process Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        
        // Create table shape with first batch of data immediately
        const batchSize = 50
        const firstBatch = jsonData.slice(0, batchSize)
        
        // Generate a unique ID for the shape (TLdraw requires "shape:" prefix)
        const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
        
        // Create shape with explicit ID
        editor.createShape({
          id: shapeId,
          type: 'excel-table',
          x: centerX - 800, // Half of default width (1600/2)
          y: centerY - 325, // Half of default height (650/2)
          props: {
            w: 1600,
            h: 650,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: jsonData.length > batchSize,
          },
        })
        
        console.log('Created shape with explicit ID:', shapeId)

        // Immediately verify the shape exists
        const immediateCheck = editor.getShape(shapeId)
        console.log('Immediate shape check after creation:', !!immediateCheck, 'ID:', shapeId)
        
        // Also list all shapes to debug
        const allShapes = editor.getCurrentPageShapes()
        console.log('All shapes after creation:', allShapes.map(s => ({ id: s.id, type: s.type })))
        
        console.log('Excel file processed successfully:', firstBatch.length, 'rows loaded immediately, total:', jsonData.length, 'rows')
        
        // If there's more data, schedule background loading
        if (jsonData.length > batchSize) {
          // Schedule the background loading for after this function returns
          Promise.resolve().then(async () => {
            // Check if shape still exists
            const backgroundStartCheck = editor.getShape(shapeId)
            if (!backgroundStartCheck) {
              console.error('Shape not found for background loading:', shapeId)
              return
            }
            
            let processedData = [...firstBatch]
            
            for (let i = batchSize; i < jsonData.length; i += batchSize) {
              const batch = jsonData.slice(i, i + batchSize)
              processedData = [...processedData, ...batch]
              
              // Update the shape with new data
              try {
                const currentShape = editor.getShape(shapeId)
                if (currentShape) {
                  editor.updateShape({
                    id: shapeId,
                    type: 'excel-table',
                    props: {
                      ...currentShape.props,
                      data: processedData,
                      isLoading: i + batchSize < jsonData.length,
                    },
                  })

                } else {
                  console.error('Shape not found for update, ID:', shapeId)
                  break
                }
              } catch (error) {
                console.error('Error updating shape:', error)
                break
              }
              
              // Add small delay to show progressive loading
              if (i + batchSize < jsonData.length) {
                await new Promise(resolve => setTimeout(resolve, 50))
              }
            }
            
            // Final update to mark loading complete
            try {
              const currentShape = editor.getShape(shapeId)
              if (currentShape) {
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    data: processedData,
                    isLoading: false,
                  },
                })
                console.log('Background loading completed:', processedData.length, 'total rows')
              } else {
                console.error('Shape not found for final update, ID:', shapeId)
              }
            } catch (error) {
              console.error('Error marking loading complete:', error)
            }
          })
        }

        console.log('Excel file processed successfully:', firstBatch.length, 'rows loaded immediately, total:', jsonData.length, 'rows')
        
        // Set final loading state if no background loading needed
        if (jsonData.length <= batchSize) {
          try {
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  ...currentShape.props,
                  isLoading: false,
                },
              })
              console.log('Small file - no background loading needed')
            }
          } catch (error) {
            console.error('Error setting initial loading complete:', error)
          }
        }
        
      } catch (error) {
        console.error('Error processing Excel file:', error)
        // Could show error state in the table component here
      }
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener('paste', handlePaste, true)
    
    return () => {
      document.removeEventListener('paste', handlePaste, true)
    }
  }, [editor])

  return null // This component doesn't render anything
}



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
  // Custom keyboard event handler to prevent space bar from reaching TLdraw
  const handleKeyDown = (e) => {
    if (e.code === 'Space') {
      // Let AskInput handle the space bar, prevent TLdraw from processing it
      e.stopPropagation()
    }
  }

  // Handle TLdraw mounting and register custom file handlers
  const handleMount = useCallback((editor) => {
    // Register external content handler for Excel files
    editor.registerExternalContentHandler('files', async (content) => {
      const { files, point } = content
      
      // Find Excel files
      const excelFiles = files.filter(detectExcelFile)
      if (excelFiles.length === 0) {
        return // Let TLdraw handle other file types
      }

      // Process the first Excel file
      const file = excelFiles[0]
      
      try {
        // Get drop position or center if no position provided
        let centerX, centerY
        if (point) {
          centerX = point.x
          centerY = point.y
        } else {
          // Fallback to viewport center
          const viewport = editor.getViewportPageBounds()
          centerX = viewport.x + viewport.w / 2
          centerY = viewport.y + viewport.h / 2
        }

        console.log('Excel file processing started:', file.name)

        // Process Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        
        // Create table shape with first batch of data immediately
        const batchSize = 50
        const firstBatch = jsonData.slice(0, batchSize)
        
        // Generate a unique ID for the shape (TLdraw requires "shape:" prefix)
        const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
        
        // Create shape with explicit ID
        editor.createShape({
          id: shapeId,
          type: 'excel-table',
          x: centerX - 800, // Half of default width (1600/2)
          y: centerY - 325, // Half of default height (650/2)
          props: {
            w: 1600,
            h: 650,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: jsonData.length > batchSize,
          },
        })
        
        console.log('Created shape with explicit ID:', shapeId)

        // Immediately verify the shape exists
        const immediateCheck = editor.getShape(shapeId)
        console.log('Immediate shape check after creation:', !!immediateCheck, 'ID:', shapeId)
        
        // Also list all shapes to debug
        const allShapes = editor.getCurrentPageShapes()
        console.log('All shapes after creation:', allShapes.map(s => ({ id: s.id, type: s.type })))
        
        console.log('Excel file processed successfully:', firstBatch.length, 'rows loaded immediately, total:', jsonData.length, 'rows')
        
        // If there's more data, schedule background loading
        if (jsonData.length > batchSize) {
          // Schedule the background loading for after this function returns
          Promise.resolve().then(async () => {
            // Check if shape still exists
            const backgroundStartCheck = editor.getShape(shapeId)
            if (!backgroundStartCheck) {
              console.error('Shape not found for background loading:', shapeId)
              return
            }
            
            let processedData = [...firstBatch]
            
            for (let i = batchSize; i < jsonData.length; i += batchSize) {
              const batch = jsonData.slice(i, i + batchSize)
              processedData = [...processedData, ...batch]
              
              // Update the shape with new data
              try {
                const currentShape = editor.getShape(shapeId)
                if (currentShape) {
                  editor.updateShape({
                    id: shapeId,
                    type: 'excel-table',
                    props: {
                      ...currentShape.props,
                      data: processedData,
                      isLoading: i + batchSize < jsonData.length,
                    },
                  })

                } else {
                  console.error('Shape not found for update, ID:', shapeId)
                  break
                }
              } catch (error) {
                console.error('Error updating shape:', error)
                break
              }
              
              // Add small delay to show progressive loading
              if (i + batchSize < jsonData.length) {
                await new Promise(resolve => setTimeout(resolve, 50))
              }
            }
            
            // Final update to mark loading complete
            try {
              const currentShape = editor.getShape(shapeId)
              if (currentShape) {
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    data: processedData,
                    isLoading: false,
                  },
                })
                console.log('Background loading completed:', processedData.length, 'total rows')
              } else {
                console.error('Shape not found for final update, ID:', shapeId)
              }
            } catch (error) {
              console.error('Error marking loading complete:', error)
            }
          })
        }

        console.log('Excel file processed successfully:', firstBatch.length, 'rows loaded immediately, total:', jsonData.length, 'rows')
        
        // Set final loading state if no background loading needed
        if (jsonData.length <= batchSize) {
          try {
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  ...currentShape.props,
                  isLoading: false,
                },
              })
              console.log('Small file - no background loading needed')
            }
          } catch (error) {
            console.error('Error setting initial loading complete:', error)
          }
        }
        
        // Tell TLdraw we handled this content by returning VoidResult
        return { type: 'void' }
        
      } catch (error) {
        console.error('Error processing Excel file:', error)
        return // Let TLdraw handle the error
      }
    })
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ position: 'fixed', inset: 0 }} onKeyDown={handleKeyDown}>
        <Header />
        <Tldraw
          shapeUtils={[ExcelTableShapeUtil]}
          onMount={handleMount}
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
            InFrontOfTheCanvas: () => (
              <>
                <CustomNavigation />
                <YouTubePasteHandler />
                <ExcelPasteHandler />
              </>
            ),
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