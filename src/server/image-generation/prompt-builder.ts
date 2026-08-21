/**
 * Builds a structured, project-aware image generation prompt.
 * Seamlessly integrates creative direction (from Project.description) with scene-specific user prompts.
 */
export function buildImageGenerationPrompt(
  scenePrompt: string,
  projectDescription?: string | null,
  hasReferenceImages = false,
): string {
  const trimmedScene = scenePrompt.trim();
  const trimmedDirection = projectDescription?.trim();

  if (!trimmedDirection) {
    if (hasReferenceImages) {
      return `${trimmedScene}\n\nCONSISTENCY REQUIREMENTS:\nMaintain strict character identity, facial features, skin tone, and visual style matching the provided reference image(s).`;
    }
    return trimmedScene;
  }

  let fullPrompt = `CREATIVE DIRECTION:\n${trimmedDirection}\n\nSCENE:\n${trimmedScene}`;

  if (hasReferenceImages) {
    fullPrompt += `\n\nCONSISTENCY REQUIREMENTS:\nStrictly preserve the character identity, facial features, skin tone, hairstyle, and aesthetic style defined in the creative direction and reference visual(s).`;
  } else {
    fullPrompt += `\n\nCONSISTENCY REQUIREMENTS:\nAdhere faithfully to the character guidelines and visual style defined in the creative direction above.`;
  }

  return fullPrompt;
}
