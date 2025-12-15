/* eslint-disable @typescript-eslint/no-explicit-any */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";

const workspaceRoot = path.resolve(process.cwd());

export const toolSpec = {
  name: "list_directory",
  description: "List files and folders under a workspace path, mimicking the `ls` command.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path from the workspace root. Use '.' for the root directory.",
        default: ".",
      },
    },
  },
  returns: {
    type: "object",
    properties: {
      path: { type: "string", description: "Normalized relative path that was inspected." },
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            path: { type: "string" },
            kind: { type: "string", enum: ["directory", "file", "symlink", "other"] },
          },
        },
      },
    },
  },
};

export type DirectoryEntrySummary = {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
};

export type ListDirectoryResult = {
  path: string;
  entries: DirectoryEntrySummary[];
};

const kindOrder: Record<DirectoryEntrySummary["kind"], number> = {
  directory: 0,
  file: 1,
  symlink: 2,
  other: 3,
};

function normalizeInputPath(inputPath?: string) {
  const trimmed = inputPath?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : ".";
}

function resolveWorkspacePath(inputPath?: string) {
  const normalizedInput = normalizeInputPath(inputPath);
  const absolute = path.resolve(workspaceRoot, normalizedInput);
  const relative = path.relative(workspaceRoot, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path must stay within the project workspace.");
  }

  return {
    absolute,
    relative: relative.length === 0 ? "." : relative,
    normalizedInput,
  };
}

function getEntryKind(entry: { isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean }) {
  if (entry.isDirectory()) return "directory";
  if (entry.isFile()) return "file";
  if (entry.isSymbolicLink()) return "symlink";
  return "other";
}

export async function listDirectoryContents(inputPath?: string): Promise<ListDirectoryResult> {
  const { absolute, relative, normalizedInput } = resolveWorkspacePath(inputPath);
  try {
    const dirents = await readdir(absolute, { withFileTypes: true });
    const entries: DirectoryEntrySummary[] = dirents
      .map(entry => ({
        name: entry.name,
        path: path.relative(workspaceRoot, path.join(absolute, entry.name)) || entry.name,
        kind: getEntryKind(entry),
      }))
      .sort((a, b) => {
        if (a.kind === b.kind) {
          return a.name.localeCompare(b.name);
        }
        return kindOrder[a.kind] - kindOrder[b.kind];
      });

    return { path: relative, entries };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new Error(`Path "${normalizedInput}" does not exist in the workspace.`);
      }
      if (code === "ENOTDIR") {
        throw new Error(`Path "${normalizedInput}" is not a directory.`);
      }
      if (code === "EACCES") {
        throw new Error(`Path "${normalizedInput}" cannot be read due to permission restrictions.`);
      }
    }
    throw new Error(
      error instanceof Error ? error.message : "Failed to read directory contents.",
    );
  }
}


export const listDirectoryTool = tool({
  description: toolSpec.description,
  inputSchema: z.object({
    path: z
      .string()
      .describe("Relative path from the workspace root. Use '.' for the root directory.")
      .default("."),
  }),
  execute: async ({ path }: { path: string }) => {
    return listDirectoryContents(path);
  }
} as any);
