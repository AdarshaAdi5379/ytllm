import PDFDocument from 'pdfkit';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageNumber,
  Header,
  Footer,
  Packer,
  WidthType,
} from 'docx';
import axios from 'axios';
import { Response } from 'express';
import type { Message } from '../../../shared/types';

interface ExportData {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
  summary: string;
  chatHistory: Message[];
  includeTranscript: boolean;
  transcript?: string;
}

/**
 * Fetches a YouTube thumbnail and returns it as a Buffer.
 */
async function fetchThumbnail(thumbnailUrl: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(thumbnailUrl, {
      responseType: 'arraybuffer',
      timeout: 8000,
    });
    return Buffer.from(response.data);
  } catch {
    // Try fallback thumbnail URL
    try {
      const videoIdMatch = thumbnailUrl.match(/\/vi\/([^/]+)\//);
      if (videoIdMatch) {
        const fallbackUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
        const fallback = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 5000 });
        return Buffer.from(fallback.data);
      }
    } catch {
      // ignore
    }
    return null;
  }
}

function formatTimestamp(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleString();
  } catch {
    return isoTimestamp;
  }
}

/**
 * Generates a PDF export and pipes it to the response.
 */
export async function generatePdf(data: ExportData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="chat-export-${data.videoId}.pdf"`);
  doc.pipe(res);

  const thumbnailBuffer = await fetchThumbnail(data.thumbnailUrl);

  // Colours
  const USER_BG = '#E3F2FD';
  const AI_BG = '#F5F5F5';
  const ACCENT = '#1565C0';
  const HEADER_BG = '#1A237E';

  // ── Cover Page ──────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 160).fill(HEADER_BG);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('YouTube AI Chat Export', 50, 50, {
    width: doc.page.width - 100,
  });
  doc.fontSize(12).font('Helvetica').text(`Exported on ${new Date().toLocaleDateString()}`, 50, 82);

  let yPos = 175;

  // Thumbnail
  if (thumbnailBuffer) {
    try {
      doc.image(thumbnailBuffer, 50, yPos, { width: 200, height: 112 });
    } catch {
      // Skip image if it can't be rendered
    }
  }

  // Video metadata
  doc.fillColor('#000000');
  const metaX = thumbnailBuffer ? 270 : 50;
  doc.fontSize(16).font('Helvetica-Bold').fillColor(ACCENT).text(data.title, metaX, yPos, { width: doc.page.width - metaX - 50 });
  yPos += 24;
  doc.fontSize(11).font('Helvetica').fillColor('#555555')
    .text(`Channel: ${data.channelName}`, metaX, yPos)
    .text(`Duration: ${data.duration}`, metaX, yPos + 16)
    .text(`Video ID: ${data.videoId}`, metaX, yPos + 32);

  yPos = thumbnailBuffer ? yPos + 90 : yPos + 60;

  // ── Summary Section ────────────────────────────────────────
  doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke('#CCCCCC');
  yPos += 15;

  doc.fontSize(14).font('Helvetica-Bold').fillColor(ACCENT).text('Video Summary', 50, yPos);
  yPos += 22;
  doc.fontSize(10).font('Helvetica').fillColor('#333333').text(data.summary, 50, yPos, {
    width: doc.page.width - 100,
  });
  yPos = doc.y + 20;

  // ── Conversation ────────────────────────────────────────────
  doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke('#CCCCCC');
  yPos += 15;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(ACCENT).text('Conversation', 50, yPos);
  yPos += 25;

  for (const msg of data.chatHistory) {
    const isUser = msg.role === 'user';
    const bgColor = isUser ? USER_BG : AI_BG;
    const label = isUser ? 'You' : 'AI Assistant';
    const labelColor = isUser ? '#1565C0' : '#2E7D32';

    // Check if we need a new page
    if (yPos > doc.page.height - 150) {
      doc.addPage();
      yPos = 50;
    }

    // Message bubble
    const msgWidth = doc.page.width - 100;
    const msgText = msg.content;
    const textHeight = doc.heightOfString(msgText, { width: msgWidth - 20 });
    const bubbleHeight = textHeight + 35;

    doc.roundedRect(50, yPos, msgWidth, bubbleHeight, 6).fill(bgColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(labelColor).text(label, 62, yPos + 8);
    doc.fontSize(9).font('Helvetica').fillColor('#888888').text(formatTimestamp(msg.timestamp), msgWidth - 50, yPos + 8, { align: 'right', width: 150 });
    doc.fontSize(10).font('Helvetica').fillColor('#222222').text(msgText, 62, yPos + 22, { width: msgWidth - 20 });

    yPos = doc.y + 12;
  }

  // ── Optional Transcript Appendix ───────────────────────────
  if (data.includeTranscript && data.transcript) {
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').fillColor(ACCENT).text('Full Transcript', 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#333333').text(data.transcript, 50, 80, {
      width: doc.page.width - 100,
      columns: 2,
      columnGap: 20,
    });
  }

  // Add page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(9).fillColor('#888888').text(
      `${data.title} — Page ${i + 1} of ${range.count}`,
      50,
      doc.page.height - 30,
      { width: doc.page.width - 100, align: 'center' }
    );
  }

  doc.end();
}

/**
 * Generates a DOCX export and sends it as a response.
 */
export async function generateDocx(data: ExportData, res: Response): Promise<void> {
  const sections = [];

  // ── Cover / Header ─────────────────────────────────────────
  const titleParagraph = new Paragraph({
    text: data.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
  });

  const metaParagraphs = [
    new Paragraph({ text: `Channel: ${data.channelName}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Duration: ${data.duration}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Exported on: ${new Date().toLocaleDateString()}`, spacing: { after: 300 } }),
  ];

  // ── Summary ─────────────────────────────────────────────────
  const summarySection = [
    new Paragraph({
      text: 'Video Summary',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 },
    }),
    new Paragraph({
      text: data.summary,
      spacing: { after: 300 },
    }),
  ];

  // ── Conversation ─────────────────────────────────────────────
  const conversationHeader = new Paragraph({
    text: 'Conversation',
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });

  const messageElements: (Paragraph | Table)[] = [];

  for (const msg of data.chatHistory) {
    const isUser = msg.role === 'user';
    const label = isUser ? 'You' : 'AI Assistant';

    if (isUser) {
      // User messages in shaded table cells
      messageElements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, color: 'E3F2FD', fill: 'E3F2FD' },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.THICK, color: '1565C0', size: 6 },
                    right: { style: BorderStyle.NONE },
                  },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: label, bold: true, color: '1565C0', size: 18 })],
                      spacing: { after: 80 },
                    }),
                    new Paragraph({ text: msg.content, spacing: { after: 80 } }),
                    new Paragraph({
                      children: [new TextRun({ text: formatTimestamp(msg.timestamp), color: '888888', size: 16 })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      // AI messages as paragraphs with left border
      messageElements.push(
        new Paragraph({
          children: [new TextRun({ text: label, bold: true, color: '2E7D32', size: 18 })],
          spacing: { before: 200, after: 80 },
          border: { left: { style: BorderStyle.THICK, color: '2E7D32', size: 6 } },
          indent: { left: 180 },
        }),
        new Paragraph({
          text: msg.content,
          spacing: { after: 80 },
          border: { left: { style: BorderStyle.THICK, color: '2E7D32', size: 6 } },
          indent: { left: 180 },
        }),
        new Paragraph({
          children: [new TextRun({ text: formatTimestamp(msg.timestamp), color: '888888', size: 16 })],
          border: { left: { style: BorderStyle.THICK, color: '2E7D32', size: 6 } },
          indent: { left: 180 },
          spacing: { after: 200 },
        })
      );
    }

    // Spacer paragraph
    messageElements.push(new Paragraph({ text: '', spacing: { after: 100 } }));
  }

  // ── Transcript Appendix ──────────────────────────────────────
  const appendixParagraphs: Paragraph[] = [];
  if (data.includeTranscript && data.transcript) {
    appendixParagraphs.push(
      new Paragraph({
        text: 'Full Transcript',
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: data.transcript,
        spacing: { after: 200 },
        style: 'Normal',
      })
    );
  }

  const doc = new Document({
    title: data.title,
    subject: `Chat export for YouTube video: ${data.videoId}`,
    creator: 'YouTube AI Chat Agent',
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: data.title, bold: true, size: 16 }),
                  new TextRun({ text: ' — YouTube AI Chat Export', size: 16 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Page ', size: 16 }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                  }),
                  new TextRun({ text: ' of ', size: 16 }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          titleParagraph,
          ...metaParagraphs,
          ...summarySection,
          conversationHeader,
          ...messageElements,
          ...appendixParagraphs,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="chat-export-${data.videoId}.docx"`);
  res.send(buffer);
}
