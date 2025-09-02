import React from 'react'
import { useEditor } from '@tldraw/tldraw'
import { detectExcelFile, detectPDFFile, detectImageFile, formatFileSize } from '../utils/fileUtils.js'
import { detectGoogleSheetsURL, detectGenericWebsiteURL } from '../utils/urlUtils.js'
import { findOptimalShapePosition, createShapeAndCenterCamera } from '../utils/cameraUtils.js'
import { processExcelWithAI } from '../utils/aiExcelProcessor.js'
import * as XLSX from 'xlsx'

// Component to handle file drag and drop
export function FileDropHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handleDrop = async (e) => {
      e.preventDefault()
      e.stopPropagation()

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      // Find Excel files
      const excelFiles = files.filter(detectExcelFile)
      if (excelFiles.length > 0) {
        await handleExcelFile(excelFiles[0])
        return
      }

      // Find PDF files
      const pdfFiles = files.filter(detectPDFFile)
      if (pdfFiles.length > 0) {
        await handlePDFFile(pdfFiles[0])
        return
      }

      // Find image files
      const imageFiles = files.filter(detectImageFile)
      if (imageFiles.length > 0) {
        await handleImageFile(imageFiles[0])
        return
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('drop', handleDrop)
    document.addEventListener('dragover', handleDragOver)

    return () => {
      document.removeEventListener('drop', handleDrop)
      document.removeEventListener('dragover', handleDragOver)
    }
  }, [editor])

  const handleExcelFile = async (file) => {
    try {
      console.log('Excel file processing started:', file.name)

      // Process Excel file with AI enhancement
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Step 1: Immediate preview with standard processing
      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      const standardJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      
      const shapeId = `shape:excel_${Date.now()}_${Math.random().toString(36).substring(2)}`
      const shapeW = 1600
      const shapeH = 650
      const position = findOptimalShapePosition(editor, shapeW, shapeH)
      
      // Create immediate preview with standard processing
      const batchSize = 50
      const firstBatch = standardJsonData.slice(0, batchSize)
      
      createShapeAndCenterCamera(editor, {
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
        },
      })

      // Step 2: Start AI processing in background
      setTimeout(async () => {
        try {
          const aiProcessingResult = await processExcelWithAI(workbook, file.name)
          const aiJsonData = aiProcessingResult.data
          
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
              sheets: aiProcessingResult.sheets || null,
              sheetNames: aiProcessingResult.sheetNames || [],
              currentSheet: aiProcessingResult.sheetNames?.[0] || null,
            },
          })
        } catch (error) {
          console.error('AI processing failed:', error)
        }
      }, 100)

    } catch (error) {
      console.error('Error processing Excel file:', error)
    }
  }

  const handlePDFFile = async (file) => {
    try {
      console.log('PDF file processing started:', file.name)

      const shapeId = `shape:pdf_${Date.now()}_${Math.random().toString(36).substring(2)}`
      const loadingMessage = '📄 Loading PDF...'
      const loadingSubMessage = 'Processing file content...'

      // Find optimal position to avoid overlaps
      const shapeW = 800
      const shapeH = 600
      const position = findOptimalShapePosition(editor, shapeW, shapeH)
      
      createShapeAndCenterCamera(editor, {
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

      // Process PDF file in background
      setTimeout(async () => {
        try {
          // Read PDF as ArrayBuffer and convert to base64 data URL
          const arrayBuffer = await file.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)
          
          let binaryString = ''
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i])
          }
          
          const base64String = btoa(binaryString)
          const fileData = 'data:application/pdf;base64,' + base64String

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
        } catch (error) {
          console.error('Error processing PDF:', error)
        }
      }, 100)

    } catch (error) {
      console.error('Error processing PDF file:', error)
    }
  }

  const handleImageFile = async (file) => {
    try {
      console.log('Image file processing started:', file.name)

      const shapeId = `shape:image_${Date.now()}_${Math.random().toString(36).substring(2)}`
      const shapeW = 400
      const shapeH = 300
      const position = findOptimalShapePosition(editor, shapeW, shapeH)
      
      // Create image shape immediately while loading
      createShapeAndCenterCamera(editor, {
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
              console.error('Error loading image:', file.name)
            }
            
            img.src = imageData
          }
          
          reader.onerror = () => {
            console.error('Error reading image file:', file.name)
          }
          
          reader.readAsDataURL(file)
        } catch (error) {
          console.error('Error processing image file:', error)
        }
      }, 100)

    } catch (error) {
      console.error('Error processing image file:', error)
    }
  }

  return null // This component doesn't render anything
}
