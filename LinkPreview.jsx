import React, { useState, useEffect } from 'react'
import './link-shape.css'

// Get fallback metadata when fetching fails
const getFallbackMetadata = (url) => {
  try {
    const urlObj = new URL(url)
    return {
      title: urlObj.hostname.replace('www.', ''),
      description: 'Click to visit website',
      favicon: null,
      url,
    }
  } catch (error) {
    return {
      title: 'Website',
      description: 'Click to visit website',
      favicon: null,
      url,
    }
  }
}

// Extract metadata from HTML
const parseMetadata = (html, url) => {
  try {
    // Parse HTML to extract metadata
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Extract title
    let title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                doc.querySelector('title')?.textContent ||
                'Website'
    
    // Extract description
    let description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                     doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
                     doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                     'No description available'
    
    // Extract favicon
    let favicon = doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                  doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                  doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                  null
    
    // Convert relative favicon URL to absolute
    if (favicon && !favicon.startsWith('http')) {
      const urlObj = new URL(url)
      if (favicon.startsWith('//')) {
        favicon = urlObj.protocol + favicon
      } else if (favicon.startsWith('/')) {
        favicon = urlObj.origin + favicon
      } else {
        favicon = urlObj.origin + '/' + favicon
      }
    }
    
    // Truncate long text
    if (title.length > 60) {
      title = title.substring(0, 57) + '...'
    }
    if (description.length > 120) {
      description = description.substring(0, 117) + '...'
    }
    
    return {
      title: title.trim(),
      description: description.trim(),
      favicon,
      url,
    }
  } catch (error) {
    console.error('Error parsing metadata:', error)
    return getFallbackMetadata(url)
  }
}

// Fetch website metadata using multiple CORS proxy services
const fetchWebsiteMetadata = async (url) => {
  try {
    // List of CORS proxy services to try
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    ]

    // Try direct fetch first (works for CORS-enabled sites)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        },
      })
      
      if (response.ok) {
        const html = await response.text()
        return parseMetadata(html, url)
      }
    } catch (corsError) {
      console.log('Direct fetch failed, trying CORS proxies:', corsError.message)
    }

    // Try CORS proxies
    for (let i = 0; i < corsProxies.length; i++) {
      try {
        console.log(`Trying proxy ${i + 1}:`, corsProxies[i])
        
        const proxyResponse = await fetch(corsProxies[i])
        if (proxyResponse.ok) {
          let html
          
          if (corsProxies[i].includes('allorigins.win')) {
            // allorigins.win returns JSON
            const data = await proxyResponse.json()
            html = data.contents
          } else {
            // Other proxies return HTML directly
            html = await proxyResponse.text()
          }
          
          if (html && html.trim() !== '') {
            return parseMetadata(html, url)
          }
        }
      } catch (proxyError) {
        console.log(`Proxy ${i + 1} failed:`, proxyError.message)
        continue
      }
    }

    // If all proxies fail, return fallback metadata
    throw new Error('All CORS proxies failed')
  } catch (error) {
    console.error('Error fetching website metadata:', error)
    return getFallbackMetadata(url)
  }
}

const LinkPreview = ({ url, onHeightChange }) => {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faviconError, setFaviconError] = useState(false)

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true)
      try {
        const data = await fetchWebsiteMetadata(url)
        setMetadata(data)
      } catch (error) {
        console.error('Failed to load metadata:', error)
        // Set fallback metadata
        setMetadata(getFallbackMetadata(url))
      } finally {
        setLoading(false)
      }
    }

    if (url) {
      loadMetadata()
    }
  }, [url])

  useEffect(() => {
    // Notify parent of height change
    if (onHeightChange) {
      const height = 80 // Fixed height for link previews
      onHeightChange(height)
    }
  }, [onHeightChange])

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleArrowClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Ensure URL has proper protocol
    let targetUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url
    }
    
    try {
      // Try window.open first
      const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer')
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback: Create a temporary link and click it
        const link = document.createElement('a')
        link.href = targetUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      // Fallback: Direct navigation (same tab)
      window.location.href = targetUrl
    }
  }

  const handleFaviconError = () => {
    setFaviconError(true)
  }

  if (loading) {
    return (
      <div className="link-shape-container">
        <div className="link-block">
          <div className="link-left-row">
            <div className="link-icon" />
            <div className="link-main-info">Loading...</div>
          </div>
          <div 
            className="clickable-arrow" 
            onPointerDown={handleArrowClick}
            title="Open link"
          >
            <div className="link-arrow-right" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="link-shape-container">
      <div className="link-block">
        <div className="link-left-row" onClick={handleClick} style={{ cursor: 'pointer', flex: 1 }}>
          {metadata?.favicon && !faviconError ? (
            <img 
              src={metadata.favicon}
              alt=""
              style={{
                width: '16px',
                height: '16px',
                objectFit: 'cover',
                flexShrink: 0,
                borderRadius: '2px'
              }}
              onError={handleFaviconError}
            />
          ) : (
            <div className="link-icon" />
          )}
          <div className="link-text-content">
            <div className="link-main-info" title={metadata?.title}>
              {metadata?.title || 'Website'}
            </div>
            {metadata?.description && metadata.description !== metadata.title && (
              <div className="link-description" title={metadata.description}>
                {metadata.description}
              </div>
            )}
          </div>
        </div>
        <div 
          className="clickable-arrow" 
          onPointerDown={handleArrowClick}
          title="Open link in new tab"
          style={{ 
            cursor: 'pointer',
            pointerEvents: 'all',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div className="link-arrow-right" />
        </div>
      </div>
    </div>
  )
}

export default LinkPreview