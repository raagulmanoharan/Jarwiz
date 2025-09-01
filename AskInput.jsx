import React, { useState, useRef, useEffect } from 'react'
import './ask-input.css'

function AskInput() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

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

  const handlePlusClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleMenuItem = (item) => {
    console.log('Selected item:', item)
    setIsMenuOpen(false)
    // TODO: Implement actual functionality for each item
  }

  return (
    <div className={`ask-input-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="plus-button-container" ref={menuRef}>
        <button type="button" className="plus-button" onClick={handlePlusClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {isMenuOpen && (
          <div className="plus-menu">
            <button className="plus-menu-item" onClick={() => handleMenuItem('sticky-note')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 3H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V6C19 4.34315 17.6569 3 16 3Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 7H15M9 11H15M9 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Sticky Note
            </button>
            <button className="plus-menu-item" onClick={() => handleMenuItem('rectangle')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Rectangle
            </button>
            <button className="plus-menu-item" onClick={() => handleMenuItem('youtube')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.54 6.42C22.4 5.88 22.01 5.42 21.54 5.26C19.88 4.8 12 4.8 12 4.8S4.12 4.8 2.46 5.26C1.99 5.42 1.6 5.88 1.46 6.42C1 8.18 1 12 1 12S1 15.82 1.46 17.58C1.6 18.12 1.99 18.58 2.46 18.74C4.12 19.2 12 19.2 12 19.2S19.88 19.2 21.54 18.74C22.01 18.58 22.4 18.12 22.54 17.58C23 15.82 23 12 23 12S23 8.18 22.54 6.42Z" stroke="currentColor" strokeWidth="2"/>
                <polygon points="9.75,15.02 15.5,12 9.75,8.98" fill="currentColor"/>
              </svg>
              YouTube Video
            </button>
            <button className="plus-menu-item" onClick={() => handleMenuItem('text')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5V19M17 5V19M3 5H21M3 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Text
            </button>
            <button className="plus-menu-item" onClick={() => handleMenuItem('arrow')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Arrow
            </button>
          </div>
        )}
      </div>
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