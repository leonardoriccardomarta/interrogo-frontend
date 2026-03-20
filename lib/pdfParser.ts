let pdfjsLib: any;

if (typeof window !== 'undefined') {
  // Only import on client-side
  import('pdfjs-dist').then((lib) => {
    pdfjsLib = lib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  });
}

export async function extractTextFromPDF(file: File): Promise<string> {
  // Validate file
  if (!file || !file.type.includes('pdf')) {
    throw new Error('Please provide a valid PDF file');
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit
    throw new Error('PDF file is too large (max 10MB)');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Truncate if too long
    if (fullText.length > 10000) {
      fullText = fullText.substring(0, 10000) + '...';
    }

    if (!fullText.trim()) {
      throw new Error('No text found in PDF');
    }

    return fullText.trim();
  } catch (error: any) {
    if (error.message && !error.message.includes('PDF')) {
      throw new Error('Failed to extract text from PDF');
    }
    throw error;
  }
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!file.type.includes('pdf')) {
    return { valid: false, error: 'Only PDF files are supported' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File is too large (max 10MB)' };
  }

  return { valid: true };
}
