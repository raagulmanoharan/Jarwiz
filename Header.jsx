import React, { useState, useRef, useEffect } from 'react'
import './header.css'

function Header() {
  const [boardTitle, setBoardTitle] = useState('Untitled')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Don't select text, just place cursor at the end
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
    }
  }, [isEditing])

  const handleTitleClick = () => {
    setIsEditing(true)
  }

  const handleTitleChange = (e) => {
    setBoardTitle(e.target.value)
  }

  const handleTitleBlur = () => {
    setIsEditing(false)
    if (boardTitle.trim() === '') {
      setBoardTitle('Untitled')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  return (
    <header className="board-header">
      <div className="logo">
        <span className="logo-text">JARWIZ</span>
      </div>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="board-title-input"
          value={boardTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <h1 className="board-title" onClick={handleTitleClick}>
          {boardTitle}
        </h1>
      )}
    </header>
  )
}

export default Header