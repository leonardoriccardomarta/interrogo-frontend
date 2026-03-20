let pdfjsLib: any;
let pdfjsLoadPromise: Promise<any> | null = null;

const getApiBaseUrl = () => {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const defaultApiOrigin = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
  const rawBase = envApiUrl && envApiUrl.length > 0 ? envApiUrl : defaultApiOrigin;
  const normalized = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkBinary = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkBinary += String.fromCharCode(chunk[j]);
    }
    binary += chunkBinary;
  }
  return btoa(binary);
};

async function fallbackOcrWithBackend(arrayBuffer: ArrayBuffer): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  const apiBase = getApiBaseUrl();
  if (!apiBase) return null;

  const base64Pdf = arrayBufferToBase64(arrayBuffer);

  try {
    const response = await fetch(`${apiBase}/interrogo/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ base64Pdf }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text = payload?.text;
    return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

async function getPdfJsLib() {
  if (pdfjsLib) {
    return pdfjsLib;
  }

  if (!pdfjsLoadPromise) {
    pdfjsLoadPromise = import('pdfjs-dist').then((lib) => {
      pdfjsLib = lib;

      // pdfjs-dist v4 ships the worker as an ESM module (.mjs), not .js.
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      return pdfjsLib;
    });
  }

  return pdfjsLoadPromise;
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
    const lib = await getPdfJsLib();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

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

    const cleanedText = fullText.trim();

    // Use OCR fallback when extracted text is too weak (scanned/image-heavy PDFs).
    if (cleanedText.length < 120) {
      const ocrText = await fallbackOcrWithBackend(arrayBuffer);
      if (ocrText && ocrText.length > 0) {
        return ocrText;
      }
    }

    if (!cleanedText) {
      throw new Error('No text found in PDF');
    }

    return cleanedText;
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
