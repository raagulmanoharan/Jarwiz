import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import LoadingCard from './LoadingCard'
import './pdf-viewer.css'

// Configure PDF.js worker for Vite development
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const PDFViewer = ({ 
  fileName, 
  fileSize, 
  fileData, 
  currentPage = 0, 
  isLoading = false,
  isInitialLoading = false,
  loadingMessage = '',
  loadingSubMessage = '',
  onPageChange,
  onHeightChange,
}) => {
  // All hooks must be called before any conditional logic
  const [numPages, setNumPages] = useState(null)
  const [pageWidth, setPageWidth] = useState(null)
  const [pageHeight, setPageHeight] = useState(null) 
  const [loadError, setLoadError] = useState(null)
  const containerRef = useRef(null)

  // Simple height calculation exactly like Excel cards
  useEffect(() => {
    if (onHeightChange && pageHeight) {
      // Calculate expected height based on content (same pattern as Excel)
      const headerHeight = 80  // Header with file info and pagination
      const contentHeight = pageHeight // Actual PDF page height
      const totalHeight = headerHeight + contentHeight + 70 // padding
      
      // Only report a calculated height to prevent measurement loops
      onHeightChange(totalHeight)
    }
  }, [pageHeight, onHeightChange]) // Same dependencies pattern as Excel

  // Show loading card if initially loading (after all hooks)
  if (isInitialLoading) {
    return (
      <LoadingCard 
        message={loadingMessage || 'Loading PDF Document'} 
        subMessage={loadingSubMessage || 'Processing file content...'} 
        fileName={fileName}
        fileType="PDF"
      />
    )
  }

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    console.log('PDF loaded successfully:', nextNumPages, 'pages')
    setNumPages(nextNumPages)
    setLoadError(null)
  }

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error)
    setLoadError('Failed to load PDF document')
    setNumPages(null)
  }

  const onPageLoadSuccess = (page) => {
    const viewport = page.getViewport({ scale: 1 })
    setPageWidth(viewport.width)
    setPageHeight(viewport.height)
  }

  const handlePrevPage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation()
    }
    
    if (currentPage > 0 && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation()
    }
    
    if (currentPage < numPages - 1 && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="pdf-viewer-container"
    >
      {/* PDF Header */}
      <div className="pdf-viewer-header">
        <div className="file-info">
          <div className="file-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#dc2626"/>
              <path d="M14 2V8H20" fill="#ffffff"/>
              <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">PDF</text>
            </svg>
          </div>
          <div className="file-details">
            <span className="file-name">{fileName}</span>
            <span className="file-meta">
              {formatFileSize(fileSize)} • PDF Document
              {numPages && ` • ${numPages} page${numPages > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Pagination Controls in Header */}
        {numPages && numPages > 1 && (
          <div className="pagination-info">
            <div className="pagination-display">
              {isLoading && (
                <div className="pagination-loading">
                  <div className="loading-spinner tiny"></div>
                </div>
              )}
              <span>{currentPage + 1}/{numPages}</span>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onMouseDown={handlePrevPage}
                disabled={currentPage === 0}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}/>
                </svg>
              </button>
              <button
                className="pagination-btn"
                onMouseDown={handleNextPage}
                disabled={currentPage === numPages - 1}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Content */}
      <div className="pdf-content">
        {loadError ? (
          <div className="pdf-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{loadError}</div>
            <div className="error-details">Please check if the file is a valid PDF document.</div>
          </div>
        ) : fileData ? (
          <div className="pdf-document-container">
            <Document
              file={fileData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="pdf-document-loading">
                  <div className="spinner"></div>
                  <span>Loading PDF...</span>
                </div>
              }
              error={
                <div className="pdf-error">
                  <div className="error-icon">⚠️</div>
                  <div className="error-message">Failed to load PDF</div>
                </div>
              }
            >
              {numPages && (
                <div className="pdf-page-container">
                  <Page
                    pageNumber={currentPage + 1}
                    onLoadSuccess={onPageLoadSuccess}
                    width={pageWidth || 600}
                    loading={
                      <div className="pdf-page-loading">
                        <div className="spinner"></div>
                        <span>Loading page {currentPage + 1}...</span>
                      </div>
                    }
                    error={
                      <div className="pdf-page-error">
                        <div className="error-icon">⚠️</div>
                        <div className="error-message">Failed to load page {currentPage + 1}</div>
                      </div>
                    }
                  />
                </div>
              )}
            </Document>
          </div>
        ) : (
          <div className="pdf-placeholder">
            <div className="placeholder-icon">📄</div>
            <div className="placeholder-message">No PDF content available</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
