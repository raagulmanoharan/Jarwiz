import React, { useState, useRef, useEffect, useMemo } from 'react'
import './excel-table.css'

function ExcelTable({ data, fileName, isLoading = false, currentPage = 0, onPageChange, onHeightChange }) {
  const [itemsPerPage] = useState(10)
  const containerRef = useRef(null)
  

  

  
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, data.length)
  const currentData = data.slice(startIndex, endIndex)
  
  // Get headers from first row of data
  const headers = data.length > 0 ? Object.keys(data[0]) : []
  
  // Cache column types to avoid recalculation
  const columnTypes = useMemo(() => {
    // Move getColumnType logic inside useMemo to avoid dependency issues
    const analyzeColumnType = (header, columnData) => {
      try {
        if (!header || typeof header !== 'string') return 'col-auto'
        
        const headerLower = header.toLowerCase()
        
        // Analyze column name patterns
        if (headerLower.includes('id') || headerLower.includes('code') || headerLower.includes('number')) {
          return 'col-short'
        }
        
        if (headerLower.includes('feedback') || headerLower.includes('description') || 
            headerLower.includes('comment') || headerLower.includes('notes') ||
            headerLower.includes('message') || headerLower.includes('text')) {
          return 'col-long'
        }
        
        if (headerLower.includes('name') || headerLower.includes('title') || 
            headerLower.includes('category') || headerLower.includes('type') ||
            headerLower.includes('status') || headerLower.includes('record')) {
          return 'col-medium'
        }
        
        // Analyze actual content
        if (columnData && columnData.length > 0) {
          const sampleValues = columnData.slice(0, Math.min(10, columnData.length))
          const avgLength = sampleValues.reduce((sum, val) => {
            const str = (val === null || val === undefined) ? '' : String(val)
            return sum + str.length
          }, 0) / sampleValues.length
          
          if (avgLength <= 10) return 'col-short'
          if (avgLength <= 30) return 'col-medium'
          if (avgLength > 50) return 'col-long'
        }
        
        return 'col-auto'
      } catch (error) {
        console.warn('Error in analyzeColumnType:', error)
        return 'col-auto'
      }
    }

    const types = {}
    if (headers.length > 0 && data.length > 0) {
      headers.forEach(header => {
        try {
          const columnData = data.map(row => row[header] || '')
          types[header] = analyzeColumnType(header, columnData)
        } catch (error) {
          console.warn(`Error analyzing column ${header}:`, error)
          types[header] = 'col-auto'
        }
      })
    }
    return types
  }, [headers, data])
  
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages && onPageChange) {
      console.log('Page change:', currentPage, '→', newPage)
      onPageChange(newPage)
    }
  }

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') {
      // Format numbers with appropriate decimal places
      return value % 1 === 0 ? value.toString() : value.toFixed(1)
    }
    return value.toString()
  }



  // Simplified height calculation to prevent infinite loops
  useEffect(() => {
    if (onHeightChange) {
      // Calculate expected height based on content
      const headerHeight = 80  // Header with file info and pagination
      const rowHeight = 50     // Approximate height per row with better spacing
      const visibleRows = Math.min(currentData.length, itemsPerPage)
      const tableHeight = headerHeight + (visibleRows * rowHeight) + 70 // padding
      
      // Only report a calculated height to prevent measurement loops
      onHeightChange(tableHeight)
    }
  }, [data.length, currentPage, itemsPerPage]) // Remove onHeightChange from dependencies



  return (
    <div ref={containerRef} className="excel-table-container">
      {/* Header with file info */}
      <div className="excel-table-header">
        <div className="file-info">
          <div className="file-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#1a7f37"/>
              <path d="M14 2V8H20" fill="#ffffff"/>
              <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">XLS</text>
            </svg>
          </div>
          <div className="file-details">
            <span className="file-name">{fileName}</span>
            <span className="file-size">
              {data.length > 0 ? (isLoading ? `${data.length}+ rows` : `${data.length} rows`) : 'Loading...'}
            </span>
          </div>
        </div>
        
        {data.length > 0 && totalPages > 1 && (
          <div className="pagination-info">
            <div className="pagination-display">
              {isLoading && (
                <div className="pagination-loading">
                  <div className="loading-spinner tiny"></div>
                </div>
              )}
              <span>{currentPage + 1}/{totalPages}</span>
            </div>
            <div className="pagination-controls">
              <button 
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  
                  if (currentPage > 0) {
                    handlePageChange(currentPage - 1)
                  }
                }}
                disabled={currentPage === 0}
                className="pagination-btn"
                style={{
                  pointerEvents: 'auto',
                  zIndex: 50,
                  position: 'relative'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}/>
                </svg>
              </button>
              <button 
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.nativeEvent.stopImmediatePropagation()
                  
                  if (currentPage < totalPages - 1) {
                    handlePageChange(currentPage + 1)
                  }
                }}
                disabled={currentPage === totalPages - 1}
                className="pagination-btn"
                style={{
                  pointerEvents: 'auto',
                  zIndex: 50,
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

      {/* Table content */}
      <div className="table-content">
        {data.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading Excel data...</span>
          </div>
        ) : (
          <table className="excel-data-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className={`table-header ${columnTypes[header] || 'col-auto'}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, rowIndex) => (
                <tr key={startIndex + rowIndex} className={rowIndex % 2 === 0 ? 'even-row' : 'odd-row'}>
                  {headers.map((header, colIndex) => (
                    <td key={colIndex} className={`table-cell ${columnTypes[header] || 'col-auto'}`}>
                      {formatCellValue(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ExcelTable
