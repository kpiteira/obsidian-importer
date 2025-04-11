export interface ContentTypeHandler {
  /** 
   * The unique type string for this handler, e.g. "youtube"
   */
  type: string;

  /**
   * Returns true if this handler can handle the given URL.
   * @param url The URL to check
   */
  detect(url: URL): boolean;
}