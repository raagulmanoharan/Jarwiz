import React, { useState, useRef, useEffect } from 'react'
import './ask-input.css'

function AskInput() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      // Only trigger if not already focused on an input and not expanded
      if (!isExpanded && e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        e.stopImmediatePropagation() // Prevent other handlers from processing this event
        setIsExpanded(true)
      }
    }

    // Use capture phase to ensure this handler runs before TLdraw's handlers
    document.addEventListener('keydown', handleGlobalKeydown, true)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown, true)
    }
  }, [isExpanded])

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    }
  }

  const handleBlur = () => {
    if (!inputValue.trim()) {
      setIsExpanded(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      console.log('Submitted:', inputValue)
      setInputValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={`ask-input-container ${isExpanded ? 'expanded' : ''}`}>
      <form onSubmit={handleSubmit} className="ask-input-form">
        <input
          ref={inputRef}
          type="text"
          className="ask-input"
          placeholder="Ask Jarwiz anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onClick={handleClick}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {!isExpanded && (
          <div className="shortcut-hint">
            <span className="shortcut-key">Space</span>
          </div>
        )}
        {isExpanded && (
          <button type="submit" className="send-button" disabled={!inputValue.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </form>
    </div>
  )
}

export default AskInput