// Server-only Cloudinary utility for LabLens AI media uploads
// DO NOT import this file into Client Components.

import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME.trim() !== "" &&
    process.env.CLOUDINARY_API_KEY.trim() !== "" &&
    process.env.CLOUDINARY_API_SECRET.trim() !== ""
  );
}

function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

/**
 * Uploads an image buffer directly to Cloudinary using upload_stream.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  folder = "lablens-equipment-faults"
): Promise<CloudinaryUploadResult> {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed with empty result."));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

