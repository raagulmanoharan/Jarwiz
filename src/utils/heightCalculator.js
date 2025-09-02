// Unified height calculation system for all card types
export const calculateCardHeight = (cardType, contentData = {}) => {
  const baseHeaderHeight = 60 // Standard header height for all cards
  const basePadding = 40 // Standard padding
  
  switch (cardType) {
    case 'excel-table':
      const { data = [], hasMultipleSheets = false, isGoogleSheets = false } = contentData
      const tableHeaderHeight = 40
      const rowHeight = 60
      const totalRows = data.length
      const tableHeight = tableHeaderHeight + (totalRows * rowHeight)
      const controlsHeight = hasMultipleSheets ? 50 : 0
      const aiProgressHeight = contentData.isAIProcessing ? 60 : 0
      
      return Math.max(300, baseHeaderHeight + controlsHeight + tableHeight + aiProgressHeight + basePadding)
      
    case 'pdf-viewer':
      const { pageHeight = 600 } = contentData
      return Math.max(400, baseHeaderHeight + pageHeight + basePadding)
      
    case 'image':
      const { imageHeight = 300 } = contentData
      return Math.max(200, baseHeaderHeight + imageHeight + basePadding)
      
    case 'link':
      return 80 // Fixed height for link previews
      
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
      return { min: 60, max: 120 }
    default:
      return { min: 200, max: 1000 }
  }
}

// Apply height bounds to prevent infinite growth
export const applyHeightBounds = (height, cardType) => {
  const bounds = getHeightBounds(cardType)
  return Math.min(Math.max(height, bounds.min), bounds.max)
}
