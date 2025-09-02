import React from 'react'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import PDFViewer from '../components/PDFViewer.jsx'

export class PDFViewerShapeUtil extends BaseBoxShapeUtil {
  static type = 'pdf-viewer'

  canEdit = () => true
  canResize = () => true
  canBind = () => false

  component(shape) {
    const {
      fileName = '',
      fileSize = 0,
      fileData = null,
      currentPage = 0,
      isLoading = false,
      isInitialLoading = false,
      loadingMessage = '',
      loadingSubMessage = ''
    } = shape.props

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
        <PDFViewer
          fileName={fileName}
          fileSize={fileSize}
          fileData={fileData}
          currentPage={currentPage}
          isLoading={isLoading}
          isInitialLoading={isInitialLoading}
          loadingMessage={loadingMessage}
          loadingSubMessage={loadingSubMessage}
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
