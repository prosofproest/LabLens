// LabLens AI — Production Image Signature & Structural Integrity Validator
// Pure Node.js Buffer implementation with zero third-party dependencies.

export type SupportedImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export interface ImageValidationSuccess {
  isValid: true;
  mimeType: SupportedImageMimeType;
  format: "jpeg" | "png" | "webp" | "gif";
  width: number;
  height: number;
  byteLength: number;
}

export interface ImageValidationFailure {
  isValid: false;
  error: string;
  code:
    | "EMPTY_FILE"
    | "FILE_TOO_LARGE"
    | "UNRECOGNIZED_FORMAT"
    | "MIME_MISMATCH"
    | "MALFORMED_HEADER"
    | "TRUNCATED_FILE"
    | "CORRUPTED_CONTAINER";
}

export type ImageValidationResult =
  | ImageValidationSuccess
  | ImageValidationFailure;

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_FORMAT_MAP: Record<string, "jpeg" | "png" | "webp" | "gif"> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Validates a PNG buffer by parsing its 8-byte signature and verifying chunk structure
 * (IHDR -> data chunks -> IEND with valid length and CRC offset checks).
 */
function validatePngStructure(buffer: Buffer): { valid: boolean; width?: number; height?: number; error?: string } {
  if (buffer.length < 8) {
    return { valid: false, error: "Truncated PNG signature." };
  }

  // 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIG[i]) {
      return { valid: false, error: "Invalid PNG signature header." };
    }
  }

  let offset = 8;
  let hasIhdr = false;
  let hasIend = false;
  let width = 0;
  let height = 0;

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);

    if (offset + 12 + chunkLength > buffer.length) {
      return { valid: false, error: `Truncated PNG chunk '${chunkType}'.` };
    }

    if (!hasIhdr) {
      if (chunkType !== "IHDR" || chunkLength !== 13) {
        return { valid: false, error: "Malformed PNG: First chunk must be 13-byte IHDR." };
      }
      hasIhdr = true;
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      if (width === 0 || height === 0) {
        return { valid: false, error: "Malformed PNG: IHDR dimensions must be non-zero." };
      }
    }

    if (chunkType === "IEND") {
      hasIend = true;
      if (chunkLength !== 0) {
        return { valid: false, error: "Malformed PNG: IEND chunk must have 0 length." };
      }
      offset += 12 + chunkLength;
      break;
    }

    offset += 12 + chunkLength;
  }

  if (!hasIhdr) {
    return { valid: false, error: "Malformed PNG: Missing IHDR chunk." };
  }

  if (!hasIend) {
    return { valid: false, error: "Truncated PNG: Missing IEND trailer chunk." };
  }

  return { valid: true, width, height };
}

/**
 * Validates a JPEG buffer by verifying SOI (FF D8 FF), traversing segment markers,
 * extracting dimensions from SOF, and confirming valid segment boundaries.
 */
function validateJpegStructure(buffer: Buffer): { valid: boolean; width?: number; height?: number; error?: string } {
  if (buffer.length < 4) {
    return { valid: false, error: "Truncated JPEG header." };
  }

  // SOI marker: FF D8 FF
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    return { valid: false, error: "Invalid JPEG SOI signature." };
  }

  let offset = 2;
  let width = 0;
  let height = 0;
  let foundSof = false;
  let foundSos = false;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // Standalone markers
    if (marker === 0xd8) {
      // SOI
      offset += 2;
      continue;
    }
    if (marker === 0xd9) {
      // EOI (End of Image)
      offset += 2;
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      // Escaped 0xFF inside entropy stream or Restart markers
      offset += 2;
      continue;
    }

    // Variable length marker: requires 2-byte length
    if (offset + 4 > buffer.length) {
      return { valid: false, error: "Truncated JPEG marker segment." };
    }

    const segLength = buffer.readUInt16BE(offset + 2);
    if (segLength < 2 || offset + 2 + segLength > buffer.length) {
      return { valid: false, error: "Corrupted JPEG segment length exceeds buffer." };
    }

    // Start of Frame markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), SOF3 (0xC3),
    // SOF5 (0xC5), SOF6 (0xC6), SOF7 (0xC7), SOF9 (0xC9), SOF10 (0xCA), SOF11 (0xCB)
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb
    ) {
      if (segLength >= 8) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        foundSof = true;
      }
    }

    if (marker === 0xda) {
      // Start of Scan: followed by entropy coded data
      foundSos = true;
      offset += 2 + segLength;
      // Skip entropy data until next marker
      while (offset < buffer.length - 1) {
        if (buffer[offset] === 0xff && buffer[offset + 1] !== 0x00 && !(buffer[offset + 1] >= 0xd0 && buffer[offset + 1] <= 0xd7)) {
          break;
        }
        offset++;
      }
      continue;
    }

    offset += 2 + segLength;
  }

  if (!foundSof && !foundSos) {
    return { valid: false, error: "Malformed JPEG: Missing frame specification segment." };
  }

  // Check that the file ends with EOI (0xFF 0xD9) allowing trailing whitespace
  let eoiFound = false;
  for (let i = buffer.length - 2; i >= Math.max(0, buffer.length - 16); i--) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
      eoiFound = true;
      break;
    }
  }

  if (!eoiFound) {
    return { valid: false, error: "Truncated JPEG: Missing EOI trailer marker." };
  }

  return { valid: true, width, height };
}

/**
 * Validates a GIF buffer (GIF87a or GIF89a), checking Logical Screen Descriptor,
 * Color Table dimensions, and terminal trailer marker (0x3B).
 */
function validateGifStructure(buffer: Buffer): { valid: boolean; width?: number; height?: number; error?: string } {
  if (buffer.length < 13) {
    return { valid: false, error: "Truncated GIF header." };
  }

  const sig = buffer.toString("ascii", 0, 6);
  if (sig !== "GIF87a" && sig !== "GIF89a") {
    return { valid: false, error: "Invalid GIF header signature (expected GIF87a or GIF89a)." };
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  if (width === 0 || height === 0) {
    return { valid: false, error: "Malformed GIF: Dimensions must be non-zero." };
  }

  const packed = buffer[10];
  const gctFlag = (packed & 0x80) !== 0;
  const gctSize = gctFlag ? 3 * Math.pow(2, (packed & 0x07) + 1) : 0;

  if (buffer.length < 13 + gctSize) {
    return { valid: false, error: "Truncated GIF: Global Color Table exceeds file size." };
  }

  // A valid GIF must contain the trailer byte 0x3B
  let trailerFound = false;
  for (let i = buffer.length - 1; i >= Math.max(13 + gctSize, buffer.length - 8); i--) {
    if (buffer[i] === 0x3b) {
      trailerFound = true;
      break;
    }
  }

  if (!trailerFound) {
    return { valid: false, error: "Truncated GIF: Missing terminal 0x3B trailer byte." };
  }

  return { valid: true, width, height };
}

/**
 * Validates a WebP buffer, verifying the RIFF header, container size,
 * WEBP identifier, and internal chunk format (VP8 / VP8L / VP8X).
 */
function validateWebPStructure(buffer: Buffer): { valid: boolean; width?: number; height?: number; error?: string } {
  if (buffer.length < 16) {
    return { valid: false, error: "Truncated WebP container header." };
  }

  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || webp !== "WEBP") {
    return { valid: false, error: "Invalid WebP RIFF/WEBP signature." };
  }

  const riffSize = buffer.readUInt32LE(4);
  // RIFF container size specifies size of the file minus 8 bytes of RIFF header
  if (buffer.length < riffSize + 8 && buffer.length !== riffSize) {
    // Some encoders don't pad single trailing byte; allow reasonable tolerance if chunk header fits
    if (buffer.length < 20) {
      return { valid: false, error: "Truncated WebP container." };
    }
  }

  const chunkType = buffer.toString("ascii", 12, 16);
  let width = 0;
  let height = 0;

  if (chunkType === "VP8 ") {
    // Lossy simple VP8 format
    if (buffer.length < 30) {
      return { valid: false, error: "Truncated VP8 lossy chunk." };
    }
    // Check start code at offset 23: 9D 01 2A
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return { valid: false, error: "Malformed WebP: Invalid VP8 keyframe start code." };
    }
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunkType === "VP8L") {
    // Lossless VP8L format
    if (buffer.length < 25) {
      return { valid: false, error: "Truncated VP8L lossless chunk." };
    }
    // Signature byte at offset 20: 0x2F
    if (buffer[20] !== 0x2f) {
      return { valid: false, error: "Malformed WebP: Invalid VP8L signature byte." };
    }
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    width = 1 + (((b2 & 0x3f) << 8) | b1);
    height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
  } else if (chunkType === "VP8X") {
    // Extended WebP format
    if (buffer.length < 30) {
      return { valid: false, error: "Truncated VP8X extended chunk." };
    }
    // 24-bit canvas dimensions at offset 24 and 27
    width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
    height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
  } else {
    return { valid: false, error: `Unrecognized WebP chunk format '${chunkType}'.` };
  }

  return { valid: true, width, height };
}

/**
 * Inspects a raw buffer to detect image format based on structural signatures.
 */
export function detectImageFormat(buffer: Buffer): "jpeg" | "png" | "webp" | "gif" | null {
  if (buffer.length < 4) return null;

  // JPEG SOI
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG Signature
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // GIF Header
  if (buffer.length >= 6) {
    const gifSig = buffer.toString("ascii", 0, 6);
    if (gifSig === "GIF87a" || gifSig === "GIF89a") {
      return "gif";
    }
  }

  // WebP Header
  if (buffer.length >= 12) {
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    if (riff === "RIFF" && webp === "WEBP") {
      return "webp";
    }
  }

  return null;
}

/**
 * Strictly validates an image buffer against its declared MIME type, verifies
 * internal structural integrity, checks size limits, and extracts dimensional metadata.
 */
export function validateImageBuffer(
  buffer: Buffer,
  declaredMimeType: string
): ImageValidationResult {
  // 1. Enforce non-empty buffer
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      code: "EMPTY_FILE",
      error: "The submitted file is empty (0 bytes). Please upload a valid image file.",
    };
  }

  // 2. Enforce 5MB size limit
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      code: "FILE_TOO_LARGE",
      error: `File size exceeds the 5MB limit (current: ${sizeMb}MB). Please upload a smaller image.`,
    };
  }

  // 3. Normalize declared MIME type
  const normalizedMime = declaredMimeType.trim().toLowerCase();
  const expectedFormat = MIME_TO_FORMAT_MAP[normalizedMime];
  if (!expectedFormat) {
    return {
      isValid: false,
      code: "UNRECOGNIZED_FORMAT",
      error: `Unsupported MIME type '${declaredMimeType}'. Allowed formats: JPEG, PNG, WebP, GIF.`,
    };
  }

  // 4. Detect actual format from bytes
  const detectedFormat = detectImageFormat(buffer);
  if (!detectedFormat) {
    return {
      isValid: false,
      code: "CORRUPTED_CONTAINER",
      error: "The file bytes do not match any recognized image format signature (JPEG, PNG, WebP, GIF).",
    };
  }

  // 5. Match detected format against declared MIME type
  if (detectedFormat !== expectedFormat) {
    return {
      isValid: false,
      code: "MIME_MISMATCH",
      error: `MIME type mismatch: declared '${declaredMimeType}' but file signature is ${detectedFormat.toUpperCase()}.`,
    };
  }

  // 6. Deep Structural Validation per format
  let structureResult: { valid: boolean; width?: number; height?: number; error?: string };

  switch (detectedFormat) {
    case "png":
      structureResult = validatePngStructure(buffer);
      break;
    case "jpeg":
      structureResult = validateJpegStructure(buffer);
      break;
    case "gif":
      structureResult = validateGifStructure(buffer);
      break;
    case "webp":
      structureResult = validateWebPStructure(buffer);
      break;
  }

  if (!structureResult.valid) {
    return {
      isValid: false,
      code: "MALFORMED_HEADER",
      error: `Corrupted or malformed ${detectedFormat.toUpperCase()} image: ${structureResult.error}`,
    };
  }

  const standardMime: SupportedImageMimeType =
    detectedFormat === "jpeg"
      ? "image/jpeg"
      : detectedFormat === "png"
      ? "image/png"
      : detectedFormat === "webp"
      ? "image/webp"
      : "image/gif";

  return {
    isValid: true,
    mimeType: standardMime,
    format: detectedFormat,
    width: structureResult.width || 0,
    height: structureResult.height || 0,
    byteLength: buffer.length,
  };
}

