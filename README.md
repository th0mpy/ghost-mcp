# Ghost MCP Server

A Model Context Protocol (MCP) server for interacting with Ghost CMS through LLM interfaces such as Claude Desktop and ChatGPT-compatible MCP clients. It uses the official `@tryghost/admin-api` client and exposes Ghost admin operations as MCP tools.

![demo](./assets/ghost-mcp-demo.gif)

## Features

- Uses the official `@tryghost/admin-api` package
- MCP tools for posts, users, members, tiers, offers, newsletters, invites, roles, tags, and webhooks
- Image upload support for Ghost Admin API image endpoints
- Create and update posts with `feature_image`, image alt text, captions, and excerpts
- Supports image uploads from:
  - a local file path
  - a remote URL
  - a base64-encoded payload
- Simple environment-variable configuration
- Stdio transport for easy MCP client integration

## Installation

```bash
npm install
npm run build
```

You can also run it directly with `npx` once published from your own fork/package.

## Configuration

Set these environment variables for the Ghost Admin API:

- `GHOST_API_URL` — your Ghost site URL, such as `https://yourblog.com`
- `GHOST_ADMIN_API_KEY` — a Ghost Admin API key
- `GHOST_API_VERSION` — Ghost Admin API version, such as `v5.0`

## Usage

Example Claude Desktop configuration:

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

If you publish your fork to npm, you can switch the command to `npx` and point it at your package name.

## Available Resources

The following Ghost CMS resources are exposed:

- **Posts**
- **Members**
- **Newsletters**
- **Offers**
- **Invites**
- **Roles**
- **Tags**
- **Tiers**
- **Users**
- **Webhooks**
- **Blog Info**

## Available Tools

## Posts

- `posts_browse`
- `posts_read`
- `posts_add`
- `posts_edit`
- `posts_delete`

### Post fields supported on create/update

In addition to existing content fields, post create/update now supports:

- `feature_image`
- `feature_image_alt`
- `feature_image_caption`
- `custom_excerpt`

This makes it easy to upload an image first, then attach the returned URL as the post’s feature image.

## Images

The server now includes explicit image upload tools:

- `images_upload_from_path`
- `images_upload_from_url`
- `images_upload_from_base64`

### `images_upload_from_path`

Uploads an image already available on the same machine as the MCP server.

Parameters:

- `file_path` — absolute or relative file path to the image
- `purpose` — optional, one of `image`, `profile_image`, or `icon`
- `ref` — optional Ghost reference string

Example:

```json
{
  "file_path": "/Users/chris/Pictures/hero.jpg",
  "purpose": "image"
}
```

### `images_upload_from_url`

Downloads an image from a URL, stores it temporarily, uploads it to Ghost, then removes the temp file.

Parameters:

- `image_url` — remote image URL
- `filename` — optional file name to use locally before upload
- `purpose` — optional, one of `image`, `profile_image`, or `icon`
- `ref` — optional Ghost reference string

Example:

```json
{
  "image_url": "https://example.com/images/hero.png",
  "filename": "hero.png",
  "purpose": "image"
}
```

### `images_upload_from_base64`

Accepts raw base64 image data or a data URL, writes a temporary file, uploads it to Ghost, then removes the temp file.

Parameters:

- `filename` — file name to use for the temporary upload file
- `base64_data` — raw base64 string or full data URL
- `mime_type` — optional MIME type, used when the filename has no extension
- `purpose` — optional, one of `image`, `profile_image`, or `icon`
- `ref` — optional Ghost reference string

Example:

```json
{
  "filename": "inline-image.png",
  "base64_data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mime_type": "image/png",
  "purpose": "image"
}
```

## Members

- `members_browse`
- `members_read`
- `members_add`
- `members_edit`
- `members_delete`

## Newsletters

- `newsletters_browse`
- `newsletters_read`
- `newsletters_add`
- `newsletters_edit`
- `newsletters_delete`

## Offers

- `offers_browse`
- `offers_read`
- `offers_add`
- `offers_edit`
- `offers_delete`

## Invites

- `invites_browse`
- `invites_add`
- `invites_delete`

## Roles

- `roles_browse`
- `roles_read`

## Tags

- `tags_browse`
- `tags_read`
- `tags_add`
- `tags_edit`
- `tags_delete`

## Tiers

- `tiers_browse`
- `tiers_read`
- `tiers_add`
- `tiers_edit`
- `tiers_delete`

## Users

- `users_browse`
- `users_read`
- `users_edit`
- `users_delete`

## Webhooks

- `webhooks_browse`
- `webhooks_add`
- `webhooks_delete`

## Suggested Image Workflow

A typical image workflow for Ghost posts is:

1. Upload the image with one of the `images_upload_*` tools.
2. Copy the returned Ghost image URL.
3. Call `posts_add` or `posts_edit` with that URL in `feature_image`.

Example flow:

```json
{
  "title": "My new post",
  "html": "<p>Hello world</p>",
  "status": "draft",
  "feature_image": "https://yourblog.com/content/images/2026/04/hero.jpg",
  "feature_image_alt": "A descriptive alt text",
  "feature_image_caption": "Photo by Chris"
}
```

## Error Handling

Errors from Ghost or the MCP server are surfaced directly to the client. Common image-upload failure cases include:

- invalid Ghost Admin API key
- Ghost version/API version mismatch
- unsupported file type
- unreachable source URL for `images_upload_from_url`
- missing file path for `images_upload_from_path`
- a Ghost client version that does not expose `images.upload()`

## Development Notes

The image upload implementation uses temporary files for URL and base64 uploads because Ghost’s Admin API upload flow expects a file-based upload input.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

MIT
