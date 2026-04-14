// src/tools/pages.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

const pageStatusSchema = z.enum(["draft", "published", "scheduled"]);

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
  status: pageStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  authors: z.array(z.any()).optional(),
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
};
const editParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  html: z.string().optional().describe("Dangerous for existing pages: html replaces the full body via Ghost's source=html conversion path."),
  lexical: z.string().optional().describe("Dangerous for existing pages: lexical replaces the full body."),
  replace_entire_content: z.boolean().optional(),
  allow_format_conversion: z.boolean().optional(),
  status: pageStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  save_revision: z.boolean().optional(),
  authors: z.array(z.any()).optional(),
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
};

const editMetadataParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  status: pageStatusSchema.optional(),
  feature_image: z.string().optional(),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  custom_excerpt: z.string().optional(),
  published_at: z.string().optional(),
  save_revision: z.boolean().optional(),
  authors: z.array(z.any()).optional(),
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
const deleteParams = {
  id: z.string(),
};

function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function ensureContentMode(args: { html?: string; lexical?: string }) {
  if (args.html && args.lexical) {
    throw new Error("Provide either html or lexical, not both. For existing pages, use the dedicated content replacement tools when changing the body.");
  }
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

async function readPageForEdit(id: string): Promise<Record<string, unknown>> {
  return (await (ghostApiClient as any).pages.read({ id, formats: "html,lexical" } as any)) as Record<string, unknown>;
}

async function validateExistingPageContentUpdate(args: {
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
        ? "Using html in pages_edit replaces the entire page body via Ghost's source=html conversion path. Re-run with replace_entire_content=true, or use pages_edit_metadata for non-body updates."
        : "Using lexical in pages_edit replaces the entire page body. Re-run with replace_entire_content=true, or use pages_edit_metadata for non-body updates."
    );
  }

  const existingPage = await readPageForEdit(args.id);
  const existingMode = detectExistingContentMode(existingPage);
  if (existingMode && existingMode !== requestedMode && !args.allow_format_conversion) {
    throw new Error(
      `This page currently appears to use ${existingMode} content. Replacing it with ${requestedMode} may overwrite and reformat the full body. Re-run with allow_format_conversion=true only if you intend a full content replacement.`
    );
  }
}

function buildPagePayload(args: Record<string, unknown>) {
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
    authors: args.authors,
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
  });
}

function buildMetadataOnlyPagePayload(args: Record<string, unknown>) {
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
    authors: args.authors,
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
  });
}

export function registerPageTools(server: McpServer) {
  server.tool("pages_browse", browseParams, async (args) => {
    const pages = await (ghostApiClient as any).pages.browse(args as any);
    return { content: [{ type: "text", text: JSON.stringify(pages, null, 2) }] };
  });

  server.tool("pages_read", readParams, async (args) => {
    const page = await (ghostApiClient as any).pages.read(args as any);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_add", addParams, async (args) => {
    ensureContentMode(args);
    const payload = buildPagePayload(args as any);
    const options = args.html ? ({ source: "html" } as any) : undefined;
    const page = await (ghostApiClient as any).pages.add(payload as any, options);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_edit", editParams, async (args) => {
    await validateExistingPageContentUpdate(args);
    const payload = buildPagePayload(args as any);
    const options = cleanObject({ source: args.html ? "html" : undefined, save_revision: args.save_revision });
    const page = await (ghostApiClient as any).pages.edit(payload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_edit_metadata", editMetadataParams, async (args) => {
    const payload = buildMetadataOnlyPagePayload(args as any);
    const options = cleanObject({ save_revision: args.save_revision });
    const page = await (ghostApiClient as any).pages.edit(payload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_replace_content_html", replaceContentHtmlParams, async (args) => {
    await validateExistingPageContentUpdate(args);
    const payload = buildPagePayload(args as any);
    const options = cleanObject({ source: "html", save_revision: args.save_revision });
    const page = await (ghostApiClient as any).pages.edit(payload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_replace_content_lexical", replaceContentLexicalParams, async (args) => {
    await validateExistingPageContentUpdate(args);
    const payload = buildPagePayload(args as any);
    const options = cleanObject({ save_revision: args.save_revision });
    const page = await (ghostApiClient as any).pages.edit(payload as any, Object.keys(options).length > 0 ? (options as any) : undefined);
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  });

  server.tool("pages_delete", deleteParams, async (args) => {
    await (ghostApiClient as any).pages.delete(args as any);
    return { content: [{ type: "text", text: `Page with id ${args.id} deleted.` }] };
  });
}
