#!/usr/bin/env node

/**
 * Setup script for PDF.js worker
 * This script copies the PDF.js worker file to the public directory
 * Run with: node setup-pdf-worker.js
 */

const fs = require('fs')
const path = require('path')

const workerSrc = path.join(__dirname, 'node_modules', 'react-pdf', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const publicDir = path.join(__dirname, 'public')
const workerDest = path.join(publicDir, 'pdf.worker.min.mjs')

try {
  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
    console.log('✅ Created public directory')
  }

  // Check if worker source exists
  if (!fs.existsSync(workerSrc)) {
    console.error('❌ PDF.js worker source not found:', workerSrc)
    console.error('   Make sure react-pdf is installed: npm install react-pdf')
    process.exit(1)
  }

  // Copy worker file
  fs.copyFileSync(workerSrc, workerDest)
  console.log('✅ PDF.js worker copied to public directory')
  console.log('   Source:', workerSrc)
  console.log('   Destination:', workerDest)

} catch (error) {
  console.error('❌ Error setting up PDF worker:', error.message)
  process.exit(1)
}
