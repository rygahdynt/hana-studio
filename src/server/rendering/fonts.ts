import { GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;

  const fontDir = path.join(process.cwd(), "public", "fonts");

  const fontDefinitions = [
    { file: "Inter_28pt-Regular.ttf", family: "Inter" },
    { file: "Inter_28pt-SemiBold.ttf", family: "Inter-SemiBold" },
    { file: "Montserrat-ExtraBold.ttf", family: "Montserrat-ExtraBold" },
    { file: "PlayfairDisplay-BoldItalic.ttf", family: "Playfair-BoldItalic" },
    { file: "NotoColorEmoji-Regular.ttf", family: "Noto Color Emoji" },
  ];

  for (const { file, family } of fontDefinitions) {
    const fullPath = path.join(fontDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        GlobalFonts.registerFromPath(fullPath, family);
      } catch {
        // Continue if registration fails
      }
    }
  }

  fontsRegistered = true;
}
