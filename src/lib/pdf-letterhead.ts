import edleadLogo from "@/assets/edlead-logo.png";

/**
 * Loads the edLEAD logo as a base64 data URL for embedding in PDFs.
 */
export const loadLogoBase64 = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = edleadLogo;
  });
};

/**
 * Adds the edLEAD letterhead to a jsPDF document.
 * Returns the Y position after the letterhead for content to start.
 */
export const addPDFLetterhead = (
  doc: any,
  logoBase64: string,
  title: string,
  subtitle?: string,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Orange top bar
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Logo
  try {
    doc.addImage(logoBase64, "PNG", 14, 10, 30, 10);
  } catch {
    // fallback text if image fails
    doc.setFontSize(14);
    doc.setTextColor(249, 115, 22);
    doc.text("edLEAD", 14, 18);
  }

  // Organisation name beside logo
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("edLEAD Africa", 46, 14);
  doc.text("Empowering Young Leaders Across Africa", 46, 18);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 30);

  let y = 36;

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(subtitle, 14, y);
    y += 6;
  }

  // Thin separator line
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  return y + 6;
};

/**
 * Adds a footer to the current page of a jsPDF document.
 */
export const addPDFFooter = (doc: any) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("edLEAD Africa — Confidential", 14, pageHeight - 9);
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 30, pageHeight - 9);
};
