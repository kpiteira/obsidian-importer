import { ContentTypeHandler } from "./ContentTypeHandler";

export class YouTubeHandler implements ContentTypeHandler {
  public readonly type = "youtube";

  /**
   * Detects if the given URL is a YouTube video (youtube.com or youtu.be).
   * @param url The URL to check
   */
  detect(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "youtu.be" ||
      host === "www.youtu.be"
    );
  }
}