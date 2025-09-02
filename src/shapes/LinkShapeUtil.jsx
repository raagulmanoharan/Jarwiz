import React from 'react'
import { BaseBoxShapeUtil, HTMLContainer } from '@tldraw/tldraw'
import LinkPreview from '../components/LinkPreview.jsx'

export class LinkShapeUtil extends BaseBoxShapeUtil {
  static type = 'link'

  canEdit = () => true
  canResize = () => true
  canBind = () => false

  component(shape) {
    const { url = '' } = shape.props

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
        <LinkPreview url={url} />
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
