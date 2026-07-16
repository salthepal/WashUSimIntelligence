/**
 * Sanitization utilities to prevent Unicode and formatting errors
 */

/**
 * Sanitizes text input by removing unsupported Unicode characters and normalizing whitespace
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize Unicode to NFC form
    .normalize('NFC')
    // Remove control characters except newlines and tabs
    .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace problematic quotes with standard ones
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    // Normalize whitespace
    .replaceAll(/\s+/g, ' ')
    .trim();
}

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content while preserving basic formatting
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'ul', 'ol', 'li', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code', 'img', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt', 'title', 'width', 'height'],
    FORCE_BODY: true
  });
}

/**
 * Sanitizes filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document';
  
  return filename
    .normalize('NFC')
    // Remove invalid filename characters
    .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Replace spaces with underscores
    .replaceAll(/\s+/g, '_')
    // Remove consecutive underscores
    .replaceAll(/_+/g, '_')
    .trim();
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Sanitizes JSON data by removing problematic Unicode
 */
export function sanitizeJSON(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJSON);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeJSON(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}
