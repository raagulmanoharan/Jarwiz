import React, { useState, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { Tldraw, useEditor, TldrawUiMenuItem, BaseBoxShapeUtil, HTMLContainer, EmbedShapeUtil } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import './src/components/custom-navigation.css'
import './src/components/pdf-viewer.css'
import './src/components/card-shadows.css'
import Header from './src/components/Header'
import AskInput from './src/components/AskInput'
import ExcelTable from './src/components/ExcelTable'
import PDFViewer from './src/components/PDFViewer'
import LinkPreview from './src/components/LinkPreview'
import ImageViewer from './src/components/ImageViewer'
import { processExcelWithAI, validateExcelData } from './aiExcelProcessor'
import { calculateCardHeight, applyHeightBounds } from './src/utils/heightCalculator'
import * as XLSX from 'xlsx'

// Helper function to calculate dynamic Excel table height
const calculateExcelHeight = (data, hasMultipleSheets, isGoogleSheets = false) => {
  if (isGoogleSheets) {
    // For Google Sheets, calculate height based on actual content
    const headerHeight = 60 // Header height
    const controlsHeight = hasMultipleSheets ? 50 : 0 // Sheet selector + pagination if needed
    const tableHeaderHeight = 40 // Table header row
    const rowHeight = 60 // Increased height per data row for better readability
    
    // Show ALL rows without clipping - don't artificially limit height
    const totalRows = data.length
    const tableHeight = tableHeaderHeight + (totalRows * rowHeight)
    const padding = 60 // Increased padding to ensure content is fully visible
    
    return Math.max(400, headerHeight + controlsHeight + tableHeight + padding)
  }
  
  const headerHeight = 60 // Header height
  const controlsHeight = hasMultipleSheets ? 50 : 0 // Sheet selector + pagination if needed
  const tableHeaderHeight = 40 // Table header row
  const rowHeight = 60 // Increased height per data row to prevent clipping
  
  // Show ALL rows without clipping - don't artificially limit height
  const totalRows = data.length
  const tableHeight = tableHeaderHeight + (totalRows * rowHeight)
  const padding = 60 // Increased padding to ensure content is fully visible
  
  return Math.max(300, headerHeight + controlsHeight + tableHeight + padding)
}

// Helper function to find optimal position for new shape (avoiding overlaps)
const findOptimalShapePosition = (editor, shapeWidth, shapeHeight) => {
  if (!editor) {
    return { x: 0, y: 0 }
  }

  try {
    // Get current viewport bounds
    const viewport = editor.getViewportPageBounds()
    const centerX = viewport.x + viewport.w / 2
    const centerY = viewport.y + viewport.h / 2

    // Get all existing shapes on the current page
    const existingShapes = editor.getCurrentPageShapes()
    
    if (existingShapes.length === 0) {
      // No existing shapes, place at viewport center
      return {
        x: centerX - shapeWidth / 2,
        y: centerY - shapeHeight / 2
      }
    }

    // Find the rightmost edge and use the first shape's Y position for horizontal alignment
    let rightmostX = Number.NEGATIVE_INFINITY
    let baselineY = null

    existingShapes.forEach(shape => {
      const shapeRightEdge = shape.x + (shape.props?.w || 100)
      
      if (shapeRightEdge > rightmostX) {
        rightmostX = shapeRightEdge
      }
      
      // Use the first shape's Y position as the baseline for horizontal alignment
      if (baselineY === null) {
        baselineY = shape.y
      }
    })

    // Add spacing between cards (80px gap)
    const spacing = 80
    const newX = rightmostX + spacing
    
    // Align new card to the same horizontal line as the first card
    const newY = baselineY

    return { x: newX, y: newY }
  } catch (error) {
    console.warn('Failed to calculate optimal position, using viewport center:', error)
    // Fallback to viewport center
    const viewport = editor.getViewportPageBounds()
    return {
      x: viewport.x + viewport.w / 2 - shapeWidth / 2,
      y: viewport.y + viewport.h / 2 - shapeHeight / 2
    }
  }
}

// Helper function to smoothly center camera on a new shape
const centerCameraOnShape = (editor, shapeX, shapeY, shapeWidth = 0, shapeHeight = 0) => {
  if (!editor) return

  try {
    // Get current viewport bounds
    const viewport = editor.getViewportPageBounds()
    const currentCamera = editor.getCamera()
    
    // Calculate the center of the new shape
    const shapeCenterX = shapeX + shapeWidth / 2
    const shapeCenterY = shapeY + shapeHeight / 2
    
    // Calculate the center of the current viewport
    const viewportCenterX = viewport.x + viewport.w / 2
    const viewportCenterY = viewport.y + viewport.h / 2
    
    // Calculate the offset needed to center the shape
    const offsetX = shapeCenterX - viewportCenterX
    const offsetY = shapeCenterY - viewportCenterY
    
    // Only move camera if the shape is not already mostly centered
    const threshold = Math.min(viewport.w, viewport.h) * 0.1 // 10% of viewport
    
    if (Math.abs(offsetX) > threshold || Math.abs(offsetY) > threshold) {
      // Use panZoomIntoView as primary method (most reliable)
      if (editor.panZoomIntoView) {
        // Smoothly pan to the new shape - this handles coordinate system correctly
        editor.panZoomIntoView([{
          x: shapeX,
          y: shapeY,
          w: shapeWidth || 100,
          h: shapeHeight || 100
        }])
      } else if (editor.setCamera) {
        // TLDraw camera coordinates: to follow a shape moving right, camera moves left
        // This is because camera position is the top-left of what we see
        const newCameraX = currentCamera.x - offsetX  // Inverted X for correct direction
        const newCameraY = currentCamera.y - offsetY  // Inverted Y for correct direction
        
        // Set camera position directly with smooth animation
        editor.setCamera({
          x: newCameraX,
          y: newCameraY,
          z: currentCamera.z // Keep current zoom level
        }, { animation: { duration: 300 } })
      } else {
        // Fallback: try to use internal camera methods with corrected coordinates
        const newCamera = {
          ...currentCamera,
          x: currentCamera.x - offsetX,  // Inverted coordinates
          y: currentCamera.y - offsetY
        }
        
        // Attempt to set camera using store update
        if (editor.store && editor.store.put) {
          editor.store.put([{
            typeName: 'camera',
            id: 'camera:page:page',
            ...newCamera
          }])
        }
      }
    }

    // After panning, slightly adjust zoom to ensure the card fits in view
    // without over-zooming. This keeps existing pan behavior intact.
    const pad = 40 // page-units padding around the card
    const cardW = Math.max(1, shapeWidth || 100) + pad * 2
    const cardH = Math.max(1, shapeHeight || 100) + pad * 2

    // Recompute viewport (in page space) in case it changed after the pan call
    const vp = editor.getViewportPageBounds()
    const needScale = Math.max(cardW / vp.w, cardH / vp.h)

    if (needScale > 1.02) {
      // Compute target zoom to fit, clamp to sane bounds
      const camAfterPan = editor.getCamera()
      const currentZ = camAfterPan.z ?? editor.getZoomLevel?.() ?? 1
      const targetZ = Math.max(0.05, Math.min(8, currentZ / needScale))

      // Apply only zoom, preserving current camera x/y to avoid disturbing pan
      if (editor.setCamera) {
        editor.setCamera({ x: camAfterPan.x, y: camAfterPan.y, z: targetZ }, { animation: { duration: 250 } })
      }
    }
  } catch (error) {
    console.warn('Failed to center camera on shape:', error)
  }
}

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

// Image file detection utility
const detectImageFile = (file) => {
  const imageTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
  ]
  return imageTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)
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
    const { data, fileName, generatedTitle, currentPage, isLoading, isAIProcessing, aiProgress, aiMessage, sheets, sheetNames, currentSheet } = shape.props

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
          // Use unified height bounds
          const boundedHeight = applyHeightBounds(newHeight, 'excel-table')
          
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

    const handleSheetChange = (sheetName) => {
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape && currentShape.props.sheets && currentShape.props.sheets[sheetName]) {
          editor.batch(() => {
            editor.updateShape({
              id: shape.id,
              type: 'excel-table',
              props: {
                ...currentShape.props,
                data: currentShape.props.sheets[sheetName],
                currentSheet: sheetName,
                currentPage: 0, // Reset to first page when switching sheets
              },
            })
          })
          console.log('Sheet changed to:', sheetName)
        }
      } catch (error) {
        console.error('Error changing sheet:', error)
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
          generatedTitle={generatedTitle}
          isLoading={isLoading}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onHeightChange={handleHeightChange}
          isAIProcessing={isAIProcessing}
          aiProgress={aiProgress}
          aiMessage={aiMessage}
          sheets={sheets}
          sheetNames={sheetNames}
          currentSheet={currentSheet}
          onSheetChange={handleSheetChange}
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
          // Use unified height bounds
          const boundedHeight = applyHeightBounds(newHeight, 'pdf-viewer')
          
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
class ImageShapeUtil extends BaseBoxShapeUtil {
  static type = 'image'

  getDefaultProps() {
    return {
      w: 400,
      h: 300,
      fileName: 'Image',
      fileSize: 0,
      imageData: null, // Data URL for the image
      isLoading: false,
    }
  }

  // Override resize behavior to maintain aspect ratio
  onResize(shape, info) {
    const { initialBounds, scaleX, scaleY } = info
    
    // Calculate new dimensions maintaining aspect ratio
    // Use the larger scale factor to prevent distortion
    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY))
    
    // Calculate new width and height
    const newW = Math.max(200, Math.min(1200, initialBounds.w * scale)) // Min 200, max 1200
    const newH = Math.max(150, Math.min(900, initialBounds.h * scale))   // Min 150, max 900
    
    return {
      ...shape,
      props: {
        ...shape.props,
        w: newW,
        h: newH,
      },
    }
  }

  component(shape) {
    const { imageData, fileName, fileSize, isLoading } = shape.props

    const handleHeightChange = (newHeight) => {
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape) {
          // Use unified height bounds
          const boundedHeight = applyHeightBounds(newHeight, 'image')
          
          // Only update if there's a significant difference (prevent feedback loops)
          if (Math.abs(currentShape.props.h - boundedHeight) > 10) {
            editor.batch(() => {
              editor.updateShape({
                id: shape.id,
                type: 'image',
                props: {
                  ...currentShape.props,
                  h: boundedHeight,
                },
              })
            })
          }
        }
      } catch (error) {
        console.error('Error updating image height:', error)
      }
    }

    return (
      <HTMLContainer 
        id={shape.id}
        style={{
          pointerEvents: 'all',
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ImageViewer
          imageData={imageData}
          fileName={fileName}
          fileSize={fileSize}
          isLoading={isLoading}
          width={shape.props.w}
          height={shape.props.h}
          onHeightChange={handleHeightChange}
        />
      </HTMLContainer>
    )
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

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
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape) {
          // Use unified height bounds
          const boundedHeight = applyHeightBounds(newHeight, 'link')
          
          // Only update if there's a significant difference (prevent feedback loops)
          if (Math.abs(currentShape.props.h - boundedHeight) > 5) {
            editor.batch(() => {
              editor.updateShape({
                id: shape.id,
                type: 'link',
                props: {
                  ...currentShape.props,
                  h: boundedHeight,
                },
              })
            })
          }
        }
      } catch (error) {
        console.error('Error updating link height:', error)
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
          // Find optimal position to avoid overlaps
          const shapeW = 560
          const shapeH = 315
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            type: 'embed',
            x: position.x,
            y: position.y,
            props: {
              url: pastedText,
              w: shapeW,
              h: shapeH,
            },
          })
          
          // Smoothly center camera on the new shape
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100) // Small delay to ensure shape is created
          
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
          
          // Find optimal position to avoid overlaps
          const shapeW = 1600
          const shapeH = calculateExcelHeight([], false, true) // Google Sheets
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            id: shapeId,
            type: 'excel-table',
            x: position.x,
            y: position.y,
            props: {
              w: shapeW,
              h: shapeH,
              data: [],
              fileName: sheetName,
              currentPage: 0,
              isLoading: true,
            },
          })
          
          // Smoothly center camera on the new shape
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100) // Small delay to ensure shape is created

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
          // Find optimal position to avoid overlaps
          const shapeW = 400
          const shapeH = 80
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            type: 'link',
            x: position.x,
            y: position.y,
            props: {
              url: pastedText,
              w: shapeW,
              h: shapeH,
            },
          })
          
          // Smoothly center camera on the new shape
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100) // Small delay to ensure shape is created
          
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
        console.log('Excel file processing started:', file.name)

        // Process Excel file with AI enhancement
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Step 1: Immediate preview with standard processing
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]
        const standardJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        
        // Check if workbook has multiple sheets
        const hasMultipleSheets = workbook.SheetNames.length > 1
        let sheets = null
        let sheetNames = []
        let currentSheet = null
        
        if (hasMultipleSheets) {
          // Process all sheets for the dropdown
          const allSheets = {}
          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })
            if (jsonData.length > 0) {
              allSheets[sheetName] = jsonData
            }
          })
          sheets = allSheets
          sheetNames = Object.keys(allSheets)
          currentSheet = sheetNames[0]
        }
        
        const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
        const shapeW = 1600
        const shapeH = 650
        const position = findOptimalShapePosition(editor, shapeW, shapeH)
        
        // Create immediate preview with standard processing
        const batchSize = 50
        const firstBatch = standardJsonData.slice(0, batchSize)
        
        editor.createShape({
          id: shapeId,
          type: 'excel-table',
          x: position.x,
          y: position.y,
          props: {
            w: shapeW,
            h: shapeH,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: standardJsonData.length > batchSize,
            isInitialLoading: false,
            loadingMessage: '📊 Quick Preview',
            loadingSubMessage: `${standardJsonData.length} rows loaded`,
            // Include sheet data if available
            sheets: sheets,
            sheetNames: sheetNames,
            currentSheet: currentSheet
          },
        })

        // Center camera on the new shape
        setTimeout(() => {
          centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
        }, 100)
        
        // Step 2: Start AI processing in background with progress in card
        // Add AI processing state to shape
        editor.updateShape({
          id: shapeId,
          type: 'excel-table',
          props: {
            w: shapeW,
            h: shapeH,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: standardJsonData.length > batchSize,
            isInitialLoading: false,
            loadingMessage: '📊 Quick Preview',
            loadingSubMessage: `${standardJsonData.length} rows loaded`,
            isAIProcessing: true,
            aiProgress: 0,
            aiMessage: 'Enhancing with AI...',
            // Include sheet data if available
            sheets: sheets,
            sheetNames: sheetNames,
            currentSheet: currentSheet
          },
        })
        
        // Background AI processing with progress updates
        setTimeout(async () => {
          try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
              const currentShape = editor.getShape(shapeId)
              if (currentShape && currentShape.props.isAIProcessing) {
                const currentProgress = currentShape.props.aiProgress || 0
                const newProgress = Math.min(currentProgress + 10, 90) // Don't go to 100% until complete
                
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    aiProgress: newProgress,
                  },
                })
              }
            }, 400) // Update every 400ms
            
            const aiProcessingResult = await processExcelWithAI(workbook, file.name)
            const aiJsonData = aiProcessingResult.data
            
            clearInterval(progressInterval)
            
            // Log AI processing results
            if (aiProcessingResult.metadata.source === 'ai') {
              console.log(`✅ AI successfully processed Excel file with ${aiProcessingResult.metadata.confidence * 100}% confidence`)
              console.log(`📊 Extracted ${aiProcessingResult.metadata.rowCount} rows`)
              console.log(`📝 Generated title: "${aiProcessingResult.metadata.generatedTitle}"`)
              
              // Update table with AI-enhanced data
              const aiFirstBatch = aiJsonData.slice(0, batchSize)
              
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  w: shapeW,
                  h: shapeH,
                  data: aiFirstBatch,
                  fileName: file.name,
                  generatedTitle: aiProcessingResult.metadata.generatedTitle,
                  currentPage: 0,
                  isLoading: aiJsonData.length > batchSize,
                  isInitialLoading: false,
                  loadingMessage: 'AI Enhanced Processing',
                  loadingSubMessage: `${aiProcessingResult.metadata.rowCount} rows extracted with AI`,
                  isAIProcessing: false,
                  aiProgress: 100,
                  aiMessage: '✅ AI Enhancement Complete',
                  // Include sheet data if available
                  sheets: aiProcessingResult.sheets || null,
                  sheetNames: aiProcessingResult.sheetNames || [],
                  currentSheet: aiProcessingResult.currentSheet || null
                },
              })
              
              // Continue with background loading if needed
              if (aiJsonData.length > batchSize) {
                Promise.resolve().then(async () => {
                  const backgroundStartCheck = editor.getShape(shapeId)
                  if (!backgroundStartCheck) return
                  
                  let processedData = [...aiFirstBatch]
                  
                  for (let i = batchSize; i < aiJsonData.length; i += batchSize) {
                    const batch = aiJsonData.slice(i, i + batchSize)
                    processedData = [...processedData, ...batch]
                    
                    const currentShape = editor.getShape(shapeId)
                    if (currentShape) {
                      editor.updateShape({
                        id: shapeId,
                        type: 'excel-table',
                        props: {
                          ...currentShape.props,
                          data: processedData,
                          isLoading: i + batchSize < aiJsonData.length,
                        },
                      })
                    }
                    
                    if (i + batchSize < aiJsonData.length) {
                      await new Promise(resolve => setTimeout(resolve, 50))
                    }
                  }
                })
              }
              
            } else {
              console.log('⚠️ AI processing failed or unavailable, keeping standard results')
              // Remove AI processing indicator
              const currentShape = editor.getShape(shapeId)
              if (currentShape) {
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    isAIProcessing: false,
                    aiProgress: 0,
                    aiMessage: ''
                  },
                })
              }
            }
            
          } catch (error) {
            console.error('Background AI processing failed:', error)
            
            // Remove AI processing indicator on error
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  ...currentShape.props,
                  isAIProcessing: false,
                  aiProgress: 0,
                  aiMessage: ''
                },
              })
            }
          }
        }, 500) // Small delay to show progress bar
        
        // Smoothly center camera on the new shape
        setTimeout(() => {
          centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
        }, 100) // Small delay to ensure shape is created
        
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

  // Handle TLdraw mounting and register custom file and URL handlers
  const handleMount = useCallback((editor) => {
    // Register external content handler for files and URLs
    editor.registerExternalContentHandler('files', async (content) => {
      const { files, point } = content
      
      // Find supported files (Excel, PDF, and Images)
      const excelFiles = files.filter(detectExcelFile)
      const pdfFiles = files.filter(detectPDFFile)
      const imageFiles = files.filter(detectImageFile)
      
      if (excelFiles.length === 0 && pdfFiles.length === 0 && imageFiles.length === 0) {
        return // Let TLdraw handle other file types
      }

      // Note: point parameter indicates drop position, but we'll use optimal positioning instead
      // to ensure cards don't overlap, regardless of where they're dropped

      // Process PDF files first (if any)
      if (pdfFiles.length > 0) {
        const file = pdfFiles[0]
        
        try {
          console.log('PDF file processing started:', file.name)
          
          const shapeId = `shape:pdf_${Date.now()}_${Math.random().toString(36).substring(2)}`
          const loadingMessage = 'Loading PDF Document'
          const loadingSubMessage = 'Processing file content...'

          // Find optimal position to avoid overlaps
          const shapeW = 800
          const shapeH = 600
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            id: shapeId,
            type: 'pdf-viewer',
            x: position.x,
            y: position.y,
            props: {
              fileName: file.name,
              fileSize: file.size,
              fileData: null,
              currentPage: 0,
              isLoading: false,
              isInitialLoading: true,
              loadingMessage,
              loadingSubMessage,
              w: shapeW,
              h: shapeH,
            },
          })
          
          // Smoothly center camera on the new shape
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100) // Small delay to ensure shape is created

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

        // Process Excel file with AI enhancement
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Step 1: Immediate preview with standard processing
        const worksheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[worksheetName]
        const standardJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        
        // Check if workbook has multiple sheets
        const hasMultipleSheets = workbook.SheetNames.length > 1
        let sheets = null
        let sheetNames = []
        let currentSheet = null
        
        if (hasMultipleSheets) {
          // Process all sheets for the dropdown
          const allSheets = {}
          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })
            if (jsonData.length > 0) {
              allSheets[sheetName] = jsonData
            }
          })
          sheets = allSheets
          sheetNames = Object.keys(allSheets)
          currentSheet = sheetNames[0]
        }
        
        const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
        const shapeW = 1600
        const shapeH = 650
        const position = findOptimalShapePosition(editor, shapeW, shapeH)
        
        // Create immediate preview with standard processing
        const batchSize = 50
        const firstBatch = standardJsonData.slice(0, batchSize)
        
        editor.createShape({
          id: shapeId,
          type: 'excel-table',
          x: position.x,
          y: position.y,
          props: {
            w: shapeW,
            h: shapeH,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: standardJsonData.length > batchSize,
            isInitialLoading: false,
            loadingMessage: '📊 Quick Preview',
            loadingSubMessage: `${standardJsonData.length} rows loaded`,
            // Include sheet data if available
            sheets: sheets,
            sheetNames: sheetNames,
            currentSheet: currentSheet
          },
        })

        // Center camera on the new shape
        setTimeout(() => {
          centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
        }, 100)
        
        // Step 2: Start AI processing in background with progress in card
        // Add AI processing state to shape
        editor.updateShape({
          id: shapeId,
          type: 'excel-table',
          props: {
            w: shapeW,
            h: shapeH,
            data: firstBatch,
            fileName: file.name,
            currentPage: 0,
            isLoading: standardJsonData.length > batchSize,
            isInitialLoading: false,
            loadingMessage: '📊 Quick Preview',
            loadingSubMessage: `${standardJsonData.length} rows loaded`,
            isAIProcessing: true,
            aiProgress: 0,
            aiMessage: 'Enhancing with AI...'
          },
        })
        
        // Background AI processing with progress updates
        setTimeout(async () => {
          try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
              const currentShape = editor.getShape(shapeId)
              if (currentShape && currentShape.props.isAIProcessing) {
                const currentProgress = currentShape.props.aiProgress || 0
                const newProgress = Math.min(currentProgress + 10, 90) // Don't go to 100% until complete
                
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    aiProgress: newProgress,
                  },
                })
              }
            }, 400) // Update every 400ms
            
            const aiProcessingResult = await processExcelWithAI(workbook, file.name)
            const aiJsonData = aiProcessingResult.data
            
            clearInterval(progressInterval)
            
            // Log AI processing results
            if (aiProcessingResult.metadata.source === 'ai') {
              console.log(`✅ AI successfully processed Excel file with ${aiProcessingResult.metadata.confidence * 100}% confidence`)
              console.log(`📊 Extracted ${aiProcessingResult.metadata.rowCount} rows`)
              console.log(`📝 Generated title: "${aiProcessingResult.metadata.generatedTitle}"`)
              
              // Update table with AI-enhanced data
              const aiFirstBatch = aiJsonData.slice(0, batchSize)
              
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  w: shapeW,
                  h: shapeH,
                  data: aiFirstBatch,
                  fileName: file.name,
                  generatedTitle: aiProcessingResult.metadata.generatedTitle,
                  currentPage: 0,
                  isLoading: aiJsonData.length > batchSize,
                  isInitialLoading: false,
                  loadingMessage: 'AI Enhanced Processing',
                  loadingSubMessage: `${aiProcessingResult.metadata.rowCount} rows extracted with AI`,
                  isAIProcessing: false,
                  aiProgress: 100,
                  aiMessage: '✅ AI Enhancement Complete',
                  // Include sheet data if available
                  sheets: aiProcessingResult.sheets || null,
                  sheetNames: aiProcessingResult.sheetNames || [],
                  currentSheet: aiProcessingResult.currentSheet || null
                },
              })
              
              // Continue with background loading if needed
              if (aiJsonData.length > batchSize) {
                Promise.resolve().then(async () => {
                  const backgroundStartCheck = editor.getShape(shapeId)
                  if (!backgroundStartCheck) return
                  
                  let processedData = [...aiFirstBatch]
                  
                  for (let i = batchSize; i < aiJsonData.length; i += batchSize) {
                    const batch = aiJsonData.slice(i, i + batchSize)
                    processedData = [...processedData, ...batch]
                    
                    const currentShape = editor.getShape(shapeId)
                    if (currentShape) {
                      editor.updateShape({
                        id: shapeId,
                        type: 'excel-table',
                        props: {
                          ...currentShape.props,
                          data: processedData,
                          isLoading: i + batchSize < aiJsonData.length,
                        },
                      })
                    }
                    
                    if (i + batchSize < aiJsonData.length) {
                      await new Promise(resolve => setTimeout(resolve, 50))
                    }
                  }
                })
              }
              
            } else {
              console.log('⚠️ AI processing failed or unavailable, keeping standard results')
              
              // Remove AI processing indicator
              const currentShape = editor.getShape(shapeId)
              if (currentShape) {
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    ...currentShape.props,
                    isAIProcessing: false,
                    aiProgress: 0,
                    aiMessage: ''
                  },
                })
              }
              
              // Continue with standard processing for background loading if needed
              if (standardJsonData.length > batchSize) {
                Promise.resolve().then(async () => {
                  const backgroundStartCheck = editor.getShape(shapeId)
                  if (!backgroundStartCheck) return
                  
                  let processedData = [...firstBatch]
                  
                  for (let i = batchSize; i < standardJsonData.length; i += batchSize) {
                    const batch = standardJsonData.slice(i, i + batchSize)
                    processedData = [...processedData, ...batch]
                    
                    const currentShape = editor.getShape(shapeId)
                    if (currentShape) {
                      editor.updateShape({
                        id: shapeId,
                        type: 'excel-table',
                        props: {
                          ...currentShape.props,
                          data: processedData,
                          isLoading: i + batchSize < standardJsonData.length,
                        },
                      })
                    }
                    
                    if (i + batchSize < standardJsonData.length) {
                      await new Promise(resolve => setTimeout(resolve, 50))
                    }
                  }
                })
              }
            }
            
          } catch (error) {
            console.error('Background AI processing failed:', error)
            
            // Remove AI processing indicator on error
            const currentShape = editor.getShape(shapeId)
            if (currentShape) {
              editor.updateShape({
                id: shapeId,
                type: 'excel-table',
                props: {
                  ...currentShape.props,
                  isAIProcessing: false,
                  aiProgress: 0,
                  aiMessage: ''
                },
              })
            }
          }
        }, 500) // Small delay to show progress bar
        
        // Tell TLdraw we handled this content by returning VoidResult
        return { type: 'void' }
        
        } catch (error) {
          console.error('Error processing Excel file:', error)
          return // Let TLdraw handle the error
        }
      }

      // Process Image files (if any)
      if (imageFiles.length > 0) {
        const file = imageFiles[0]
        
        try {
          console.log('Image file processing started:', file.name)
          
          const shapeId = `shape:image_${Date.now()}_${Math.random().toString(36).substring(2)}`
          
          // Find optimal position to avoid overlaps
          const shapeW = 400
          const shapeH = 300
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          // Create image shape immediately while loading
          editor.createShape({
            id: shapeId,
            type: 'image',
            x: position.x,
            y: position.y,
            props: {
              fileName: file.name,
              fileSize: file.size,
              imageData: null,
              isLoading: true,
              w: shapeW,
              h: shapeH,
            },
          })

          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100)

          // Process image file in background
          setTimeout(async () => {
            try {
              // Convert file to data URL
              const reader = new FileReader()
              
              reader.onload = (e) => {
                const imageData = e.target.result
                
                // Create a temporary image to get dimensions
                const img = new Image()
                img.onload = () => {
                  // Calculate optimal size maintaining aspect ratio
                  const maxWidth = 800
                  const maxHeight = 600
                  let newWidth = img.naturalWidth
                  let newHeight = img.naturalHeight
                  
                  // Scale down if too large
                  if (newWidth > maxWidth || newHeight > maxHeight) {
                    const widthRatio = maxWidth / newWidth
                    const heightRatio = maxHeight / newHeight
                    const scale = Math.min(widthRatio, heightRatio)
                    
                    newWidth = Math.round(newWidth * scale)
                    newHeight = Math.round(newHeight * scale)
                  }
                  
                  // Ensure minimum size
                  newWidth = Math.max(newWidth, 200)
                  newHeight = Math.max(newHeight, 150)
                  
                  // Update shape with image data and optimal dimensions
                  const currentShape = editor.getShape(shapeId)
                  if (currentShape) {
                    editor.updateShape({
                      id: shapeId,
                      type: 'image',
                      props: {
                        ...currentShape.props,
                        imageData: imageData,
                        isLoading: false,
                        w: newWidth,
                        h: newHeight,
                      },
                    })
                    console.log('Image processed successfully:', file.name, `${newWidth}x${newHeight}`)
                  }
                }
                
                img.onerror = () => {
                  // Handle image load error
                  const currentShape = editor.getShape(shapeId)
                  if (currentShape) {
                    editor.updateShape({
                      id: shapeId,
                      type: 'image',
                      props: {
                        ...currentShape.props,
                        isLoading: false,
                        imageData: null,
                      },
                    })
                  }
                  console.error('Error loading image:', file.name)
                }
                
                img.src = imageData
              }
              
              reader.onerror = () => {
                console.error('Error reading image file:', file.name)
                const currentShape = editor.getShape(shapeId)
                if (currentShape) {
                  editor.updateShape({
                    id: shapeId,
                    type: 'image',
                    props: {
                      ...currentShape.props,
                      isLoading: false,
                      imageData: null,
                    },
                  })
                }
              }
              
              reader.readAsDataURL(file)
              
            } catch (error) {
              console.error('Error processing image file:', error)
              const currentShape = editor.getShape(shapeId)
              if (currentShape) {
                editor.updateShape({
                  id: shapeId,
                  type: 'image',
                  props: {
                    ...currentShape.props,
                    isLoading: false,
                    imageData: null,
                  },
                })
              }
            }
          }, 100)

          return { type: 'image', fileName: file.name, fileSize: file.size }
          
        } catch (error) {
          console.error('Error processing image file:', error)
          return // Let TLdraw handle the error
        }
      }
    })

    // Register external content handler for URLs (right-click paste)
    editor.registerExternalContentHandler('url', async (content) => {
      const { url } = content
      
      if (!url) return
      
      try {
        // Handle different URL types the same way as our paste handlers
        if (detectYouTubeURL(url)) {
          // Create YouTube embed
          const shapeW = 560
          const shapeH = 315
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            type: 'embed',
            x: position.x,
            y: position.y,
            props: {
              url: url,
              w: shapeW,
              h: shapeH,
            },
          })
          
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100)
          
          console.log('YouTube video embedded (right-click):', url)
          return { type: 'embed', url, w: shapeW, h: shapeH }
          
        } else if (detectGoogleSheetsURL(url)) {
          // Handle Google Sheets URL with full data fetching
          const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
          const shapeW = 1600
          const shapeH = 650
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            id: shapeId,
            type: 'excel-table',
            x: position.x,
            y: position.y,
            props: {
              w: shapeW,
              h: shapeH,
              data: [],
              fileName: 'Google Sheet',
              currentPage: 0,
              isLoading: true,
            },
          })
          
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100)
          
          // Fetch Google Sheets data in background (same logic as paste handler)
          setTimeout(async () => {
            try {
              const csvUrl = getGoogleSheetsCsvUrl(url)
              if (!csvUrl) return
              
              // Try fetching data with fallback logic
              let csvData = null
              const proxies = [
                `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(csvUrl)}`,
                `https://cors-anywhere.herokuapp.com/${csvUrl}`,
                `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`
              ]
              
              for (const proxyUrl of proxies) {
                try {
                  const response = await fetch(proxyUrl)
                  if (response.ok) {
                    csvData = await response.text()
                    if (proxyUrl.includes('allorigins.win')) {
                      const jsonResponse = JSON.parse(csvData)
                      csvData = jsonResponse.contents
                    }
                    break
                  }
                } catch (error) {
                  continue
                }
              }
              
              if (csvData) {
                // Parse CSV and update shape
                const lines = csvData.split('\n').filter(line => line.trim())
                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
                const jsonData = lines.slice(1).map(line => {
                  const values = line.split(',').map(v => v.replace(/"/g, '').trim())
                  const obj = {}
                  headers.forEach((header, index) => {
                    obj[header] = values[index] || ''
                  })
                  return obj
                })
                
                editor.updateShape({
                  id: shapeId,
                  type: 'excel-table',
                  props: {
                    data: jsonData,
                    fileName: 'Google Sheet',
                    currentPage: 0,
                    isLoading: false,
                  },
                })
              }
            } catch (error) {
              console.error('Error fetching Google Sheets data (right-click):', error)
            }
          }, 100)
          
          console.log('Google Sheets processing (right-click):', url)
          return { type: 'excel-table', url, w: shapeW, h: shapeH }
          
        } else if (detectGenericWebsiteURL(url)) {
          // Create our custom link shape for all other websites
          const shapeW = 400
          const shapeH = 80
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          editor.createShape({
            type: 'link',
            x: position.x,
            y: position.y,
            props: {
              url: url,
              w: shapeW,
              h: shapeH,
            },
          })
          
          setTimeout(() => {
            centerCameraOnShape(editor, position.x, position.y, shapeW, shapeH)
          }, 100)
          
          console.log('Website link created (right-click):', url)
          return { type: 'link', url, w: shapeW, h: shapeH }
        }
        
        // For other URLs (like Figma, Twitter, etc.), let TLDraw handle them natively
        return
        
      } catch (error) {
        console.error('Error handling URL in external content handler:', error)
        return
      }
    })
  }, [])

  return (
    <ErrorBoundary>
      <div style={{ position: 'fixed', inset: 0 }} onKeyDown={handleKeyDown}>
        <Header />
        <Tldraw
          shapeUtils={[ExcelTableShapeUtil, PDFViewerShapeUtil, ImageShapeUtil, LinkShapeUtil]}
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
