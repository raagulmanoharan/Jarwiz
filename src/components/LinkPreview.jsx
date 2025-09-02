import React, { useState, useEffect } from 'react'
import { calculateCardHeight } from '../utils/heightCalculator'
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

// AI Website Summarization Utility
const generateWebsiteSummary = async (url, title, description, htmlContent) => {
  try {
    // Extract text content from HTML for better summary
    const extractTextContent = (html) => {
      if (!html) return ''
      
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Remove script, style, and navigation elements
      const elementsToRemove = doc.querySelectorAll('script, style, nav, header, footer, .nav, .header, .footer, .menu, .sidebar')
      elementsToRemove.forEach(el => el.remove())
      
      // Get text content from main content areas
      const mainContent = doc.querySelector('main, .main, .content, .post, .article, .entry') || doc.body
      const textContent = mainContent?.textContent || doc.body?.textContent || ''
      
      // Clean up text
      return textContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
        .substring(0, 1500) // Limit to first 1500 characters
    }
    
    const textContent = extractTextContent(htmlContent)
    
    // Create a smart, crisp summary based on available data
    let summary = ''
    
    // If we have a good description, use it as base
    if (description && description.length > 30 && description.length < 200) {
      summary = description
    } 
    // If we have text content, extract key information
    else if (textContent.length > 100) {
      // Find the first meaningful paragraph
      const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim().length > 50)
      
      if (paragraphs.length > 0) {
        // Take the first substantial paragraph
        let firstParagraph = paragraphs[0].trim()
        
        // Clean up the paragraph
        firstParagraph = firstParagraph
          .replace(/^\s*[A-Z\s]+\s*[:|]\s*/g, '') // Remove headers like "ABOUT: " or "SERVICES: "
          .replace(/\s+/g, ' ')
          .trim()
        
        // Limit to a reasonable length
        if (firstParagraph.length > 200) {
          // Try to end at a sentence boundary
          const sentences = firstParagraph.split(/[.!?]+/)
          let truncated = ''
          for (const sentence of sentences) {
            if ((truncated + sentence).length <= 200) {
              truncated += sentence + '.'
            } else {
              break
            }
          }
          summary = truncated || firstParagraph.substring(0, 197) + '...'
        } else {
          summary = firstParagraph
        }
      }
    }
    
    // If we still don't have a good summary, create one from the title
    if (!summary || summary.length < 30) {
      const domain = new URL(url).hostname.replace('www.', '')
      const cleanTitle = title?.replace(/[|–—]/g, '').trim() || 'this website'
      
      summary = `${cleanTitle} provides information and services related to ${domain}.`
    }
    
    // Final cleanup and length check
    summary = summary
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
    
    // Ensure it's not too long
    if (summary.length > 180) {
      summary = summary.substring(0, 177) + '...'
    }
    
    // Ensure it ends with proper punctuation
    if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
      summary += '.'
    }
    
    return summary
  } catch (error) {
    console.error('Error generating summary:', error)
    const domain = new URL(url).hostname.replace('www.', '')
    return `A website about ${domain} providing various services and information.`
  }
}

// Enhanced website metadata fetching with preview
const fetchEnhancedWebsiteData = async (url) => {
  try {
    // List of CORS proxy services to try
    const corsProxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
    ]

    let html = null
    let proxyUsed = null

    // Try direct fetch first (works for CORS-enabled sites)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        },
      })
      
      if (response.ok) {
        html = await response.text()
        proxyUsed = 'direct'
      }
    } catch (corsError) {
      console.log('Direct fetch failed, trying CORS proxies:', corsError.message)
    }

    // Try CORS proxies if direct fetch failed
    if (!html) {
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          console.log(`Trying proxy ${i + 1}:`, corsProxies[i])
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          const proxyResponse = await fetch(corsProxies[i], {
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (proxyResponse.ok) {
            if (corsProxies[i].includes('allorigins.win')) {
              // allorigins.win returns JSON
              const data = await proxyResponse.json()
              html = data.contents
            } else {
              // Other proxies return HTML directly
              html = await proxyResponse.text()
            }
            
            if (html && html.trim() !== '') {
              proxyUsed = corsProxies[i]
              break
            }
          }
        } catch (proxyError) {
          console.log(`Proxy ${i + 1} failed:`, proxyError.message)
          continue
        }
      }
    }

    if (!html) {
      console.log('All CORS proxies failed, using fallback metadata')
      const fallback = getFallbackMetadata(url)
      const summary = await generateWebsiteSummary(url, fallback.title, fallback.description, '')
      
      // Create fallback screenshot URL for when iframe fails
      const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=225`
      
      // Alternative screenshot service as backup
      const fallbackScreenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=demo&url=${encodeURIComponent(url)}&width=400&height=225&format=jpeg&quality=85&response_type=image`
      
      console.log('Generated screenshot URL:', screenshotUrl)
      console.log('Fallback screenshot URL:', fallbackScreenshotUrl)
      
      return {
        ...fallback,
        summary,
        screenshotUrl,
        fallbackScreenshotUrl,
        proxyUsed: 'fallback',
        htmlLength: 0
      }
    }

    // Parse metadata from HTML
    const metadata = parseMetadata(html, url)
    
    // Generate AI summary
    const summary = await generateWebsiteSummary(url, metadata.title, metadata.description, html)
    
    // Create fallback screenshot URL for when iframe fails
    const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=225`
    
    // Alternative screenshot service as backup
    const fallbackScreenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=demo&url=${encodeURIComponent(url)}&width=400&height=225&format=jpeg&quality=85&response_type=image`
    
    console.log('Generated screenshot URL:', screenshotUrl)
    console.log('Fallback screenshot URL:', fallbackScreenshotUrl)
    
    return {
      ...metadata,
      summary,
      screenshotUrl,
      fallbackScreenshotUrl,
      proxyUsed,
      htmlLength: html.length
    }
  } catch (error) {
    console.error('Error fetching enhanced website data:', error)
    const fallback = getFallbackMetadata(url)
    return {
      ...fallback,
      summary: `A website about ${fallback.title}.`,
      previewUrl: null,
      proxyUsed: null,
      htmlLength: 0
    }
  }
}

const LinkPreview = ({ url, onHeightChange }) => {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faviconError, setFaviconError] = useState(false)
  const [screenshotError, setScreenshotError] = useState(false)
  const [useFallbackScreenshot, setUseFallbackScreenshot] = useState(false)

  useEffect(() => {
    const loadMetadata = async () => {
      setLoading(true)
      setScreenshotError(false) // Reset screenshot error state
      setUseFallbackScreenshot(false) // Reset fallback state
      try {
        const data = await fetchEnhancedWebsiteData(url)
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
    // Notify parent of height change using unified calculation
    if (onHeightChange) {
      const hasPreview = true // Always show preview (screenshot)
      const hasSummary = metadata?.summary
      const height = calculateCardHeight('link', {
        hasPreview,
        hasSummary,
        isLoading: loading
      })
      onHeightChange(height)
    }
  }, [metadata, loading, onHeightChange])

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

  const handleScreenshotError = () => {
    console.log('Primary screenshot failed to load, trying fallback')
    if (!useFallbackScreenshot && metadata?.fallbackScreenshotUrl) {
      setUseFallbackScreenshot(true)
    } else {
      console.log('Both screenshots failed, showing placeholder')
      setScreenshotError(true)
    }
  }

  if (loading) {
    return (
      <div className="link-card-container">
        <div className="link-card-header">
          <div className="link-header-content">
            <div className="link-icon" />
            <div className="link-header-text">Loading website...</div>
          </div>
          <div 
            className="link-header-arrow" 
            onPointerDown={handleArrowClick}
            title="Open link"
          >
            <div className="link-arrow-right" />
          </div>
        </div>
        <div className="link-card-body">
          <div className="link-loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">Analyzing website content...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="link-card-container">
      {/* Header */}
      <div className="link-card-header">
        <div className="link-header-content" onClick={handleClick}>
          {metadata?.favicon && !faviconError ? (
            <img 
              src={metadata.favicon}
              alt=""
              className="link-favicon"
              onError={handleFaviconError}
            />
          ) : (
            <div className="link-icon" />
          )}
          <div className="link-header-text">
            <div className="link-title" title={metadata?.title}>
              {metadata?.title || 'Website'}
            </div>
            <div className="link-url" title={url}>
              {url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
            </div>
          </div>
        </div>
        <div 
          className="link-header-arrow" 
          onPointerDown={handleArrowClick}
          title="Open link in new tab"
        >
          <div className="link-arrow-right" />
        </div>
      </div>

      {/* Body */}
      <div className="link-card-body">
        {/* Website Preview */}
        <div className="link-preview-section">
          <div className="link-preview-image-container">
            {!screenshotError ? (
              <img 
                src={useFallbackScreenshot ? metadata?.fallbackScreenshotUrl : metadata?.screenshotUrl}
                alt="Website preview"
                className="link-preview-image"
                onError={handleScreenshotError}
                onLoad={() => console.log('Screenshot loaded successfully')}
              />
            ) : (
              <div className="link-preview-placeholder">
                <div className="link-preview-placeholder-icon">🌐</div>
                <div className="link-preview-placeholder-text">Preview unavailable</div>
              </div>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {metadata?.summary && (
          <div className="link-summary-section">
            <div className="link-summary-text">
              {metadata.summary}
            </div>
          </div>
        )}

        {/* Fallback content if no summary */}
        {!metadata?.summary && (
          <div className="link-fallback-content">
            <div className="link-fallback-icon">🌐</div>
            <div className="link-fallback-text">
              {metadata?.description || 'Click to visit this website'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LinkPreview