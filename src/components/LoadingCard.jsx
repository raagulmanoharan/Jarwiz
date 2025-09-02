import React from 'react'
import './loading-card.css'

export default function LoadingCard({ 
  message = 'Loading...', 
  subMessage = '', 
  fileName = '',
  fileType = 'file'
}) {
  return (
    <div className="loading-card-container soft-card-shadow">
      <div className="loading-card-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        
        <div className="loading-text">
          <div className="loading-message">{message}</div>
          {subMessage && <div className="loading-sub-message">{subMessage}</div>}
          
          {fileName && (
            <div className="loading-file-info">
              <div className="file-icon">
                {fileType === 'excel' && '📊'}
                {fileType === 'csv' && '📋'}
                {fileType === 'sheets' && '📈'}
                {fileType === 'file' && '📄'}
              </div>
              <div className="file-name">{fileName}</div>
            </div>
          )}
        </div>
        

      </div>
    </div>
  )
}
