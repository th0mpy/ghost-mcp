> Current fork version: **0.4.0**

# Ghost MCP Server

A Model Context Protocol (MCP) server for interacting with Ghost CMS through LLM clients such as Claude Desktop and ChatGPT-compatible MCP clients.

This fork uses the official `@tryghost/admin-api` client and exposes Ghost Admin API operations as MCP tools.

![demo](./assets/ghost-mcp-demo.gif)

## What this fork adds

Compared with the original repository, this fork now includes:

- image upload tools for Ghost Admin API uploads
- richer post create/edit support
- page tools
- theme tools
- `formats` and `include` support for post/page reads and browse operations
- HTML-first helper workflows that upload images and replace references before sending content to Ghost
- stricter post/page validation so callers do not send both `html` and `lexical` in the same request

## Important API note

This MCP server uses the **Ghost Admin API**, not the Ghost Content API.

- **Content API** is read-only and intended for published content delivery
- **Admin API** is used for authenticated create, edit, delete, image upload, page management, and theme management

## Installation

```bash
npm install --include=dev
npm run build
```

## Configuration

Set these environment variables:

- `GHOST_API_URL` — your Ghost admin/site URL, such as `https://yourblog.com`
- `GHOST_ADMIN_API_KEY` — a Ghost Admin API key from a custom integration
- `GHOST_API_VERSION` — Ghost Admin API version, such as `v5.0` or `v6.0`

## Example MCP config

```json
{
  "mcpServers": {
    "ghost-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/build/server.js"],
      "env": {
        "GHOST_API_URL": "https://yourblog.com",
        "GHOST_ADMIN_API_KEY": "your_admin_api_key",
        "GHOST_API_VERSION": "v5.0"
      }
    }
  }
}
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

Posts now expose additional common Ghost fields including:

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

For existing content, this fork now treats body updates as destructive operations:

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

### Example: edit a post from HTML and a remote image reference

```json
{
  "id": "682000000000000000000001",
  "updated_at": "2026-04-12T22:14:31.000Z",
  "html": "<p>Updated body</p><img src=\"REMOTE_IMAGE\">",
  "save_revision": true,
  "image_sources": [
    {
      "match": "REMOTE_IMAGE",
      "image_url": "https://example.com/image.png",
      "filename": "image.png"
    }
  ]
}
```

## Recommended edit workflow

For posts and pages:

1. read the current record first
2. copy the latest `id` and `updated_at`
3. use metadata-only edit tools unless you truly intend to replace the body
4. for body replacement, choose exactly one content mode: `html` or `lexical`
5. for inline images, prefer the HTML helper tools
6. if switching an existing record from one content mode to another, pass `allow_format_conversion=true` intentionally

## Notes on Ghost coverage

This fork now exposes more of Ghost Admin than the original repository, including pages, themes, image uploads, broader post fields, and HTML-with-images helpers.

It still should not be treated as a perfect 1:1 mirror of every Ghost Admin API field or endpoint. If you need another specific Ghost surface, extend the corresponding tool group in `src/tools/`.

## Destructive content replacement examples

### Replace an existing post body with HTML

```json
{
  "id": "682000000000000000000001",
  "updated_at": "2026-04-12T22:14:31.000Z",
  "html": "<p>This replaces the full post body.</p>",
  "replace_entire_content": true,
  "save_revision": true
}
```

### Replace an existing post body with Lexical

```json
{
  "id": "682000000000000000000001",
  "updated_at": "2026-04-12T22:14:31.000Z",
  "lexical": "{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}",
  "replace_entire_content": true,
  "save_revision": true
}
```

### Metadata-only post edit

```json
{
  "id": "682000000000000000000001",
  "updated_at": "2026-04-12T22:14:31.000Z",
  "title": "Updated title only",
  "feature_image": "https://yourblog.com/content/images/2026/04/example.jpg",
  "save_revision": true
}
```
