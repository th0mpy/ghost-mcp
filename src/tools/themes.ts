// src/tools/themes.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

const browseParams = {};
const activateParams = {
  name: z.string().min(1),
};
const uploadParams = {
  file_path: z.string().min(1),
  activate: z.boolean().optional(),
};

function getThemesApi(): any {
  const themesApi = (ghostApiClient as any).themes;
  if (!themesApi) {
    throw new Error("This version of @tryghost/admin-api does not expose themes endpoints.");
  }
  return themesApi;
}

export function registerThemeTools(server: McpServer) {
  server.tool("themes_browse", browseParams, async () => {
    const themesApi = getThemesApi();
    const themes = typeof themesApi.browse === "function" ? await themesApi.browse() : await themesApi.read();
    return { content: [{ type: "text", text: JSON.stringify(themes, null, 2) }] };
  });

  server.tool("themes_activate", activateParams, async (args) => {
    const themesApi = getThemesApi();
    if (typeof themesApi.activate !== "function") {
      throw new Error("This version of @tryghost/admin-api does not expose themes.activate().");
    }
    const result = await themesApi.activate(args.name);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });

  server.tool("themes_upload", uploadParams, async (args) => {
    const themesApi = getThemesApi();
    if (typeof themesApi.upload !== "function") {
      throw new Error("This version of @tryghost/admin-api does not expose themes.upload().");
    }
    const uploaded = await themesApi.upload({ file: args.file_path });
    let activated: unknown = undefined;

    if (args.activate) {
      const themeName = uploaded?.themes?.[0]?.name || uploaded?.name;
      if (!themeName) {
        throw new Error("Theme upload succeeded but no theme name was returned for activation.");
      }
      if (typeof themesApi.activate !== "function") {
        throw new Error("Theme upload succeeded, but this SDK does not expose themes.activate().");
      }
      activated = await themesApi.activate(themeName);
    }

    return { content: [{ type: "text", text: JSON.stringify({ uploaded, activated }, null, 2) }] };
  });
}
