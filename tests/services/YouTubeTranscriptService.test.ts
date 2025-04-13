// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as urlUtils from "../../src/utils/url";
import { fetchYouTubeTranscript, YouTubeTranscriptError, YouTubeTranscriptErrorCode } from "../../src/services/YouTubeTranscriptService";

// Helper: minimal valid player response with English captions
const validPlayerResponse = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          languageCode: "en",
          baseUrl: "https://mock.captions.url"
        }
      ]
    }
  }
};

// Helper: minimal valid captions XML
const validCaptionsXML = `<transcript><text start="0" dur="1">Hello</text><text start="1" dur="1">world!</text></transcript>`;

// Helper: player response with no captionTracks
const noCaptionTracksPlayerResponse = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: null
    }
  }
};

// Helper: player response with empty captionTracks
const emptyCaptionTracksPlayerResponse = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: []
    }
  }
};

function makeVideoPageBody(playerResponse: any) {
  return `var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};`;
}

describe("fetchYouTubeTranscript", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches and parses transcript successfully", async () => {
    // Mock fetch for video page and captions
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => validCaptionsXML
      });

    // Mock DOMParser on the global object
    const originalDOMParser = (global as any).DOMParser;
    const originalDocument = (global as any).document;
    const mockTextNode = (value: string) => ({
      textContent: value
    });
    const mockDoc = {
      getElementsByTagName: (tag: string) =>
        tag === "text"
          ? [mockTextNode("Hello"), mockTextNode("world!")]
          : []
    };
    (global as any).DOMParser = function () {
      return {
        parseFromString: () => mockDoc
      };
    };
    (global as any).document = {
      createElement: () => ({
        set innerHTML(val: string) {
          this._val = val;
        },
        get value() {
          return this._val;
        }
      })
    };

    const transcript = await fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ");
    expect(transcript).toBe("Hello world!");

    // Restore original DOMParser and document
    (global as any).DOMParser = originalDOMParser;
    (global as any).document = originalDocument;
  });

  it("throws INVALID_URL for invalid YouTube URL", async () => {
    await expect(fetchYouTubeTranscript("not-a-youtube-url")).rejects.toThrowError(
      /Invalid YouTube URL or unable to extract video ID\./
    );
  });

  it("throws FETCH_VIDEO_FAILED on network error fetching video page", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network down"));
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "FETCH_VIDEO_FAILED"
    });
  });

  it("throws FETCH_VIDEO_FAILED if video page fetch is not ok", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "FETCH_VIDEO_FAILED"
    });
  });

  it("throws PLAYER_RESPONSE_NOT_FOUND if player response is missing", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => "no player response here"
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PLAYER_RESPONSE_NOT_FOUND"
    });
  });

  it("throws PLAYER_RESPONSE_PARSE_ERROR if player response JSON is invalid", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'var ytInitialPlayerResponse = {not: "json"};'
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PLAYER_RESPONSE_PARSE_ERROR"
    });
  });

  it("throws NO_CAPTIONS if captionTracks is null", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => makeVideoPageBody(noCaptionTracksPlayerResponse)
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS"
    });
  });

  it("throws NO_CAPTIONS if captionTracks is empty", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => makeVideoPageBody(emptyCaptionTracksPlayerResponse)
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS"
    });
  });

  it("throws NO_CAPTION_TRACKS if no valid track is found", async () => {
    const playerResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ languageCode: "fr" }] // no baseUrl
        }
      }
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => makeVideoPageBody(playerResponse)
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTION_TRACKS"
    });
  });

  it("throws FETCH_CAPTIONS_FAILED on network error fetching captions", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => makeVideoPageBody(validPlayerResponse)
      })
      .mockRejectedValueOnce(new Error("Network down"));
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "FETCH_CAPTIONS_FAILED"
    });
  });

  it("throws FETCH_CAPTIONS_FAILED if captions fetch is not ok", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({ ok: false });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "FETCH_CAPTIONS_FAILED"
    });
  });

  it("throws CAPTIONS_PARSE_ERROR if captions XML is invalid", async () => {
    // Mock DOMParser and document for this test
    const originalDOMParser = (global as any).DOMParser;
    const originalDocument = (global as any).document;
    (global as any).DOMParser = function () {
      return {
        parseFromString: () => { throw new Error("bad xml"); }
      };
    };
    (global as any).document = {
      createElement: () => ({
        set innerHTML(val: string) {
          this._val = val;
        },
        get value() {
          return this._val;
        }
      })
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<not-xml"
      });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "CAPTIONS_PARSE_ERROR"
    });

    (global as any).DOMParser = originalDOMParser;
    (global as any).document = originalDocument;
  });

  it("throws CAPTIONS_PARSE_ERROR if captions XML has no text nodes", async () => {
    // Mock DOMParser and document for this test
    const originalDOMParser = (global as any).DOMParser;
    const originalDocument = (global as any).document;
    (global as any).DOMParser = function () {
      return {
        parseFromString: () => ({
          getElementsByTagName: (tag: string) => []
        })
      };
    };
    (global as any).document = {
      createElement: () => ({
        set innerHTML(val: string) {
          this._val = val;
        },
        get value() {
          return this._val;
        }
      })
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<transcript></transcript>"
      });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "CAPTIONS_PARSE_ERROR"
    });

    (global as any).DOMParser = originalDOMParser;
    (global as any).document = originalDocument;
  });

  it("throws UNKNOWN for unexpected errors", async () => {
    const spy = vi.spyOn(urlUtils, "extractYouTubeVideoId").mockImplementation(() => {
      throw new Error("unexpected");
    });
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "UNKNOWN"
    });
    spy.mockRestore();
  });
});