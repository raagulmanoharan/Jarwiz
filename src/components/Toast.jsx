import React, { useState, useEffect, useCallback } from 'react'
import './toast.css'

let toastId = 0
let addToastCallback = null

// Global function to show toasts from anywhere
export const showToast = (title, message, type = 'info', duration = 5000) => {
  if (addToastCallback) {
    addToastCallback({ title, message, type, duration })
  }
}

// Toast component
function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRemove()
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.duration])

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Animation duration
  }

  return (
    <div className={`toast ${toast.type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">
        {toast.type === 'error' && '✕'}
      </div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={handleRemove}>
        ×
      </button>
    </div>
  )
}

// Toast container component
export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toastData) => {
    const id = ++toastId
    const newToast = { ...toastData, id }
    setToasts(prev => [...prev, newToast])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  useEffect(() => {
    addToastCallback = addToast
    return () => {
      addToastCallback = null
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}
