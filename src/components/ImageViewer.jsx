import React, { useState } from 'react'
import LoadingCard from './LoadingCard'
import { calculateCardHeight } from '../utils/heightCalculator'
import './image-viewer.css'

function ImageViewer({ 
  imageData, 
  fileName, 
  fileSize, 
  isLoading = false,
  width,
  height,
  onHeightChange
}) {
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  // Unified height calculation
  useEffect(() => {
    if (onHeightChange && imageDimensions.height > 0) {
      const height = calculateCardHeight('image', { 
        imageHeight: imageDimensions.height,
        isLoading: !imageDimensions.height
      })
      onHeightChange(height)
    }
  }, [imageDimensions.height, onHeightChange])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = (event) => {
    setImageError(false)
    const img = event.target
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
  }

  // Show loading card during initial loading
  if (isLoading) {
    return (
      <LoadingCard
        message="Loading Image"
        subMessage="Processing file..."
        fileName={fileName}
        fileType="image"
      />
    )
  }

  if (imageError || !imageData) {
    return (
      <div className="image-viewer-container">
        <div className="image-error">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 19 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#666"/>
            </svg>
          </div>
          <div className="error-text">
            <div className="error-title">Failed to load image</div>
            <div className="error-subtitle">{fileName}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="image-viewer-container">
      {/* Header with file info */}
      <div className="image-header">
        <div className="file-info">
          <div className="file-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 19 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#4A90E2"/>
            </svg>
          </div>
          <div className="file-details">
            <span className="file-name">{fileName}</span>
            <span className="file-size">{formatFileSize(fileSize)}</span>
          </div>
        </div>
      </div>

      {/* Image content */}
      <div className="image-content">
        <img
          src={imageData}
          alt={fileName}
          className="image-display"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            width: 'auto',
            height: 'auto',
          }}
        />
      </div>
    </div>
  )
}

export default ImageViewer
