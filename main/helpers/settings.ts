import path from "path";
import fs from "fs";
import { app, ipcMain } from "electron";

const settingsPath = path.join(app.getPath("userData"), "appsettings.ini");

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export interface Extension {
  id: string;
  name: string;
  type: "url" | "folder";
  value: string;
}

export interface AppSettings {
  startUrl: string;
  bookmarks: Bookmark[];
  extensions: Extension[];
}

const DEFAULT_SETTINGS: AppSettings = {
  startUrl: "",
  bookmarks: [],
  extensions: [],
};

// ── INI Parser ────────────────────────────────────────────────────────────────

type IniData = Record<string, Record<string, string>>;

function parseIni(content: string): IniData {
  const result: IniData = {};
  let currentSection = "__root__";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    // Skip blank lines and comments
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    // Section header
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] ??= {};
      continue;
    }

    // Key=Value (value may itself contain '=' e.g. URLs with query strings)
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1);
    result[currentSection] ??= {};
    result[currentSection][key] = value;
  }

  return result;
}

function serializeIni(data: IniData): string {
  const chunks: string[] = [
    "; appsettings.ini — Temporary Browser Manager",
    "; This file is auto-generated. You may edit it manually.",
    "",
  ];

  for (const [section, entries] of Object.entries(data)) {
    chunks.push(`[${section}]`);
    for (const [key, value] of Object.entries(entries)) {
      chunks.push(`${key}=${value}`);
    }
    chunks.push(""); // blank line between sections
  }

  return chunks.join("\n");
}

// ── Read / Write ──────────────────────────────────────────────────────────────

export function readSettings(): AppSettings {
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = fs.readFileSync(settingsPath, "utf-8");
    const ini = parseIni(content);

    // [general]
    const startUrl = ini["general"]?.["startUrl"] ?? "";

    // [bookmarks]
    const bookmarkCount = parseInt(ini["bookmarks"]?.["count"] ?? "0", 10);
    const bookmarks: Bookmark[] = [];
    for (let i = 0; i < bookmarkCount; i++) {
      const id = ini["bookmarks"]?.[`${i}.id`];
      const title = ini["bookmarks"]?.[`${i}.title`];
      const url = ini["bookmarks"]?.[`${i}.url`];
      if (id !== undefined && title !== undefined && url !== undefined) {
        bookmarks.push({ id, title, url });
      }
    }

    // [extensions]
    const extCount = parseInt(ini["extensions"]?.["count"] ?? "0", 10);
    const extensions: Extension[] = [];
    for (let i = 0; i < extCount; i++) {
      const id = ini["extensions"]?.[`${i}.id`];
      const name = ini["extensions"]?.[`${i}.name`];
      const type = ini["extensions"]?.[`${i}.type`] as "url" | "folder";
      const value = ini["extensions"]?.[`${i}.value`];
      if (
        id !== undefined &&
        name !== undefined &&
        type &&
        value !== undefined
      ) {
        extensions.push({ id, name, type, value });
      }
    }

    return { startUrl, bookmarks, extensions };
  } catch (error) {
    console.error("Failed to read appsettings.ini:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: AppSettings): void {
  const ini: IniData = {};

  // [general]
  ini["general"] = {
    startUrl: settings.startUrl,
  };

  // [bookmarks]
  const bookmarkSection: Record<string, string> = {
    count: String(settings.bookmarks.length),
  };
  settings.bookmarks.forEach((b, i) => {
    bookmarkSection[`${i}.id`] = b.id;
    bookmarkSection[`${i}.title`] = b.title;
    bookmarkSection[`${i}.url`] = b.url;
  });
  ini["bookmarks"] = bookmarkSection;

  // [extensions]
  const extSection: Record<string, string> = {
    count: String(settings.extensions.length),
  };
  settings.extensions.forEach((e, i) => {
    extSection[`${i}.id`] = e.id;
    extSection[`${i}.name`] = e.name;
    extSection[`${i}.type`] = e.type;
    extSection[`${i}.value`] = e.value;
  });
  ini["extensions"] = extSection;

  fs.writeFileSync(settingsPath, serializeIni(ini), "utf-8");
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

const registerSettingsHandlers = () => {
  // Full read
  ipcMain.handle("settings-get", (): AppSettings => {
    return readSettings();
  });

  // Partial save — general section only
  ipcMain.handle(
    "settings-save-general",
    (_event, data: { startUrl: string }) => {
      try {
        const current = readSettings();
        writeSettings({ ...current, startUrl: data.startUrl });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );

  // Partial save — bookmarks section only
  ipcMain.handle("settings-save-bookmarks", (_event, bookmarks: Bookmark[]) => {
    try {
      const current = readSettings();
      writeSettings({ ...current, bookmarks });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Partial save — extensions section only
  ipcMain.handle(
    "settings-save-extensions",
    (_event, extensions: Extension[]) => {
      try {
        const current = readSettings();
        writeSettings({ ...current, extensions });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );
};

export default registerSettingsHandlers;
