import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";

import { ghostApiClient } from "../ghostApi";

const uploadFromPathParams = {
  file_path: z.string().min(1),
  purpose: z.enum(["image", "profile_image", "icon"] as const).optional(),
  ref: z.string().optional(),
};

const uploadFromUrlParams = {
  image_url: z.string().url(),
  filename: z.string().optional(),
  purpose: z.enum(["image", "profile_image", "icon"] as const).optional(),
  ref: z.string().optional(),
};

const uploadFromBase64Params = {
  filename: z.string().min(1),
  base64_data: z.string().min(1),
  mime_type: z.string().optional(),
  purpose: z.enum(["image", "profile_image", "icon"] as const).optional(),
  ref: z.string().optional(),
};

export type ImageUploadPurpose = "image" | "profile_image" | "icon";

export type UploadArgs = {
  file_path: string;
  purpose?: ImageUploadPurpose;
  ref?: string;
};

export type UploadedImage = {
  url?: string;
  path?: string;
  ref?: string;
  [key: string]: unknown;
};

export function getGhostImageApi(): any {
  const imageApi = (ghostApiClient as any).images;

  if (!imageApi || typeof imageApi.upload !== "function") {
    throw new Error(
      "This version of @tryghost/admin-api does not expose images.upload(). Try upgrading the Ghost Admin API client dependency."
    );
  }

  return imageApi;
}

export async function uploadImage(args: UploadArgs): Promise<UploadedImage> {
  const uploaded = await getGhostImageApi().upload({
    file: args.file_path,
    purpose: args.purpose,
    ref: args.ref,
  });

  return uploaded;
}

function buildTempFilePath(filename?: string): string {
  const safeName = filename && filename.trim().length > 0 ? path.basename(filename) : `ghost-mcp-image-${randomUUID()}`;
  return path.join(os.tmpdir(), `${randomUUID()}-${safeName}`);
}

function normalizeBase64(input: string): Buffer {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.startsWith("data:") ? trimmed.substring(trimmed.indexOf(",") + 1) : trimmed;
  return Buffer.from(withoutPrefix, "base64");
}

function extensionFromMimeType(mimeType?: string): string {
  switch ((mimeType || "").toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

export async function uploadImageFromPath(args: UploadArgs): Promise<UploadedImage> {
  return uploadImage(args);
}

export async function uploadImageFromUrl(args: {
  image_url: string;
  filename?: string;
  purpose?: ImageUploadPurpose;
  ref?: string;
}): Promise<UploadedImage> {
  const response = await axios.get<ArrayBuffer>(args.image_url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const contentTypeHeader = response.headers["content-type"];
  const extension = path.extname(args.filename || "") || extensionFromMimeType(contentTypeHeader);
  const desiredFilename = args.filename || `downloaded-image${extension}`;
  const tempFilePath = buildTempFilePath(desiredFilename);

  try {
    await fs.writeFile(tempFilePath, Buffer.from(response.data));
    return await uploadImage({
      file_path: tempFilePath,
      purpose: args.purpose,
      ref: args.ref,
    });
  } finally {
    await fs.rm(tempFilePath, { force: true });
  }
}

export async function uploadImageFromBase64(args: {
  filename: string;
  base64_data: string;
  mime_type?: string;
  purpose?: ImageUploadPurpose;
  ref?: string;
}): Promise<UploadedImage> {
  const extension = path.extname(args.filename) || extensionFromMimeType(args.mime_type);
  const filename = path.extname(args.filename) ? args.filename : `${args.filename}${extension}`;
  const tempFilePath = buildTempFilePath(filename);

  try {
    const imageBuffer = normalizeBase64(args.base64_data);
    await fs.writeFile(tempFilePath, imageBuffer);

    return await uploadImage({
      file_path: tempFilePath,
      purpose: args.purpose,
      ref: args.ref,
    });
  } finally {
    await fs.rm(tempFilePath, { force: true });
  }
}

export function registerImageTools(server: McpServer) {
  server.tool("images_upload_from_path", uploadFromPathParams, async (args) => {
    const uploaded = await uploadImageFromPath(args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(uploaded, null, 2),
        },
      ],
    };
  });

  server.tool("images_upload_from_url", uploadFromUrlParams, async (args) => {
    const uploaded = await uploadImageFromUrl(args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(uploaded, null, 2),
        },
      ],
    };
  });

  server.tool("images_upload_from_base64", uploadFromBase64Params, async (args) => {
    const uploaded = await uploadImageFromBase64(args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(uploaded, null, 2),
        },
      ],
    };
  });
}
