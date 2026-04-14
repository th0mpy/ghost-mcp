// src/tools/posts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import {
  uploadImageFromBase64,
  uploadImageFromPath,
  uploadImageFromUrl,
  type ImageUploadPurpose,
  type UploadedImage,
} from "./images";

const postStatusSchema = z.enum(["draft", "published", "scheduled", "sent"]);

const imageSourceSchema = z.object({
  match: z.string().min(1),
  file_path: z.string().optional(),
  image_url: z.string().url().optional(),
  filename: z.string().optional(),
  base64_data: z.string().optional(),
  mime_type: z.string().optional(),
  purpose: z.enum(["image", "profile_image", "icon"] as const).optional(),
  ref: z.string().optional(),
});

const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
};
const addParams = {
  title: z.string(),
  html: z.string().optional(),
  lexical: z.string().optional(),
  status: postStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  tags: z.array(z.any()).optional(),
  authors: z.array(z.any()).optional(),
  featured: z.boolean().optional(),
  visibility: z.string().optional(),
  custom_template: z.string().optional(),
  canonical_url: z.string().optional(),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  email_only: z.boolean().optional(),
  newsletter: z.string().optional(),
  email_segment: z.string().optional(),
};
const editParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  html: z.string().optional().describe("Dangerous for existing posts: html replaces the full body via Ghost's source=html conversion path."),
  lexical: z.string().optional().describe("Dangerous for existing posts: lexical replaces the full body."),
  replace_entire_content: z.boolean().optional(),
  allow_format_conversion: z.boolean().optional(),
  status: postStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  save_revision: z.boolean().optional(),
  tags: z.array(z.any()).optional(),
  authors: z.array(z.any()).optional(),
  featured: z.boolean().optional(),
  visibility: z.string().optional(),
  custom_template: z.string().optional(),
  canonical_url: z.string().optional(),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  email_only: z.boolean().optional(),
  newsletter: z.string().optional(),
  email_segment: z.string().optional(),
};
const deleteParams = {
  id: z.string(),
};

const htmlWithImagesBaseParams = {
  html: z.string(),
  image_sources: z.array(imageSourceSchema).optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  status: postStatusSchema.optional(),
  tags: z.array(z.any()).optional(),
  authors: z.array(z.any()).optional(),
  featured: z.boolean().optional(),
  visibility: z.string().optional(),
  custom_template: z.string().optional(),
  canonical_url: z.string().optional(),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  email_only: z.boolean().optional(),
  newsletter: z.string().optional(),
  email_segment: z.string().optional(),
};

const addHtmlWithImagesParams = {
  title: z.string(),
  ...htmlWithImagesBaseParams,
};

const editHtmlWithImagesParams = {
  id: z.string(),
  updated_at: z.string(),
  save_revision: z.boolean().optional(),
  title: z.string().optional(),
  allow_format_conversion: z.boolean().optional(),
  ...htmlWithImagesBaseParams,
};

const editMetadataParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  status: postStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  save_revision: z.boolean().optional(),
  tags: z.array(z.any()).optional(),
  authors: z.array(z.any()).optional(),
  featured: z.boolean().optional(),
  visibility: z.string().optional(),
  custom_template: z.string().optional(),
  canonical_url: z.string().optional(),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
  email_only: z.boolean().optional(),
  newsletter: z.string().optional(),
  email_segment: z.string().optional(),
};

const replaceContentHtmlParams = {
  id: z.string(),
  updated_at: z.string(),
  html: z.string(),
  replace_entire_content: z.literal(true),
  allow_format_conversion: z.boolean().optional(),
  save_revision: z.boolean().optional(),
};

const replaceContentLexicalParams = {
  id: z.string(),
  updated_at: z.string(),
  lexical: z.string(),
  replace_entire_content: z.literal(true),
  allow_format_conversion: z.boolean().optional(),
  save_revision: z.boolean().optional(),
};

function ensureContentMode(args: { html?: string; lexical?: string }) {
  if (args.html && args.lexical) {
    throw new Error("Provide either html or lexical, not both. For inline images, prefer html and let Ghost convert it with source=html.");
  }
}

function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function getRequestedContentMode(args: { html?: string; lexical?: string }): "html" | "lexical" | undefined {
  if (args.html) return "html";
  if (args.lexical) return "lexical";
  return undefined;
}

function detectExistingContentMode(record: Record<string, unknown>): "html" | "lexical" | undefined {
  if (typeof record.lexical === "string" && record.lexical.trim()) return "lexical";
  if (typeof record.html === "string" && record.html.trim()) return "html";
  return undefined;
}

async function readPostForEdit(id: string): Promise<Record<string, unknown>> {
  return (await ghostApiClient.posts.read({ id, formats: "html,lexical" } as any)) as unknown as Record<string, unknown>;
}

async function validateExistingPostContentUpdate(args: {
  id: string;
  html?: string;
  lexical?: string;
  replace_entire_content?: boolean;
  allow_format_conversion?: boolean;
}): Promise<void> {
  ensureContentMode(args);

  const requestedMode = getRequestedContentMode(args);
  if (!requestedMode) return;

  if (!args.replace_entire_content) {
    throw new Error(
      requestedMode === "html"
        ? "Using html in posts_edit replaces the entire post body via Ghost's source=html conversion path. Re-run with replace_entire_content=true, or use posts_edit_metadata for non-body updates."
        : "Using lexical in posts_edit replaces the entire post body. Re-run with replace_entire_content=true, or use posts_edit_metadata for non-body updates."
    );
  }

  const existingPost = await readPostForEdit(args.id);
  const existingMode = detectExistingContentMode(existingPost);
  if (existingMode && existingMode !== requestedMode && !args.allow_format_conversion) {
    throw new Error(
      `This post currently appears to use ${existingMode} content. Replacing it with ${requestedMode} may overwrite and reformat the full body. Re-run with allow_format_conversion=true only if you intend a full content replacement.`
    );
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function uploadReferencedImage(source: z.infer<typeof imageSourceSchema>): Promise<UploadedImage> {
  const purpose = source.purpose as ImageUploadPurpose | undefined;

  if (source.file_path) {
    return uploadImageFromPath({ file_path: source.file_path, purpose, ref: source.ref });
  }

  if (source.image_url) {
    return uploadImageFromUrl({
      image_url: source.image_url,
      filename: source.filename,
      purpose,
      ref: source.ref,
    });
  }

  if (source.base64_data && source.filename) {
    return uploadImageFromBase64({
      filename: source.filename,
      base64_data: source.base64_data,
      mime_type: source.mime_type,
      purpose,
      ref: source.ref,
    });
  }

  throw new Error(`Image source for match '${source.match}' must include file_path, image_url, or base64_data with filename.`);
}

async function replaceHtmlImageReferences(
  html: string,
  imageSources?: Array<z.infer<typeof imageSourceSchema>>
): Promise<{ html: string; uploads: Array<{ match: string; uploaded: UploadedImage }> }> {
  if (!imageSources || imageSources.length === 0) {
    return { html, uploads: [] };
  }

  let updatedHtml = html;
  const uploads: Array<{ match: string; uploaded: UploadedImage }> = [];

  for (const source of imageSources) {
    const uploaded = await uploadReferencedImage(source);
    const targetUrl = typeof uploaded.url === "string" ? uploaded.url : typeof uploaded.path === "string" ? uploaded.path : undefined;

    if (!targetUrl) {
      throw new Error(`Ghost did not return a usable URL for image match '${source.match}'.`);
    }

    updatedHtml = updatedHtml.replace(new RegExp(escapeRegExp(source.match), "g"), () => targetUrl);
    uploads.push({ match: source.match, uploaded });
  }

  return { html: updatedHtml, uploads };
}

function buildPostPayload(args: Record<string, unknown>) {
  return cleanObject({
    id: args.id,
    updated_at: args.updated_at,
    title: args.title,
    html: args.html,
    lexical: args.lexical,
    status: args.status,
    feature_image: args.feature_image,
    feature_image_alt: args.feature_image_alt,
    feature_image_caption: args.feature_image_caption,
    custom_excerpt: args.custom_excerpt,
    published_at: args.published_at,
    tags: args.tags,
    authors: args.authors,
    featured: args.featured,
    visibility: args.visibility,
    custom_template: args.custom_template,
    canonical_url: args.canonical_url,
    codeinjection_head: args.codeinjection_head,
    codeinjection_foot: args.codeinjection_foot,
    meta_title: args.meta_title,
    meta_description: args.meta_description,
    og_title: args.og_title,
    og_description: args.og_description,
    og_image: args.og_image,
    twitter_title: args.twitter_title,
    twitter_description: args.twitter_description,
    twitter_image: args.twitter_image,
    email_only: args.email_only,
    newsletter: args.newsletter,
    email_segment: args.email_segment,
  });
}

function buildMetadataOnlyPostPayload(args: Record<string, unknown>) {
  return cleanObject({
    id: args.id,
    updated_at: args.updated_at,
    title: args.title,
    status: args.status,
    feature_image: args.feature_image,
    feature_image_alt: args.feature_image_alt,
    feature_image_caption: args.feature_image_caption,
    custom_excerpt: args.custom_excerpt,
    published_at: args.published_at,
    tags: args.tags,
    authors: args.authors,
    featured: args.featured,
    visibility: args.visibility,
    custom_template: args.custom_template,
    canonical_url: args.canonical_url,
    codeinjection_head: args.codeinjection_head,
    codeinjection_foot: args.codeinjection_foot,
    meta_title: args.meta_title,
    meta_description: args.meta_description,
    og_title: args.og_title,
    og_description: args.og_description,
    og_image: args.og_image,
    twitter_title: args.twitter_title,
    twitter_description: args.twitter_description,
    twitter_image: args.twitter_image,
    email_only: args.email_only,
    newsletter: args.newsletter,
    email_segment: args.email_segment,
  });
}

function buildPostOptions(args: { html?: string; save_revision?: boolean }) {
  return cleanObject({
    source: args.html ? "html" : undefined,
    save_revision: args.save_revision,
  });
}

export function registerPostTools(server: McpServer) {
  server.tool("posts_browse", browseParams, async (args) => {
    const posts = await ghostApiClient.posts.browse(args as any);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(posts, null, 2),
        },
      ],
    };
  });

  server.tool("posts_read", readParams, async (args) => {
    const post = await ghostApiClient.posts.read(args as any);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_add", addParams, async (args) => {
    ensureContentMode(args);
    const postPayload = buildPostPayload(args as any);
    const options = buildPostOptions(args);
    const post = await ghostApiClient.posts.add(postPayload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_edit", editParams, async (args) => {
    await validateExistingPostContentUpdate(args);
    const postPayload = buildPostPayload(args as any);
    const options = buildPostOptions(args);
    const post = await ghostApiClient.posts.edit(postPayload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_edit_metadata", editMetadataParams, async (args) => {
    const postPayload = buildMetadataOnlyPostPayload(args as any);
    const options = buildPostOptions({ save_revision: args.save_revision } as any);
    const post = await ghostApiClient.posts.edit(postPayload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_replace_content_html", replaceContentHtmlParams, async (args) => {
    await validateExistingPostContentUpdate(args);
    const payload = buildPostPayload(args as any);
    const options = buildPostOptions({ html: args.html, save_revision: args.save_revision });
    const post = await ghostApiClient.posts.edit(payload as any, options as any);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_replace_content_lexical", replaceContentLexicalParams, async (args) => {
    await validateExistingPostContentUpdate(args);
    const payload = buildPostPayload(args as any);
    const options = buildPostOptions({ save_revision: args.save_revision } as any);
    const post = await ghostApiClient.posts.edit(payload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(post, null, 2),
        },
      ],
    };
  });

  server.tool("posts_add_html_with_uploaded_images", addHtmlWithImagesParams, async (args) => {
    const replaced = await replaceHtmlImageReferences(args.html, args.image_sources);
    const payload = buildPostPayload({ ...args, html: replaced.html });
    const post = await ghostApiClient.posts.add(payload as any, { source: "html" } as any);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ post, uploads: replaced.uploads }, null, 2),
        },
      ],
    };
  });

  server.tool("posts_edit_html_with_uploaded_images", editHtmlWithImagesParams, async (args) => {
    await validateExistingPostContentUpdate({
      id: args.id,
      html: args.html,
      replace_entire_content: true,
      allow_format_conversion: args.allow_format_conversion,
    });
    const replaced = await replaceHtmlImageReferences(args.html, args.image_sources);
    const payload = buildPostPayload({ ...args, html: replaced.html });
    const options = buildPostOptions({ html: replaced.html, save_revision: args.save_revision });
    const post = await ghostApiClient.posts.edit(payload as any, options as any);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ post, uploads: replaced.uploads }, null, 2),
        },
      ],
    };
  });

  server.tool("posts_delete", deleteParams, async (args) => {
    await ghostApiClient.posts.delete(args as any);
    return {
      content: [
        {
          type: "text",
          text: `Post with id ${args.id} deleted.`,
        },
      ],
    };
  });
}
