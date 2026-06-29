/**
 * DOCX generation utilities
 * Converts Markdown-formatted text to properly structured Word documents
 */
import { getAdminAuthHeaders } from '../api';

type DocxModule = typeof import('docx');
type ParagraphInstance = InstanceType<DocxModule['Paragraph']>;
type TextRunInstance = InstanceType<DocxModule['TextRun']>;

export interface DocxGenerationOptions {
  filename?: string;
  pageMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  pageSize?: {
    width?: number;  // twips; defaults to 12240 (Letter 8.5")
    height?: number; // twips; defaults to 15840 (Letter 11")
  };
}

/**
 * Parses inline Markdown formatting (**bold**, *italic*) and returns TextRun array
 */
function parseInlineFormatting(docx: DocxModule, text: string): TextRunInstance[] {
  const textRuns: TextRunInstance[] = [];
  
  // Split by both bold and italic markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  
  parts.forEach(part => {
    if (!part) return;
    
    // Bold text (**text**)
    if (part.startsWith('**') && part.endsWith('**')) {
      textRuns.push(new docx.TextRun({
        text: part.slice(2, -2), 
        bold: true 
      }));
    }
    // Italic text (*text*) but not bold
    else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      textRuns.push(new docx.TextRun({
        text: part.slice(1, -1), 
        italics: true 
      }));
    }
    // Regular text
    else {
      textRuns.push(new docx.TextRun(part));
    }
  });

  return textRuns.length > 0 ? textRuns : [new docx.TextRun(text)];
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function createPhotoCollage(urls: string[]): Promise<{ buffer: ArrayBuffer; type: 'jpg'; width: number; height: number } | null> {
  const images = (
    await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url, { headers: getAdminAuthHeaders() });
        if (!response.ok) return null;
        return await blobToImage(await response.blob());
      } catch {
        return null;
      }
    }))
  ).filter((img): img is HTMLImageElement => Boolean(img));

  if (images.length === 0) return null;

  const maxColumns = images.length <= 4 ? 2 : 3;
  const rowCounts: number[] = [];
  let remaining = images.length;
  while (remaining > 0) {
    let count = Math.min(maxColumns, remaining);
    if (remaining === maxColumns + 1 && maxColumns > 2) count = 2;
    rowCounts.push(count);
    remaining -= count;
  }

  const canvasWidth = 1800;
  const gap = 14;
  const padding = 18;
  const targetRowHeight = 360;
  const contentWidth = canvasWidth - padding * 2;
  const rows = rowCounts.map((count, rowIndex) => {
    const rowImages = images.slice(
      rowCounts.slice(0, rowIndex).reduce((sum, n) => sum + n, 0),
      rowCounts.slice(0, rowIndex).reduce((sum, n) => sum + n, 0) + count,
    );
    const aspectSum = rowImages.reduce((sum, img) => sum + (img.naturalWidth / img.naturalHeight), 0);
    const availableWidth = contentWidth - gap * (count - 1);
    const naturalRowHeight = availableWidth / aspectSum;
    const rowHeight = Math.max(300, Math.min(420, naturalRowHeight || targetRowHeight));
    const widths = rowImages.map(img => rowHeight * (img.naturalWidth / img.naturalHeight));
    const widthScale = availableWidth / widths.reduce((sum, width) => sum + width, 0);
    return {
      images: rowImages,
      height: rowHeight * widthScale,
      widths: widths.map(width => width * widthScale),
    };
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = Math.ceil(rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * gap + padding * 2);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = padding;
  rows.forEach((row) => {
    let x = padding;
    row.images.forEach((img, col) => {
      const width = row.widths[col];
      ctx.drawImage(img, x, y, width, row.height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, row.height - 2);
      x += width + gap;
    });
    y += row.height + gap;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) return null;

  const displayWidth = 610;
  return {
    buffer: await blob.arrayBuffer(),
    type: 'jpg',
    width: displayWidth,
    height: Math.round(displayWidth * (canvas.height / canvas.width)),
  };
}

/**
 * Converts Markdown-formatted text to DOCX paragraphs
 */
async function markdownToDocxParagraphs(docx: DocxModule, markdown: string): Promise<ParagraphInstance[]> {
  const lines = markdown.split('\n');
  const children: ParagraphInstance[] = [];
  let currentFindingLevel = 0;
  const imgRegex = /^!\[.*?\]\((.*?)\)$/;

  // Pre-process into segments so consecutive images can be batched into collage rows
  type TextSeg = { kind: 'text'; line: string };
  type ImageGroupSeg = { kind: 'images'; urls: string[] };
  type Seg = TextSeg | ImageGroupSeg;

  const segments: Seg[] = [];
  let idx = 0;
  while (idx < lines.length) {
    const trimmed = lines[idx].trim();
    if (imgRegex.test(trimmed)) {
      const urls: string[] = [];
      while (idx < lines.length) {
        const l = lines[idx].trim();
        if (imgRegex.test(l)) {
          const m = l.match(imgRegex);
          if (m) urls.push(m[1]);
          idx++;
        } else if (!l) {
          idx++;
        } else {
          break;
        }
      }
      segments.push({ kind: 'images', urls });
    } else {
      segments.push({ kind: 'text', line: trimmed });
      idx++;
    }
  }

  for (const seg of segments) {
    if (seg.kind === 'text') {
      const trimmedLine = seg.line;

      if (!trimmedLine) {
        children.push(new docx.Paragraph({ text: '' }));
        currentFindingLevel = 0;
        continue;
      }

      if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('##')) {
        children.push(new docx.Paragraph({
          text: trimmedLine.substring(2).trim(),
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 0;
      } else if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('###')) {
        children.push(new docx.Paragraph({
          text: trimmedLine.substring(3).trim(),
          heading: docx.HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 0;
      } else if (trimmedLine.startsWith('### ')) {
        children.push(new docx.Paragraph({
          text: trimmedLine.substring(4).trim(),
          heading: docx.HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 1;
      } else if (trimmedLine.match(/^[-•*]\s+/)) {
        children.push(new docx.Paragraph({
          children: parseInlineFormatting(docx, trimmedLine.replace(/^[-•*]\s+/, '')),
          bullet: { level: 0 },
          spacing: { after: 80 },
        }));
      } else if (trimmedLine.match(/^\d+[\.)]\s+/)) {
        children.push(new docx.Paragraph({
          children: parseInlineFormatting(docx, trimmedLine.replace(/^\d+[\.)]\s+/, '')),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 80 },
        }));
      } else {
        const textRuns = parseInlineFormatting(docx, trimmedLine);
        const indentLevel = currentFindingLevel > 0 ? 720 : 0;
        children.push(new docx.Paragraph({
          children: textRuns,
          spacing: { after: 120 },
          indent: indentLevel > 0 ? { left: indentLevel } : undefined,
        }));
      }
    } else {
      const collage = await createPhotoCollage(seg.urls);
      if (collage) {
        children.push(new docx.Paragraph({
          children: [
            new docx.ImageRun({
              data: collage.buffer,
              type: collage.type,
              transformation: { width: collage.width, height: collage.height },
            }),
          ],
          spacing: { before: 120, after: 160 },
        }));
      } else {
        children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: '[Images unavailable]', italics: true })] }));
      }
    }
  }

  return children;
}

/**
 * Generates a DOCX blob from Markdown-formatted text
 */
export async function generateDocxFromMarkdown(
  markdown: string, 
  options: DocxGenerationOptions = {}
): Promise<Blob> {
  const docx = await import('docx');
  const paragraphs = await markdownToDocxParagraphs(docx, markdown);
  
  const doc = new docx.Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: 'start',
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width:  options.pageSize?.width  ?? 12240, // Letter 8.5" default
              height: options.pageSize?.height ?? 15840, // Letter 11" default
            },
            margin: {
              top:    options.pageMargins?.top    ?? 1440,
              right:  options.pageMargins?.right  ?? 1440,
              bottom: options.pageMargins?.bottom ?? 1440,
              left:   options.pageMargins?.left   ?? 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await docx.Packer.toBlob(doc);
}

/**
 * Downloads a DOCX file from Markdown-formatted text
 */
export async function downloadDocxFromMarkdown(
  markdown: string, 
  options: DocxGenerationOptions = {}
): Promise<void> {
  const blob = await generateDocxFromMarkdown(markdown, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || `document-${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
