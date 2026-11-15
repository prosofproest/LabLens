"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import { UploadCloud, X, AlertCircle, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/client";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined, publicId?: string) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      setError("Please select a valid image (JPEG, PNG, WEBP, or GIF).");
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Authentication required. Please log in before uploading photos.");
      return;
    }

    try {
      setUploading(true);
      const idToken = await currentUser.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      onChange(data.url, data.publicId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Media upload failed.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#1D1D1F]">
        Equipment Photo (Optional)
      </label>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        disabled={disabled || uploading}
        className="hidden"
        id="equipment-image-input"
      />

      {value ? (
        /* Preview View */
        <div className="relative rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7] p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#E5E5EA] shrink-0">
              <Image
                src={value}
                alt="Equipment malfunction preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1D1D1F] truncate">
                Photo attached
              </p>
              <p className="text-xs text-[#248A3D] flex items-center gap-1">
                ✓ Uploaded to Cloudinary
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#86868B] hover:text-[#DC2626] hover:bg-white transition-colors flex items-center justify-center"
            aria-label="Remove uploaded image"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Dropzone View */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !uploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative rounded-2xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-2 select-none min-h-[140px] ${
            isDragging
              ? "border-[#0071E3] bg-[#EBF5FF]"
              : "border-[#E5E5EA] hover:border-[#86868B] bg-[#FAFAFC]"
          } ${disabled || uploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-[#0071E3]">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-medium">Uploading image to Cloudinary...</p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#86868B] shadow-2xs">
                <UploadCloud className="w-5 h-5 text-[#0071E3]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-[#1D1D1F]">
                  Click or drag photo of equipment defect here
                </p>
                <p className="text-[11px] text-[#86868B]">
                  JPEG, PNG, WEBP, or GIF up to 5MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}

