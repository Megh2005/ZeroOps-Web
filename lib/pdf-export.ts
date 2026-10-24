import { jsPDF } from "jspdf";

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  content: string;
  category?: string;
  filename?: string;
}

export function exportArchitectureAuditPdf({
  title,
  subtitle = "Enterprise Infrastructure Topology Audit",
  content,
  category = "TOPOLOGY BLUEPRINT & SPECIFICATION",
  filename,
}: PdfExportOptions): void {
  // Page geometry in points (1 inch = 72 pt)
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 72.0; // Exact 1-inch margin
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 451.28 pt usable width
  const FOOTER_Y = PAGE_HEIGHT - MARGIN; // 769.89 pt
  const MAX_CONTENT_Y = FOOTER_Y - 24; // Leave breathing room above footer

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // Always enforce pure black text & lines
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);

  let currentY = MARGIN;

  // Helper to check for page break
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > MAX_CONTENT_Y) {
      doc.addPage();
      currentY = MARGIN;
      return true;
    }
    return false;
  };

  // --- 1. Formal Page 1 Header ---
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text("ZEROOPS CORE // ARCHITECTURE AUDIT LEDGER", MARGIN, currentY);
  currentY += 16;

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  const cleanTitle = title.replace(/[#*`_]/g, "").trim().toUpperCase();
  doc.text(`AUDIT REPORT: ${cleanTitle}`, MARGIN, currentY);
  currentY += 14;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const refHash = Math.random().toString(36).substring(2, 10).toUpperCase();

  doc.text(`DOC REF      : ZERO-OPS-${refHash}`, MARGIN, currentY);
  currentY += 11;
  doc.text(`TIMESTAMP    : ${dateStr}`, MARGIN, currentY);
  currentY += 11;
  doc.text(`CLASSIFICATION: OFFICIAL ARCHITECTURAL AUDIT • GOOGLE CLOUD PLATFORM`, MARGIN, currentY);
  currentY += 11;
  doc.text(`AUDIT SCOPE  : ${category.toUpperCase()}`, MARGIN, currentY);
  currentY += 14;

  // Double horizontal rule
  doc.setLineWidth(1.2);
  doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
  currentY += 2.5;
  doc.setLineWidth(0.5);
  doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
  currentY += 20;

  // --- 2. Content Tokenizer and Parser ---
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushCodeBlock = () => {
    if (codeBuffer.length === 0) return;

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);

    const lineHeight = 9.5;
    const padding = 8;
    const blockInnerWidth = CONTENT_WIDTH - padding * 2;

    // Split long lines in code block
    const formattedCodeLines: string[] = [];
    for (const rawLine of codeBuffer) {
      if (rawLine.length === 0) {
        formattedCodeLines.push("");
      } else {
        const splitLines = doc.splitTextToSize(rawLine, blockInnerWidth);
        formattedCodeLines.push(...splitLines);
      }
    }

    const totalBlockHeight = formattedCodeLines.length * lineHeight + padding * 2;

    // Check if the entire block fits on page, else paginate per line
    if (currentY + totalBlockHeight > MAX_CONTENT_Y && formattedCodeLines.length > 25) {
      // Chunk across pages
      checkPageBreak(30);
      let sliceStart = 0;
      while (sliceStart < formattedCodeLines.length) {
        const availableHeight = MAX_CONTENT_Y - currentY - padding * 2;
        const linesCanFit = Math.max(3, Math.floor(availableHeight / lineHeight));
        const chunk = formattedCodeLines.slice(sliceStart, sliceStart + linesCanFit);
        const chunkHeight = chunk.length * lineHeight + padding * 2;

        // Draw box frame
        doc.setLineWidth(0.6);
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, chunkHeight);

        let textY = currentY + padding + 6;
        for (const cLine of chunk) {
          doc.text(cLine, MARGIN + padding, textY);
          textY += lineHeight;
        }

        currentY += chunkHeight + 10;
        sliceStart += linesCanFit;
        if (sliceStart < formattedCodeLines.length) {
          doc.addPage();
          currentY = MARGIN;
        }
      }
    } else {
      checkPageBreak(totalBlockHeight + 10);
      doc.setLineWidth(0.6);
      doc.rect(MARGIN, currentY, CONTENT_WIDTH, totalBlockHeight);

      let textY = currentY + padding + 6;
      for (const cLine of formattedCodeLines) {
        doc.text(cLine, MARGIN + padding, textY);
        textY += lineHeight;
      }
      currentY += totalBlockHeight + 12;
    }

    codeBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Toggle code block
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Skip empty lines with a small vertical gap
    if (!trimmed) {
      currentY += 6;
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      checkPageBreak(15);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
      currentY += 12;
      continue;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      checkPageBreak(30);
      currentY += 10;
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      const text = trimmed.substring(2).replace(/[#*`_]/g, "").trim().toUpperCase();
      doc.text(text, MARGIN, currentY);
      currentY += 4;
      doc.setLineWidth(0.75);
      doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
      currentY += 12;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      checkPageBreak(25);
      currentY += 8;
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      const text = trimmed.substring(3).replace(/[#*`_]/g, "").trim().toUpperCase();
      doc.text(`>> ${text}`, MARGIN, currentY);
      currentY += 12;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      checkPageBreak(20);
      currentY += 6;
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      const text = trimmed.substring(4).replace(/[#*`_]/g, "").trim();
      doc.text(`[+] ${text}`, MARGIN, currentY);
      currentY += 11;
      continue;
    }

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Skip separator rows like |---|---|
      if (trimmed.replace(/[|\-\s:]/g, "").length === 0) {
        continue;
      }
      checkPageBreak(14);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const cleanTableRow = trimmed.replace(/\*\*/g, "");
      const wrappedTable = doc.splitTextToSize(cleanTableRow, CONTENT_WIDTH);
      for (const wLine of wrappedTable) {
        doc.text(wLine, MARGIN, currentY);
        currentY += 10;
      }
      continue;
    }

    // Bullet Lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      checkPageBreak(16);
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);

      const bulletContent = trimmed.substring(2).replace(/\*\*/g, "");
      const bulletPrefix = "[•] ";
      const prefixWidth = doc.getTextWidth(bulletPrefix);

      const splitText = doc.splitTextToSize(bulletContent, CONTENT_WIDTH - prefixWidth);
      for (let j = 0; j < splitText.length; j++) {
        if (j === 0) {
          doc.setFont("courier", "bold");
          doc.text(bulletPrefix, MARGIN, currentY);
          doc.setFont("courier", "normal");
          doc.text(splitText[j], MARGIN + prefixWidth, currentY);
        } else {
          doc.text(splitText[j], MARGIN + prefixWidth, currentY);
        }
        currentY += 11;
      }
      continue;
    }

    // Numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      checkPageBreak(16);
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);

      const numPrefix = `[${numberedMatch[1]}] `;
      const numPrefixWidth = doc.getTextWidth(numPrefix);
      const listContent = numberedMatch[2].replace(/\*\*/g, "");

      const splitText = doc.splitTextToSize(listContent, CONTENT_WIDTH - numPrefixWidth);
      for (let j = 0; j < splitText.length; j++) {
        if (j === 0) {
          doc.setFont("courier", "bold");
          doc.text(numPrefix, MARGIN, currentY);
          doc.setFont("courier", "normal");
          doc.text(splitText[j], MARGIN + numPrefixWidth, currentY);
        } else {
          doc.text(splitText[j], MARGIN + numPrefixWidth, currentY);
        }
        currentY += 11;
      }
      continue;
    }

    // Standard Paragraph
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    const cleanParagraph = trimmed.replace(/\*\*/g, "");
    const splitParagraph = doc.splitTextToSize(cleanParagraph, CONTENT_WIDTH);

    checkPageBreak(splitParagraph.length * 11 + 4);
    for (const pLine of splitParagraph) {
      doc.text(pLine, MARGIN, currentY);
      currentY += 11;
    }
    currentY += 3;
  }

  // Flush any lingering code block
  if (inCodeBlock) {
    flushCodeBlock();
  }

  // --- 3. Pass 2: Monogram, Branding, and Running Footer on EVERY Page ---
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Monogram & Footer border line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, FOOTER_Y - 10, PAGE_WIDTH - MARGIN, FOOTER_Y - 10);

    // Left: Monogram
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("[ ZEROOPS ]", MARGIN, FOOTER_Y);

    // Center: Audit Verification Marker
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    const centerText = "VERIFIED TOPOLOGY AUDIT REPORT • PROPRIETARY & CONFIDENTIAL";
    const centerTextWidth = doc.getTextWidth(centerText);
    const centerX = MARGIN + (CONTENT_WIDTH - centerTextWidth) / 2;
    doc.text(centerText, centerX, FOOTER_Y);

    // Right: Pagination
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    const pageString = `PAGE ${p} OF ${totalPages}`;
    const pageStringWidth = doc.getTextWidth(pageString);
    doc.text(pageString, PAGE_WIDTH - MARGIN - pageStringWidth, FOOTER_Y);
  }

  // Download PDF
  const safeFilename = (filename || `ZeroOps_Topology_Audit_Report_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, "_") + ".pdf";

  doc.save(safeFilename);
}
