import React from 'react'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import ExcelTable from '../components/ExcelTable.jsx'
import { processExcelWithAI } from '../utils/aiExcelProcessor.js'

export class ExcelTableShapeUtil extends BaseBoxShapeUtil {
  static type = 'excel-table'

  canEdit = () => true
  canResize = () => true
  canBind = () => false

  component(shape) {
    const {
      data = [],
      fileName = '',
      generatedTitle = '',
      isLoading = false,
      currentPage = 0,
      isAIProcessing = false,
      aiProgress = 0,
      aiMessage = '',
      sheets = null,
      sheetNames = [],
      currentSheet = null
    } = shape.props

    const handlePageChange = (newPage) => {
      const editor = this.editor
      if (!editor) return

      try {
        const currentShape = editor.getShape(shape.id)
        if (currentShape) {
          editor.batch(() => {
            editor.updateShape({
              id: shape.id,
              type: 'excel-table',
              props: {
                ...currentShape.props,
                currentPage: newPage,
              },
            })
          })
        }
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
          // Prevent infinite growth with maximum bounds
          const maxHeight = 1000 // Maximum reasonable height
          const minHeight = 200  // Minimum height
          
          // Cap the height without extra padding
          const boundedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight)
          
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
        stroke="var(--color-selected)" 
        strokeWidth="2"
        rx="12"
      />
    )
  }
}
