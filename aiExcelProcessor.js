import OpenAI from 'openai'
import * as XLSX from 'xlsx'

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file')
    return null
  }
  
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, consider using a backend proxy
  })
}

// Convert Excel workbook to a readable format for AI (all sheets)
const workbookToText = (workbook) => {
  try {
    // Process all sheets and combine them
    let allSheetsText = ''
    
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName]
      
      // Get the range of the worksheet
      const range = worksheet['!ref']
      if (!range) return
      
      // Add sheet header
      if (index > 0) allSheetsText += '\n\n'
      allSheetsText += `SHEET: ${sheetName}\n`
      
      // Convert to array of arrays for easier processing
      const data = []
      const decode = (cellAddress) => {
        const match = cellAddress.match(/([A-Z]+)(\d+)/)
        if (!match) return { col: 0, row: 0 }
        
        const col = match[1].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1
        const row = parseInt(match[2]) - 1
        return { col, row }
      }
      
      // Find the bounds
      const [startCell, endCell] = range.split(':')
      const start = decode(startCell)
      const end = decode(endCell)
      
      // Extract data from the first 20 rows per sheet (to avoid huge prompts)
      const maxRows = Math.min(end.row + 1, 20)
      
      for (let row = start.row; row < maxRows; row++) {
        const rowData = []
        for (let col = start.col; col <= end.col; col++) {
          const cellAddress = String.fromCharCode(65 + col) + (row + 1)
          const cell = worksheet[cellAddress]
          rowData.push(cell ? (cell.v || '') : '')
        }
        data.push(rowData)
      }
      
      // Convert to text format and add to combined text
      allSheetsText += data.map(row => row.join('\t')).join('\n')
    })
    
    return allSheetsText
  } catch (error) {
    console.error('Error converting workbook to text:', error)
    return ''
  }
}

// Process all sheets in workbook to separate data arrays
const processAllSheets = (workbook) => {
  try {
    const sheets = {}
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      
      if (jsonData.length > 0) {
        sheets[sheetName] = jsonData
      }
    })
    
    return sheets
  } catch (error) {
    console.error('Error processing all sheets:', error)
    return {}
  }
}

// Generate a title based on data content and headers
const generateTitleFromData = (jsonData, fileName) => {
  if (!jsonData || jsonData.length === 0) {
    return 'Empty Dataset'
  }
  
  try {
    const headers = Object.keys(jsonData[0])
    const headerString = headers.join(' ').toLowerCase()
    
    // Check if filename is generic/meaningless
    const cleanFileName = fileName.replace(/\.(xlsx?|csv)$/i, '').toLowerCase()
    const isGenericFilename = (
      cleanFileName.includes('untitled') ||
      cleanFileName.includes('sheet') ||
      cleanFileName.includes('book') ||
      cleanFileName.includes('data') ||
      cleanFileName.includes('table') ||
      cleanFileName.includes('export') ||
      cleanFileName.includes('download') ||
      cleanFileName.match(/^(sheet|book|data|table)\d*$/i) ||
      cleanFileName.length < 3
    )
    
    // Always try to generate meaningful titles from data first
    let dataBasedTitle = null
    
    // Financial data patterns
    if (headerString.includes('year') || headerString.includes('quarter') || headerString.includes('month')) {
      if (headerString.includes('sales') || headerString.includes('revenue')) {
        dataBasedTitle = 'Sales Report'
      } else if (headerString.includes('asset') || headerString.includes('balance')) {
        dataBasedTitle = 'Balance Sheet Data'
      } else if (headerString.includes('income') || headerString.includes('profit')) {
        dataBasedTitle = 'Income Statement'
      } else if (headerString.includes('expense') || headerString.includes('cost')) {
        dataBasedTitle = 'Expense Report'
      } else {
        dataBasedTitle = 'Financial Report'
      }
    }
    
    // Business data patterns
    if (!dataBasedTitle) {
      if (headerString.includes('employee') || headerString.includes('staff') || headerString.includes('name')) {
        dataBasedTitle = 'Employee Directory'
      } else if (headerString.includes('customer') || headerString.includes('client')) {
        dataBasedTitle = 'Customer Database'
      } else if (headerString.includes('product') || headerString.includes('item') || headerString.includes('inventory')) {
        dataBasedTitle = 'Product Catalog'
      } else if (headerString.includes('transaction') || headerString.includes('payment')) {
        dataBasedTitle = 'Transaction Log'
      } else if (headerString.includes('order') || headerString.includes('purchase')) {
        dataBasedTitle = 'Order History'
      } else if (headerString.includes('task') || headerString.includes('project')) {
        dataBasedTitle = 'Project Tracking'
      }
    }
    
    // Use first meaningful header as basis
    if (!dataBasedTitle) {
      const meaningfulHeaders = headers.filter(h => h.length > 2 && !h.match(/^column_?\d+$/i))
      if (meaningfulHeaders.length > 0) {
        dataBasedTitle = `${meaningfulHeaders[0]} Data`
      }
    }
    
    // Decision logic: prioritize data-based titles over generic filenames
    if (dataBasedTitle) {
      // If we have a good data-based title, use it (especially for generic filenames)
      if (isGenericFilename) {
        return dataBasedTitle
      }
      
      // Check if filename is meaningful and relates to the data
      const fileNameWords = cleanFileName.replace(/[_-]/g, ' ').split(/\s+/)
      const dataWords = dataBasedTitle.toLowerCase().split(/\s+/)
      const hasCommonWords = fileNameWords.some(word => 
        word.length > 2 && dataWords.some(dataWord => 
          dataWord.includes(word) || word.includes(dataWord)
        )
      )
      
      // If filename has meaningful relation to data, use cleaned filename
      if (hasCommonWords && !isGenericFilename) {
        return fileName.replace(/\.(xlsx?|csv)$/i, '').replace(/[_-]/g, ' ')
      }
      
      // Otherwise, prefer data-based title
      return dataBasedTitle
    }
    
    // Final fallback: use filename only if it's not generic
    if (!isGenericFilename) {
      return fileName.replace(/\.(xlsx?|csv)$/i, '').replace(/[_-]/g, ' ')
    }
    
    // Last resort: generic title based on data structure
    return `Data Table (${headers.length} columns)`
    
  } catch (error) {
    console.warn('Error generating title:', error)
    return fileName.replace(/\.(xlsx?|csv)$/i, '') || 'Data Table'
  }
}

// Process Excel data with OpenAI
export const processExcelWithAI = async (workbook, fileName = 'Excel File') => {
  const openai = getOpenAIClient()
  
  if (!openai) {
    // Fallback to standard processing
    console.log('OpenAI not available, using standard Excel processing')
    return processExcelStandard(workbook)
  }
  
  try {
    console.log('Processing Excel file with AI:', fileName)
    
    // Convert workbook to text for AI analysis
    const excelText = workbookToText(workbook)
    
    if (!excelText.trim()) {
      console.warn('Empty or invalid Excel data, falling back to standard processing')
      return processExcelStandard(workbook)
    }
    
    console.log('📄 Excel data preview (first 500 chars):', excelText.substring(0, 500))
    
    // Create AI prompt for Excel analysis
    const prompt = `You are an Excel file processor agent.  
Your job is to take an uploaded Excel file as input and return a clean, structured table.  
- Identify the main data table in the file.  
- Remove unnecessary rows or columns such as footers, headers, descriptions, or notes.  
- Preserve only meaningful tabular data.  
- If the file has multiple pages, please extract the data from all pages.
- Normalize the table so that column headers are clear and rows contain consistent values.  
- Output the cleaned table in a structured format (e.g., JSON or CSV) for easy reuse.

Excel Data:
${excelText}

Return ONLY a JSON array of objects where each object represents one row of data:`

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // More cost-effective model
      messages: [
        {
          role: "system",
          content: "You are an Excel/spreadsheet file processor specialized in extracting clean tabular data from messy Excel content. Always return valid JSON arrays with no additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 4000
    })
    
    const aiResponse = response.choices[0]?.message?.content?.trim()
    
    if (!aiResponse) {
      console.warn('Empty AI response, falling back to standard processing')
      return processExcelStandard(workbook)
    }
    
    console.log('AI Response preview:', aiResponse.substring(0, 200))
    
    // Parse AI response
    let jsonData
    try {
      // Clean the response (remove any markdown formatting)
      const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      jsonData = JSON.parse(cleanResponse)
      
      // Check if the response is a valid array
      if (!Array.isArray(jsonData)) {
        throw new Error('AI response is not an array')
      }
      
      // If AI extraction resulted in 0 rows, fall back to standard processing
      if (jsonData.length === 0) {
        console.warn('AI extraction returned 0 rows, falling back to standard processing')
        return processExcelStandard(workbook)
      }
      
      // Generate a title based on the data content
      const generatedTitle = generateTitleFromData(jsonData, fileName)
      
      // Check if workbook has multiple sheets for AI processed data
      const allSheets = processAllSheets(workbook)
      const sheetNames = Object.keys(allSheets)
      
      console.log(`✅ AI successfully processed ${jsonData.length} rows with title: "${generatedTitle}"`)
      
      // For multiple sheets, include sheet information even though AI processed the main data
      if (sheetNames.length > 1) {
        // For multiple sheets, use the current sheet data instead of combined AI data
        const currentSheetName = sheetNames[0]
        const currentSheetData = allSheets[currentSheetName] || jsonData
        
        return {
          data: currentSheetData, // Use current sheet data instead of combined AI data
          sheets: allSheets,
          sheetNames: sheetNames,
          currentSheet: currentSheetName,
          metadata: {
            source: 'ai',
            model: 'gpt-4o-mini',
            confidence: 0.9,
            rowCount: currentSheetData.length,
            fileName: fileName,
            generatedTitle: generatedTitle,
            totalSheets: sheetNames.length
          }
        }
      }
      
      return {
        data: jsonData,
        metadata: {
          source: 'ai',
          model: 'gpt-4o-mini',
          confidence: 0.9,
          rowCount: jsonData.length,
          fileName: fileName,
          generatedTitle: generatedTitle
        }
      }
      
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', parseError)
      console.log('Raw AI response:', aiResponse)
      
      // Fallback to standard processing
      return processExcelStandard(workbook)
    }
    
  } catch (error) {
    console.error('OpenAI processing failed:', error)
    
    // Check if it's an API key issue
    if (error.code === 'invalid_api_key' || error.status === 401) {
      console.error('❌ Invalid OpenAI API key. Please check your .env file.')
    }
    
    // Fallback to standard processing
    return processExcelStandard(workbook)
  }
}

// Standard Excel processing (fallback)
const processExcelStandard = (workbook) => {
  try {
    console.log('📊 Using standard Excel processing')
    
    // Process all sheets
    const allSheets = processAllSheets(workbook)
    const sheetNames = Object.keys(allSheets)
    
    if (sheetNames.length === 0) {
      throw new Error('No valid sheets found')
    }
    
    // For single sheet, return just the data
    if (sheetNames.length === 1) {
      const jsonData = allSheets[sheetNames[0]]
      return {
        data: jsonData,
        metadata: {
          source: 'standard',
          confidence: 0.7,
          rowCount: jsonData.length,
          fallback: true
        }
      }
    }
    
    // For multiple sheets, return all sheets data
    const primarySheet = sheetNames[0]
    const primaryData = allSheets[primarySheet]
    
    return {
      data: primaryData,
      sheets: allSheets,
      sheetNames: sheetNames,
      currentSheet: primarySheet,
      metadata: {
        source: 'standard',
        confidence: 0.7,
        rowCount: primaryData.length,
        totalSheets: sheetNames.length,
        fallback: true
      }
    }
  } catch (error) {
    console.error('Standard Excel processing failed:', error)
    return {
      data: [],
      metadata: {
        source: 'error',
        confidence: 0,
        rowCount: 0,
        error: error.message
      }
    }
  }
}

// Helper function to validate and clean AI-processed data
export const validateExcelData = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { isValid: false, error: 'No data found' }
  }
  
  // Check if all items are objects
  const invalidItems = data.filter(item => typeof item !== 'object' || item === null)
  if (invalidItems.length > 0) {
    return { isValid: false, error: 'Invalid data format' }
  }
  
  // Check if we have consistent headers
  const firstRowKeys = Object.keys(data[0])
  if (firstRowKeys.length === 0) {
    return { isValid: false, error: 'No headers found' }
  }
  
  return { isValid: true, headers: firstRowKeys, rowCount: data.length }
}
