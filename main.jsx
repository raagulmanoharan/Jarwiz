import React, { useState, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { Tldraw, useEditor, TldrawUiMenuItem, BaseBoxShapeUtil, HTMLContainer, EmbedShapeUtil } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import './custom-navigation.css'
import './pdf-viewer.css'
import './card-shadows.css'
import Header from './Header'
import AskInput from './AskInput'
import ExcelTable from './ExcelTable'
import PDFViewer from './PDFViewer'
import LinkPreview from './LinkPreview'
import * as XLSX from 'xlsx'

// URL validation utility
const isValidURL = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

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

// Google Sheets URL detection utility
const detectGoogleSheetsURL = (url) => {
  const googleSheetsRegex = /^(https?:\/\/)?(docs\.google\.com\/spreadsheets\/d\/)/
  return googleSheetsRegex.test(url)
}

// Figma URL detection utility
const detectFigmaURL = (url) => {
  const figmaRegex = /^(https?:\/\/)?(www\.)?figma\.com\/(file|proto|design)/
  return figmaRegex.test(url)
}

// Detect URLs that TLDraw handles natively as embeds
const detectTLDrawNativeEmbed = (url) => {
  if (!isValidURL(url)) return false
  
  // TLDraw natively supports these platforms
  const nativeEmbedPatterns = [
    /youtube\.com|youtu\.be/,           // YouTube
    /figma\.com/,                       // Figma
    /twitter\.com|x\.com/,              // Twitter/X
    /vimeo\.com/,                       // Vimeo
    /codesandbox\.io/,                  // CodeSandbox
    /codepen\.io/,                      // CodePen
    /scratch\.mit\.edu/,                // Scratch
    /tldraw\.com/,                      // TLDraw itself
  ]
  
  return nativeEmbedPatterns.some(pattern => pattern.test(url))
}

// Generic website URL detection utility (excluding platforms handled by TLDraw or custom handlers)
const detectGenericWebsiteURL = (url) => {
  if (!isValidURL(url)) return false
  if (detectYouTubeURL(url)) return false
  if (detectGoogleSheetsURL(url)) return false
  if (detectTLDrawNativeEmbed(url)) return false
  
  // Check if it's a valid HTTP/HTTPS URL
  const urlObj = new URL(url)
  return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
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

// PDF file detection utility
const detectPDFFile = (file) => {
  return file.type === 'application/pdf' || file.name.match(/\.pdf$/i)
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  // Override resize behavior to maintain aspect ratio
  onResize(shape, info) {
    const { initialBounds, scaleX, scaleY } = info
    
    // Calculate new dimensions maintaining aspect ratio
    // Use the larger scale factor to prevent distortion
    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY))
    
    // Use standard Excel card aspect ratio (1600/650 ≈ 2.46)
    const aspectRatio = 1600 / 650
    
    let newWidth = initialBounds.width * scale
    let newHeight = newWidth / aspectRatio
    
    // Ensure minimum dimensions
    const minWidth = 400
    const minHeight = 200
    const maxWidth = 2000
    const maxHeight = 1200
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
    
    // Maintain aspect ratio
    if (newWidth / aspectRatio > maxHeight) {
      newHeight = maxHeight
      newWidth = newHeight * aspectRatio
    }
    
    return {
      ...shape,
      props: {
        ...shape.props,
        w: newWidth,
        h: newHeight,
      }
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

// Custom PDF Viewer Shape Utility
class PDFViewerShapeUtil extends BaseBoxShapeUtil {
  static type = 'pdf-viewer'

  getDefaultProps() {
    return {
      w: 800,
      h: 600,
      fileName: 'PDF Document',
      fileSize: 0,
      fileData: null, // Base64 data URL or array buffer
      currentPage: 0,
      isLoading: false,
      isInitialLoading: false,
      loadingMessage: '',
      loadingSubMessage: '',
    }
  }

  // Override resize behavior to maintain aspect ratio
  onResize(shape, info) {
    const { initialBounds, scaleX, scaleY } = info
    
    // Calculate new dimensions maintaining aspect ratio
    // Use the larger scale factor to prevent distortion
    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY))
    
    // Use standard PDF viewer aspect ratio (800/600 ≈ 1.33)
    const aspectRatio = 800 / 600
    
    let newWidth = initialBounds.width * scale
    let newHeight = newWidth / aspectRatio
    
    // Ensure minimum dimensions for PDF viewer
    const minWidth = 400
    const minHeight = 300
    const maxWidth = 1400
    const maxHeight = 1000
    
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
    
    // Maintain aspect ratio
    if (newWidth / aspectRatio > maxHeight) {
      newHeight = maxHeight
      newWidth = newHeight * aspectRatio
    }
    
    return {
      ...shape,
      props: {
        ...shape.props,
        w: newWidth,
        h: newHeight,
      }
    }
  }

  component(shape) {
    const { fileName, fileSize, fileData, currentPage, isLoading, isInitialLoading, loadingMessage, loadingSubMessage } = shape.props

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
              type: 'pdf-viewer',
              props: {
                ...currentShape.props,
                currentPage: newPage,
              },
            })
            console.log('PDF page updated:', currentShape.props.currentPage, '→', newPage)
          }
        })
      } catch (error) {
        console.error('Error updating PDF page:', error)
      }
    }

    const handleHeightChange = (newHeight) => {
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape) {
          // Prevent infinite growth with maximum bounds
          const maxHeight = 1200 // Maximum reasonable height for PDF
          const minHeight = 400   // Minimum height for PDF
          
          // Cap the height and add minimal padding
          const boundedHeight = Math.min(Math.max(newHeight + 10, minHeight), maxHeight)
          
          // Only update if there's a significant difference (prevent feedback loops)
          if (Math.abs(currentShape.props.h - boundedHeight) > 10) {
            editor.batch(() => {
              editor.updateShape({
                id: shape.id,
                type: 'pdf-viewer',
                props: {
                  ...currentShape.props,
                  h: boundedHeight,
                },
              })
            })
          }
        }
      } catch (error) {
        console.error('Error updating PDF height:', error)
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
        <PDFViewer
          fileName={fileName}
          fileSize={fileSize}
          fileData={fileData}
          currentPage={currentPage}
          isLoading={isLoading}
          isInitialLoading={isInitialLoading}
          loadingMessage={loadingMessage}
          loadingSubMessage={loadingSubMessage}
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

// Custom Link Shape Utility for website previews
class LinkShapeUtil extends BaseBoxShapeUtil {
  static type = 'link'

  getDefaultProps() {
    return {
      url: '',
      w: 400,
      h: 80,
    }
  }

  component(shape) {
    const { url } = shape.props

    const handleHeightChange = (newHeight) => {
      // Update shape height if needed
      if (newHeight !== shape.props.h) {
        // We can't directly update from here, parent handles sizing
      }
    }

    return (
      <HTMLContainer 
        id={shape.id}
        style={{
          pointerEvents: 'all',
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        <LinkPreview
          url={url}
          onHeightChange={handleHeightChange}
        />
      </HTMLContainer>
    )
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

// Custom YouTube Embed Shape Utility with proportional resizing
// Note: Using TLDraw's default embed handling for YouTube
// Custom shape utils with aspectRatio properties cause validation errors

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

// Extract Google Sheets ID from URL
const extractGoogleSheetsId = (url) => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

// Convert Google Sheets URL to CSV export URL
const getGoogleSheetsCsvUrl = (url) => {
  const sheetId = extractGoogleSheetsId(url)
  if (!sheetId) return null
  
  // Check if URL has a specific tab/gid
  const gidMatch = url.match(/[#&]gid=([0-9]+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

// Component to handle Google Sheets URL pasting
function GoogleSheetsPasteHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handlePaste = async (e) => {
      // Get clipboard data
      const clipboardData = e.clipboardData || window.clipboardData
      if (!clipboardData) return

      const pastedText = clipboardData.getData('text')
      if (!pastedText) return

      // Check if it's a Google Sheets URL
      if (detectGoogleSheetsURL(pastedText)) {
        // Prevent both default browser behavior and TLdraw's built-in paste handling
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        try {
          // Get current viewport center for positioning
          const viewport = editor.getViewportPageBounds()
          const centerX = viewport.x + viewport.w / 2
          const centerY = viewport.y + viewport.h / 2

          console.log('Google Sheets URL processing started:', pastedText)

          // Extract sheet name from URL for display
          const urlObj = new URL(pastedText)
          const pathParts = urlObj.pathname.split('/')
          let sheetName = 'Google Sheet'
          
          // Try to get a meaningful name from the URL
          if (urlObj.hash && urlObj.hash.includes('gid=')) {
            sheetName = 'Google Sheet'
          }

          // Generate a unique ID for the shape
          const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
          
          // Create loading shape first
          editor.createShape({
            id: shapeId,
            type: 'excel-table',
            x: centerX - 800, // Half of default width (1600/2)
            y: centerY - 325, // Half of default height (650/2)
            props: {
              w: 1600,
              h: 650,
              data: [],
              fileName: sheetName,
              currentPage: 0,
              isLoading: true,
            },
          })

          // Fetch Google Sheets data
          const csvUrl = getGoogleSheetsCsvUrl(pastedText)
          if (!csvUrl) {
            throw new Error('Unable to extract Google Sheets ID from URL')
          }

          console.log('Fetching Google Sheets data from:', csvUrl)

          // Try multiple methods to fetch the data
          let csvData = null
          let finalSheetName = sheetName

          try {
            // Method 1: Direct fetch (may fail due to CORS)
            const response = await fetch(csvUrl)
            if (response.ok) {
              csvData = await response.text()
            } else {
              throw new Error(`HTTP ${response.status}`)
            }
          } catch (directError) {
            console.log('Direct fetch failed, trying CORS proxy:', directError.message)
            
            // Method 2: CORS proxy
            try {
              const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`
              const proxyResponse = await fetch(proxyUrl)
              if (proxyResponse.ok) {
                const proxyData = await proxyResponse.json()
                csvData = proxyData.contents
              } else {
                throw new Error(`Proxy failed: HTTP ${proxyResponse.status}`)
              }
            } catch (proxyError) {
              console.error('Both direct and proxy methods failed:', proxyError)
              throw new Error('Unable to access Google Sheet. Make sure it is public and shared with "Anyone with the link can view".')
            }
          }

          if (!csvData || csvData.trim() === '') {
            throw new Error('No data found in Google Sheet')
          }

          // Parse CSV data
          const lines = csvData.trim().split('\n')
          if (lines.length === 0) {
            throw new Error('Empty Google Sheet')
          }

          // Parse CSV with proper handling of quoted fields
          const parseCSVLine = (line) => {
            const result = []
            let current = ''
            let inQuotes = false
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              const nextChar = line[i + 1]
              
              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  current += '"'
                  i++ // skip next quote
                } else {
                  inQuotes = !inQuotes
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            
            result.push(current.trim())
            return result
          }

          const headers = parseCSVLine(lines[0])
          const jsonData = []

          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i])
            const row = {}
            
            headers.forEach((header, index) => {
              row[header || `Column ${index + 1}`] = values[index] || ''
            })
            
            // Only add non-empty rows
            if (Object.values(row).some(value => value.trim() !== '')) {
              jsonData.push(row)
            }
          }

          if (jsonData.length === 0) {
            throw new Error('No data rows found in Google Sheet')
          }

          console.log('Google Sheets data processed successfully:', jsonData.length, 'rows')

          // Update the shape with actual data
          editor.updateShape({
            id: shapeId,
            type: 'excel-table',
            props: {
              data: jsonData,
              fileName: finalSheetName,
              currentPage: 0,
              isLoading: false,
            },
          })

        } catch (error) {
          console.error('Error processing Google Sheets URL:', error)
          
          // Update shape to show error state or remove it
          // For now, we'll leave it in loading state - could be improved with error UI
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

// Component to handle generic website URL pasting
function WebsitePasteHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handlePaste = (e) => {
      // Get clipboard data
      const clipboardData = e.clipboardData || window.clipboardData
      if (!clipboardData) return

      const pastedText = clipboardData.getData('text')
      if (!pastedText) return

      // Check if it's a generic website URL (not YouTube or Google Sheets)
      if (detectGenericWebsiteURL(pastedText)) {
        // Prevent both default browser behavior and TLdraw's built-in paste handling
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        try {
          // Get current viewport center for positioning
          const viewport = editor.getViewportPageBounds()
          const centerX = viewport.x + viewport.w / 2
          const centerY = viewport.y + viewport.h / 2

          // Create link shape at center of viewport
          editor.createShape({
            type: 'link',
            x: centerX - 200, // Half of default width (400/2)
            y: centerY - 40, // Half of default height (80/2)
            props: {
              url: pastedText,
              w: 400,
              h: 80,
            },
          })
          
          console.log('Website link created:', pastedText)
        } catch (error) {
          console.error('Error creating website link:', error)
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
    // Register external content handler for Excel and PDF files
    editor.registerExternalContentHandler('files', async (content) => {
      const { files, point } = content
      
      // Find supported files (Excel and PDF)
      const excelFiles = files.filter(detectExcelFile)
      const pdfFiles = files.filter(detectPDFFile)
      
      if (excelFiles.length === 0 && pdfFiles.length === 0) {
        return // Let TLdraw handle other file types
      }

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

      // Process PDF files first (if any)
      if (pdfFiles.length > 0) {
        const file = pdfFiles[0]
        
        try {
          console.log('PDF file processing started:', file.name)
          
          const shapeId = `shape:pdf_${Date.now()}_${Math.random().toString(36).substring(2)}`
          const loadingMessage = 'Loading PDF Document'
          const loadingSubMessage = 'Processing file content...'

          // Create initial loading shape
          editor.createShape({
            id: shapeId,
            type: 'pdf-viewer',
            x: centerX - 400,
            y: centerY - 300,
            props: {
              fileName: file.name,
              fileSize: file.size,
              fileData: null,
              currentPage: 0,
              isLoading: false,
              isInitialLoading: true,
              loadingMessage,
              loadingSubMessage,
              w: 800,
              h: 600,
            },
          })

          // Process PDF file in background
          console.log(`Processing PDF file: ${file.name}, size: ${formatFileSize(file.size)}`)
          
          try {
            // Read PDF as ArrayBuffer and convert to base64 data URL
            console.log('Reading PDF as ArrayBuffer...')
            const arrayBuffer = await file.arrayBuffer()
            console.log('ArrayBuffer size:', arrayBuffer.byteLength, 'bytes')
            
            const uint8Array = new Uint8Array(arrayBuffer)
            console.log('Converting to Uint8Array, length:', uint8Array.length)
            
            let binaryString = ''
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i])
            }
            console.log('Binary string length:', binaryString.length)
            
            const base64String = btoa(binaryString)
            console.log('Base64 string length:', base64String.length)
            
            const fileData = 'data:application/pdf;base64,' + base64String
            console.log('Final content format: data URL with', base64String.length, 'base64 chars')

            // Update shape with actual content
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'pdf-viewer',
                props: {
                  ...currentShape.props,
                  fileData: fileData,
                  isInitialLoading: false,
                  loadingMessage: '',
                  loadingSubMessage: '',
                },
              })
            }
            
            console.log('PDF viewer created:', file.name)
            return { type: 'void' }
            
          } catch (pdfError) {
            console.error('Error processing PDF:', pdfError)
            // Update shape with error state
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'pdf-viewer',
                props: {
                  ...currentShape.props,
                  fileData: `Error processing PDF: ${pdfError.message}`,
                  isInitialLoading: false,
                  loadingMessage: '',
                  loadingSubMessage: '',
                },
              })
            }
            return { type: 'void' }
          }
          
        } catch (error) {
          console.error('Error processing PDF file:', error)
          return // Let TLdraw handle the error
        }
      }

      // Process Excel files (if no PDF files were processed)
      if (excelFiles.length > 0) {
        const file = excelFiles[0]
        
        try {

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
      }
    })
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ position: 'fixed', inset: 0 }} onKeyDown={handleKeyDown}>
        <Header />
        <Tldraw
          shapeUtils={[ExcelTableShapeUtil, PDFViewerShapeUtil, LinkShapeUtil]}
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
                <GoogleSheetsPasteHandler />
                <WebsitePasteHandler />
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