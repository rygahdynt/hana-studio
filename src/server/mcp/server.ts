import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { User } from "@prisma/client";
import { registerHanaStudioTools } from "./tools";
import { BUILT_IN_TEMPLATES } from "@/features/templates/presets/design-presets";

const DESIGN_RULES_DOC = `# Hana Studio Carousel Design & Layout Rules

1. Canvas Dimensions: Standard TikTok carousel format is strictly 1080 × 1920 px (9:16 vertical).
2. Slide Roles:
   - Slide 1 (Hook): Impactful headline (72px), high-contrast category badge, centered copy, swipe indicator.
   - Slides 2 to N-1 (Content): Numbered badge pill (#1, #2), 56px headline, 36px body text, structural card containers for sub-points.
   - Slide N (CTA): Summary headline, explanatory text, and high-contrast pill CTA action button.
3. Separation of Concerns:
   - AI generates semantic ContentPlan (text, narrative, purpose).
   - Hana Studio Layout Resolver generates visual geometry, dimensions, colors, and typography.
4. Assets: Uploaded image assets in the media library are referenced via stable assetId.
`;

/**
 * Creates and configures a Hana Studio MCP server instance for an authenticated user.
 */
export function createHanaStudioMcpServer(user: User): McpServer {
  const server = new McpServer({
    name: "hana-studio",
    version: "1.0.0",
  });

  // -------------------------------------------------------------------------
  // Read-only Documentation & Template Resources
  // -------------------------------------------------------------------------
  server.registerResource(
    "design_rules",
    "hana-studio://docs/design-rules",
    {
      description: "Hana Studio design system guidelines, typography scales, and TikTok 9:16 layout rules.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "hana-studio://docs/design-rules",
          text: DESIGN_RULES_DOC,
        },
      ],
    }),
  );

  server.registerResource(
    "available_templates",
    "hana-studio://templates",
    {
      description: "Available built-in design themes and styling presets in Hana Studio.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "hana-studio://templates",
          text: JSON.stringify(BUILT_IN_TEMPLATES, null, 2),
        },
      ],
    }),
  );

  // -------------------------------------------------------------------------
  // Register Domain Tools
  // -------------------------------------------------------------------------
  registerHanaStudioTools(server, user);

  return server;
}
