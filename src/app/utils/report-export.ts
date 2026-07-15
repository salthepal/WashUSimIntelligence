import type { Report } from '../types';
import { downloadDocxFromMarkdown } from './docx';

function safeFilename(title: string) {
  return title.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'report';
}

function reportMarkdown(report: Report) {
  const content = report.editedContent || report.content;
  const images = report.metadata?.images || [];
  if (!images.length || content.includes('data:image/')) return content;
  return `${content}\n\n## Uploaded pictures\n\n${images.map((src, index) => `![Uploaded picture ${index + 1}](${src})`).join('\n\n')}`;
}

export async function downloadReportDocx(report: Report) {
  await downloadDocxFromMarkdown(reportMarkdown(report), {
    filename: `${safeFilename(report.title)}.docx`,
  });
}

export async function downloadReportPdf(report: Report) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const textWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  const titleLines = pdf.splitTextToSize(report.title, textWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  const content = report.editedContent || report.content;
  const markdownImagePattern = /^!\[.*?\]\((.*?)\)$/;
  const markdownImages = content.split('\n').map((line) => line.trim().match(markdownImagePattern)?.[1]).filter((src): src is string => Boolean(src));
  const imageSources = Array.from(new Set([...(report.metadata?.images || []), ...markdownImages]));
  const paragraphs = content.split(/\n+/).filter((paragraph) => !markdownImagePattern.test(paragraph.trim()));
  for (const paragraph of paragraphs) {
    const clean = paragraph.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').replace(/^[-*]\s+/, '• ');
    const lines = pdf.splitTextToSize(clean || ' ', textWidth);
    for (const line of lines) {
      ensureSpace(5.5);
      pdf.text(line, margin, y);
      y += 5.5;
    }
    y += 2;
  }

  for (const src of imageSources) {
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
      const maxHeight = 90;
      const ratio = Math.min(textWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;
      ensureSpace(height + 6);
      const format = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(src, format, margin, y, width, height, undefined, 'FAST');
      y += height + 6;
    } catch {
      // A malformed legacy image should not prevent the report itself from exporting.
    }
  }

  pdf.save(`${safeFilename(report.title)}.pdf`);
}
