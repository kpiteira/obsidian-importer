import { promises as fs } from "fs";
import * as path from "path";

/**
 * Ensures that all required note folders exist for the Obsidian Importer.
 * This function creates the default folder structure for organized notes.
 * 
 * - sources/
 * - sources/YouTube/
 * 
 * Extend this list as new content types are supported.
 * 
 * Does not perform file writing, note content generation, or error handling.
 */
export async function ensureNoteFoldersExist(baseDir: string = process.cwd()): Promise<void> {
  const folders = [
    path.join(baseDir, "sources"),
    path.join(baseDir, "sources", "YouTube"),
    // Add more folders here as new content types are added
  ];

  for (const folder of folders) {
    await fs.mkdir(folder, { recursive: true });
  }
}