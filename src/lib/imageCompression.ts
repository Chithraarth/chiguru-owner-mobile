// expo-file-system's default export moved to a new API in SDK 54+; the old
// readAsStringAsync/EncodingType surface we use here now lives under /legacy.
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { isLowSizePhoto } from "./settings";

// Mirrors chiguru-owner-web's src/lib/photo.ts presets (normal / low-size-photo-mode pairs).
export type CompressionPreset = "record" | "ai" | "receipt";

const PRESETS: Record<CompressionPreset, { maxDim: number; quality: number }> = {
  record: { maxDim: 800, quality: 0.72 }, // daily-update photos
  ai: { maxDim: 1100, quality: 0.8 }, // disease/worker-count photos
  receipt: { maxDim: 1200, quality: 0.7 }, // expense receipts, capped ~500KB server-side
};

const LOW_SIZE_PRESETS: Record<CompressionPreset, { maxDim: number; quality: number }> = {
  record: { maxDim: 512, quality: 0.5 },
  ai: { maxDim: 768, quality: 0.6 },
  receipt: { maxDim: 900, quality: 0.5 },
};

/** Compresses an image URI down to a base64 JPEG data URL. */
export async function compressToDataUrl(
  uri: string,
  preset: CompressionPreset
): Promise<string> {
  const { maxDim, quality } = isLowSizePhoto() ? LOW_SIZE_PRESETS[preset] : PRESETS[preset];
  const result = await manipulateAsync(uri, [{ resize: { width: maxDim } }], {
    compress: quality,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error("Image compression failed to produce base64 output");
  }
  return `data:image/jpeg;base64,${result.base64}`;
}

/** Re-encodes at a lower quality if the data URL still exceeds maxChars (mirrors the web app's fallback re-encode for receipts). */
export async function compressWithFallback(
  uri: string,
  preset: CompressionPreset,
  maxChars = 650_000
): Promise<string> {
  let dataUrl = await compressToDataUrl(uri, preset);
  if (dataUrl.length > maxChars) {
    const result = await manipulateAsync(uri, [{ resize: { width: 900 } }], {
      compress: 0.5,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (result.base64) dataUrl = `data:image/jpeg;base64,${result.base64}`;
  }
  if (dataUrl.length > maxChars) {
    throw new Error("Photo is too large even after compression - try a simpler shot.");
  }
  return dataUrl;
}

export async function fileUriToBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}
