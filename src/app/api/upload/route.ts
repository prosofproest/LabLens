import { NextRequest, NextResponse } from "next/server";
import { isCloudinaryConfigured, uploadImageBuffer } from "@/lib/cloudinary/server";
import { verifyFirebaseIdToken, VerifiedFirebaseToken } from "@/lib/firebase/serverAuth";
import { validateImageBuffer } from "@/lib/security/imageSignature";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Authentication: Verify Firebase ID Token on the server
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required. Missing or malformed Authorization header.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return NextResponse.json(
        {
          error: "Authentication required. Bearer token is empty.",
        },
        { status: 401 }
      );
    }

    let verifiedUser: VerifiedFirebaseToken;
    try {
      verifiedUser = await verifyFirebaseIdToken(token);
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Token validation failed.";
      return NextResponse.json(
        {
          error: `Unauthorized: ${message}`,
        },
        { status: 401 }
      );
    }

    // 2. Verify Cloudinary credentials before parsing upload payload
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          error:
            "Cloudinary media service is not configured. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file.",
        },
        { status: 503 }
      );
    }

    // 3. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided in request." },
        { status: 400 }
      );
    }

    // 4. Validate file size constraints (non-empty and strictly <= 5MB)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty (0 bytes). Please upload a valid image file." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file exceeds the maximum allowed size of 5 MB." },
        { status: 400 }
      );
    }

    // 5. Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 6. Deep signature and structural integrity validation (magic bytes, headers, chunk boundaries)
    const validation = validateImageBuffer(buffer, file.type);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 7. Stream verified image buffer to Cloudinary (scoped by authenticated user UID)
    const result = await uploadImageBuffer(buffer, `lablens-fault-reports/${verifiedUser.uid}`);

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        publicId: result.publicId,
        uploadedBy: verifiedUser.uid,
        width: result.width,
        height: result.height,
        format: result.format,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Media upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
