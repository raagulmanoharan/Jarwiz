import React from 'react'
import { useEditor } from '@tldraw/tldraw'
import { detectYouTubeURL } from '../utils/urlUtils.js'
import { findOptimalShapePosition, createShapeAndCenterCamera } from '../utils/cameraUtils.js'

// Component to handle YouTube URL pasting
export function YouTubePasteHandler() {
  const editor = useEditor()

  React.useEffect(() => {
    if (!editor) return

    const handlePaste = async (e) => {
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
          
          createShapeAndCenterCamera(editor, {
            type: 'embed',
            x: position.x,
            y: position.y,
            props: {
              url: pastedText,
              w: shapeW,
              h: shapeH,
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
