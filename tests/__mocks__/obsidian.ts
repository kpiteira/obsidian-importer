// __mocks__/obsidian.ts
// Vitest mock for the "obsidian" module. This allows tests to run outside the Obsidian app by providing stubs
// for all APIs imported from "obsidian" in the codebase. If you use additional Obsidian APIs, add stubs here.
//
// How this works:
// - All imports from "obsidian" in your code are replaced with these mocks during Vitest runs.
// - To ensure this mock is loaded, add `vi.mock("obsidian")` at the top of each test file or in a global setup file.

export const requestUrl = async (...args: any[]): Promise<RequestUrlResponse> => {
  return {
    status: 200,
    json: async () => ({}),
    text: async () => "",
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: {},
    url: "",
  };
};

export interface RequestUrlResponse {
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: Record<string, string>;
  url: string;
}

// Stub classes for UI and plugin APIs
export class Notice {
  constructor(_message?: string) {}
}
export class App {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {
  constructor(_app?: App) {}
}