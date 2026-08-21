import { db } from "@/server/db";
import type { TemplateDefinition } from "@/types/design-system";
import { BUILT_IN_TEMPLATES } from "@/features/templates/presets/design-presets";

export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  definition: TemplateDefinition;
  isActive: boolean;
}

/**
 * Lists all active templates from database, falling back to built-in presets if database is empty.
 */
export async function listTemplates(): Promise<TemplateListItem[]> {
  try {
    const dbTemplates = await db.template.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (dbTemplates.length > 0) {
      return dbTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        thumbnailUrl: t.thumbnailUrl,
        definition: t.definition as unknown as TemplateDefinition,
        isActive: t.isActive,
      }));
    }
  } catch (error) {
    console.warn("[Templates] Failed to query database templates, serving built-in presets:", error);
  }

  // Fallback to built-in presets
  return BUILT_IN_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || null,
    category: t.category || "social-carousel",
    thumbnailUrl: null,
    definition: t,
    isActive: true,
  }));
}

/**
 * Retrieves a single template by ID.
 */
export async function getTemplateById(id: string): Promise<TemplateListItem | null> {
  // 1. Check built-in presets
  const builtIn = BUILT_IN_TEMPLATES.find((t) => t.id === id);
  if (builtIn) {
    return {
      id: builtIn.id,
      name: builtIn.name,
      description: builtIn.description || null,
      category: builtIn.category || "social-carousel",
      thumbnailUrl: null,
      definition: builtIn,
      isActive: true,
    };
  }

  // 2. Check database
  try {
    const t = await db.template.findUnique({
      where: { id },
    });

    if (!t) return null;

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      thumbnailUrl: t.thumbnailUrl,
      definition: t.definition as unknown as TemplateDefinition,
      isActive: t.isActive,
    };
  } catch (error) {
    console.error("[Templates] Failed to fetch template by ID:", error);
    return null;
  }
}
