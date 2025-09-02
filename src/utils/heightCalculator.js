// Unified height calculation system for all card types
export const calculateCardHeight = (cardType, contentData = {}) => {
  const baseHeaderHeight = 60 // Standard header height for all cards
  const basePadding = 40 // Standard padding
  
  switch (cardType) {
    case 'excel-table': {
      const { data = [], hasMultipleSheets = false, isGoogleSheets = false, isLoading = false } = contentData
      
      if (isLoading) {
        // Loading state - use minimum height
        return baseHeaderHeight + 300 + basePadding
      }
      
      if (data.length === 0) {
        // Empty state - use minimum height
        return baseHeaderHeight + 300 + basePadding
      }
      
      // Calculate based on actual data
      const tableHeaderHeight = 40
      const rowHeight = 60
      const totalRows = Math.min(data.length, 20) // Cap at 20 rows for reasonable height
      const tableHeight = tableHeaderHeight + (totalRows * rowHeight)
      const controlsHeight = hasMultipleSheets ? 50 : 0
      const aiProgressHeight = contentData.isAIProcessing ? 60 : 0
      
      return baseHeaderHeight + controlsHeight + tableHeight + aiProgressHeight + basePadding
    }
      
    case 'pdf-viewer': {
      const { pageHeight = 600, isLoading = false } = contentData
      
      if (isLoading) {
        return baseHeaderHeight + 400 + basePadding
      }
      
      return baseHeaderHeight + pageHeight + basePadding
    }
      
    case 'image': {
      const { imageHeight = 300, isLoading = false } = contentData
      
      if (isLoading) {
        return baseHeaderHeight + 300 + basePadding
      }
      
      return baseHeaderHeight + imageHeight + basePadding
    }
      
    case 'link': {
      const { hasPreview = false, hasSummary = false, isLoading = false } = contentData
      const headerHeight = 60 // Header with website info
      
      if (isLoading) {
        return headerHeight + 200 + basePadding
      }
      
      // Calculate based on content
      const previewHeight = hasPreview ? 225 : 0 // 16:9 aspect ratio
      const summaryHeight = hasSummary ? 80 : 0 // AI summary section
      const fallbackHeight = (!hasPreview && !hasSummary) ? 100 : 0 // Fallback content
      
      return headerHeight + previewHeight + summaryHeight + fallbackHeight + basePadding
    }
      
    default:
      return 300 // Default fallback height
  }
}

// Height bounds for different card types to prevent infinite growth
export const getHeightBounds = (cardType) => {
  switch (cardType) {
    case 'excel-table':
      return { min: 200, max: 1500 }
    case 'pdf-viewer':
      return { min: 400, max: 1200 }
    case 'image':
      return { min: 200, max: 900 }
    case 'link':
      return { min: 180, max: 600 }
    default:
      return { min: 200, max: 1000 }
  }
}

// Apply height bounds to prevent infinite growth
export const applyHeightBounds = (height, cardType) => {
  const bounds = getHeightBounds(cardType)
  return Math.min(Math.max(height, bounds.min), bounds.max)
}

// New function to measure actual content height
export const measureContentHeight = (element) => {
  if (!element) return 0
  
  const rect = element.getBoundingClientRect()
  return rect.height
}

// New function to calculate height based on content measurement
export const calculateHeightFromContent = (cardType, contentElement, additionalData = {}) => {
  if (!contentElement) {
    return calculateCardHeight(cardType, additionalData)
  }
  
  const contentHeight = measureContentHeight(contentElement)
  const baseHeaderHeight = 60
  const basePadding = 40
  
  // Add header height and padding to content height
  const totalHeight = baseHeaderHeight + contentHeight + basePadding
  
  // Apply bounds
  return applyHeightBounds(totalHeight, cardType)
}
