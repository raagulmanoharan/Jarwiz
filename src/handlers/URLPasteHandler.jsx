import React from 'react'
import { useEditor } from '@tldraw/tldraw'
import { detectGoogleSheetsURL, detectGenericWebsiteURL, getGoogleSheetsCsvUrl } from '../utils/urlUtils.js'
import { findOptimalShapePosition, createShapeAndCenterCamera } from '../utils/cameraUtils.js'

// Component to handle URL pasting (Google Sheets, website links)
export function URLPasteHandler() {
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
          const shapeH = 650
          const position = findOptimalShapePosition(editor, shapeW, shapeH)
          
          createShapeAndCenterCamera(editor, {
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
          
          // Fetch Google Sheets data in background
          setTimeout(async () => {
            try {
              const csvUrl = getGoogleSheetsCsvUrl(pastedText)
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
              console.error('Error fetching Google Sheets data:', error)
            }
          }, 100)
          
          console.log('Google Sheets processing:', pastedText)
        } catch (error) {
          console.error('Error processing Google Sheets URL:', error)
        }
      }

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
          
          createShapeAndCenterCamera(editor, {
            type: 'link',
            x: position.x,
            y: position.y,
            props: {
              url: pastedText,
              w: shapeW,
              h: shapeH,
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
