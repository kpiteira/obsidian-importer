/**
 * Interface representing YouTube video metadata as returned by the oEmbed API,
 * with additional videoId field.
 */
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  author: string;
  authorUrl: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  providerName: string;
  providerUrl: string;
  html: string;
  width: number;
  height: number;
  version: string;
  type: string;
  transcript?: string; // Optional transcript field for pipeline compatibility
}