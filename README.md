> Current fork version: **0.4.0**

# Ghost MCP Server

A Model Context Protocol (MCP) server for working with the **Ghost Admin API** from MCP clients such as Claude Desktop, Claude Code, and other local stdio-compatible clients.

This fork is based on the original `ghost-mcp` project and is cleaned up for publishing to GitHub at `https://github.com/th0mpy/ghost-mcp`.

![demo](./assets/ghost-mcp-demo.gif)

## What this fork adds

Compared with the original repository, this fork includes:

- image upload tools for Ghost Admin API uploads
- richer post create/edit support
- page tools
- theme tools
- `formats` and `include` support for post/page browse and read operations
- HTML-first helper workflows that upload images and replace references before sending content to Ghost
- stricter post/page validation so callers do not send both `html` and `lexical` in the same request
- safer metadata-only editing tools for posts and pages

## Important API note

This MCP server uses the **Ghost Admin API**, not the Ghost Content API.

- **Content API** is read-only and intended for published content delivery
- **Admin API** is used for authenticated create, edit, delete, image upload, page management, and theme management

## Current transport support

This repository is the **v7/local stdio build**.

It is intended for local MCP clients that launch a command, such as Claude Desktop or Claude Code.
It does **not** expose a remote HTTP `/mcp` endpoint for ChatGPT connectors.

## Requirements

- Node.js 18+
- npm
- a Ghost site with a custom integration and Admin API key

## Quick start

```bash
npm install --include=dev
npm run build
```

Create a `.env` file or provide these environment variables through your MCP client:

- `GHOST_API_URL` — your Ghost admin/site URL, such as `https://yourblog.com`
- `GHOST_ADMIN_API_KEY` — a Ghost Admin API key from a custom integration
- `GHOST_API_VERSION` — optional, such as `v5.0` or `v6.0`

An example `.env.example` file is included in this repo.

## Example Claude Desktop / local MCP config

```json
{
  "mcpServers": {
    "ghost-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ghost-mcp/build/server.js"],
      "env": {
        "GHOST_API_URL": "https://yourblog.com",
        "GHOST_ADMIN_API_KEY": "your_admin_api_key",
        "GHOST_API_VERSION": "v5.0"
      }
    }
  }
}
```

## Run locally

```bash
npm start
```

## Supported tool groups

### Posts

- `posts_browse`
- `posts_read`
- `posts_add`
- `posts_edit`
- `posts_edit_metadata`
- `posts_replace_content_html`
- `posts_replace_content_lexical`
- `posts_delete`
- `posts_add_html_with_uploaded_images`
- `posts_edit_html_with_uploaded_images`

Posts expose additional common Ghost fields including:

- `tags`
- `authors`
- `featured`
- `visibility`
- `custom_template`
- `canonical_url`
- `codeinjection_head`
- `codeinjection_foot`
- `meta_title`
- `meta_description`
- `og_title`
- `og_description`
- `og_image`
- `twitter_title`
- `twitter_description`
- `twitter_image`
- `email_only`
- `newsletter`
- `email_segment`
- `feature_image`
- `feature_image_alt`
- `feature_image_caption`
- `custom_excerpt`
- `published_at`

### Pages

- `pages_browse`
- `pages_read`
- `pages_add`
- `pages_edit`
- `pages_edit_metadata`
- `pages_replace_content_html`
- `pages_replace_content_lexical`
- `pages_delete`

Pages support the same content pattern as posts, including `html` or `lexical`, `formats`, `include`, feature image fields, metadata fields, and HTML conversion using `source=html`.

### Images

- `images_upload_from_path`
- `images_upload_from_url`
- `images_upload_from_base64`

These map to Ghost image uploads and support:

- `purpose`: `image`, `profile_image`, or `icon`
- `ref`: optional reference string

### Themes

- `themes_browse`
- `themes_upload`
- `themes_activate`

`themes_upload` accepts a local zip file path and can optionally activate the uploaded theme.

### Existing groups retained

- `members_*`
- `users_*`
- `tags_*`
- `tiers_*`
- `offers_*`
- `newsletters_*`
- `invites_*`
- `roles_*`
- `webhooks_*`

## Post and page editing rules

### Use top-level `id` and `updated_at`

For `posts_edit` and `pages_edit`, `id` and `updated_at` must be top-level parameters.

### Do not send both `html` and `lexical`

This fork rejects requests that include both. Use one content mode per request.

### Safe edit behavior for existing posts and pages

For existing content, this fork treats body updates as destructive operations:

- `posts_edit` and `pages_edit` require `replace_entire_content=true` when `html` or `lexical` is provided
- if the existing record appears to use a different content mode, you must also pass `allow_format_conversion=true`
- for non-body changes, prefer `posts_edit_metadata` and `pages_edit_metadata`

For image-heavy editing workflows, prefer HTML plus Ghost conversion via `source=html`. This is more reliable than trying to generate raw Lexical image nodes manually.

### Recommended tool choices

- use `posts_edit_metadata` or `pages_edit_metadata` for title, status, feature image, SEO fields, tags/authors, and other non-body changes
- use `posts_replace_content_html` or `pages_replace_content_html` for explicit full-body HTML replacements
- use `posts_replace_content_lexical` or `pages_replace_content_lexical` for explicit full-body Lexical replacements
- use `posts_edit_html_with_uploaded_images` when you intentionally want to replace the full post body from HTML after uploading images

## HTML helper workflows for inline images

Two higher-level tools are included for HTML workflows:

- `posts_add_html_with_uploaded_images`
- `posts_edit_html_with_uploaded_images`

These tools:

1. upload referenced images to Ghost
2. replace matching strings inside the HTML with the returned Ghost image URLs
3. submit the final HTML to Ghost using `source=html`

### Parameters

Both helper tools take:

- `html` — required
- `image_sources` — optional array of replacement/upload instructions

Each `image_sources` item supports:

- `match` — required string to replace in the HTML
- `file_path` — local image path, optional
- `image_url` — remote image URL, optional
- `base64_data` — base64 image data, optional
- `filename` — required when using `base64_data`
- `mime_type` — optional when using base64
- `purpose` — optional Ghost image purpose
- `ref` — optional Ghost image ref

Only one upload source should be used per item.

### Example: create a post from HTML and local image references

```json
{
  "title": "HTML image workflow",
  "html": "<p>Hello</p><img src=\"LOCAL_HERO\" alt=\"Hero\">",
  "status": "draft",
  "image_sources": [
    {
      "match": "LOCAL_HERO",
      "file_path": "/Users/chris/Pictures/hero.jpg"
    }
  ]
}
```

## GitHub publishing checklist

Before you publish updates to GitHub:

1. decide whether you want to keep the current license
2. commit the repo without secrets
3. verify `.env`, real API keys, and `node_modules/` are not included
4. run a clean build:

```bash
rm -rf node_modules build
npm install --include=dev
npm run build
```

## Suggested first commit workflow

```bash
git init
git add .
git commit -m "Initial GitHub-ready Ghost MCP fork"
```

Push to the existing repo:

```bash
git branch -M main
git remote add origin https://github.com/th0mpy/ghost-mcp.git
git push -u origin main
```

## Notes

- Ghost Admin API keys are sensitive. Keep them in environment variables, not in the repository.
- This repo is intentionally focused on the local/stdin MCP use case.
- If you later want ChatGPT connector support, you will need a remote HTTP MCP transport layer in addition to this build.
