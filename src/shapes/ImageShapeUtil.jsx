import React from 'react'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import ImageViewer from '../components/ImageViewer.jsx'

export class ImageShapeUtil extends BaseBoxShapeUtil {
  static type = 'image'

  canEdit = () => true
  canResize = () => true
  canBind = () => false

  component(shape) {
    const {
      fileName = '',
      fileSize = 0,
      imageData = null,
      isLoading = false
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
        <ImageViewer
          fileName={fileName}
          fileSize={fileSize}
          imageData={imageData}
          isLoading={isLoading}
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
