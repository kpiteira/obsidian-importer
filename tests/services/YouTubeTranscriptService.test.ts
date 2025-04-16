// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as youtubeUtils from "../../src/utils/youtube";
import * as obsidian from "obsidian";
import { fetchYouTubeTranscript, YouTubeTranscriptError } from "../../src/services/YouTubeTranscriptService";

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
  // Create a proper mock for the requestUrl function
  const mockedRequestUrl = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Replace the original requestUrl with our mock
    vi.spyOn(obsidian, 'requestUrl').mockImplementation(mockedRequestUrl);
    
    // Mock the extractYouTubeVideoId function from youtube.ts
    vi.spyOn(youtubeUtils, "extractYouTubeVideoId").mockImplementation((url: string) => {
      if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) {
        return "dQw4w9WgXcQ"; // Mock video ID
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and parses transcript successfully", async () => {
    // Mock requestUrl for the video page request
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: makeVideoPageBody(validPlayerResponse)
    });
    
    // Mock requestUrl for the captions request
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: validCaptionsXML
    });

    // Mock DOMParser for XML parsing
    const mockTextNode = (value: string) => ({
      textContent: value
    });
    
    // Mock document.getElementsByTagName
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockReturnValue({
        getElementsByTagName: (tag: string) => 
          tag === "text" 
            ? [mockTextNode("Hello"), mockTextNode("world!")]
            : []
      })
    }));

    const transcript = await fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ");
    expect(transcript).toBe("Hello world!");
  });

  it("throws INVALID_URL for invalid YouTube URL", async () => {
    // Make extractYouTubeVideoId return null for this test
    (youtubeUtils.extractYouTubeVideoId as any).mockReturnValueOnce(null);
    
    await expect(fetchYouTubeTranscript("not-a-youtube-url"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "INVALID_URL"
      }));
  });

  it("throws FETCH_VIDEO_FAILED on network error fetching video page", async () => {
    // Mock requestUrl to throw an error for network failure
    mockedRequestUrl.mockRejectedValueOnce(new Error("Network down"));
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "FETCH_VIDEO_FAILED"
      }));
  });

  it("throws FETCH_VIDEO_FAILED if video page fetch is not ok", async () => {
    // Mock requestUrl to return non-200 status
    mockedRequestUrl.mockResolvedValueOnce({
      status: 404,
      text: "Not found"
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "FETCH_VIDEO_FAILED"
      }));
  });

  it("throws PLAYER_RESPONSE_NOT_FOUND if player response is missing", async () => {
    // Mock requestUrl to return HTML without player response
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: "no player response here"
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "PLAYER_RESPONSE_NOT_FOUND"
      }));
  });

  it("throws PLAYER_RESPONSE_PARSE_ERROR if player response JSON is invalid", async () => {
    // Mock requestUrl to return HTML with invalid JSON in player response
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: 'var ytInitialPlayerResponse = {not valid json};'
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "PLAYER_RESPONSE_PARSE_ERROR"
      }));
  });

  it("throws NO_CAPTIONS if captionTracks is null", async () => {
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: makeVideoPageBody(noCaptionTracksPlayerResponse)
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "NO_CAPTIONS" 
      }));
  });

  it("throws NO_CAPTIONS if captionTracks is empty", async () => {
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: makeVideoPageBody(emptyCaptionTracksPlayerResponse)
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "NO_CAPTIONS"
      }));
  });

  it("throws NO_CAPTION_TRACKS if no valid track is found", async () => {
    const playerResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ languageCode: "fr" }] // no baseUrl
        }
      }
    };
    
    mockedRequestUrl.mockResolvedValueOnce({
      status: 200,
      text: makeVideoPageBody(playerResponse)
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "NO_CAPTION_TRACKS"
      }));
  });

  it("throws FETCH_CAPTIONS_FAILED on network error fetching captions", async () => {
    mockedRequestUrl
      .mockResolvedValueOnce({
        status: 200,
        text: makeVideoPageBody(validPlayerResponse)
      })
      .mockRejectedValueOnce(new Error("Network down"));
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "FETCH_CAPTIONS_FAILED"
      }));
  });

  it("throws FETCH_CAPTIONS_FAILED if captions fetch is not ok", async () => {
    mockedRequestUrl
      .mockResolvedValueOnce({
        status: 200,
        text: makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        status: 404,
        text: "Not found"
      });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "FETCH_CAPTIONS_FAILED"
      }));
  });

  it("throws CAPTIONS_PARSE_ERROR if captions XML is invalid", async () => {
    mockedRequestUrl
      .mockResolvedValueOnce({
        status: 200,
        text: makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        status: 200,
        text: "<invalid>xml"
      });
    
    // Mock DOMParser to throw error when parsing invalid XML
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockImplementation(() => {
        throw new Error("XML parsing error");
      })
    }));
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "CAPTIONS_PARSE_ERROR"
      }));
  });

  it("throws CAPTIONS_PARSE_ERROR if captions XML has no text nodes", async () => {
    mockedRequestUrl
      .mockResolvedValueOnce({
        status: 200,
        text: makeVideoPageBody(validPlayerResponse)
      })
      .mockResolvedValueOnce({
        status: 200,
        text: "<transcript></transcript>"
      });
    
    // Mock DOMParser to return document with no text elements
    global.DOMParser = vi.fn().mockImplementation(() => ({
      parseFromString: vi.fn().mockReturnValue({
        getElementsByTagName: () => []
      })
    }));
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "CAPTIONS_PARSE_ERROR"
      }));
  });

  it("throws UNKNOWN for unexpected errors", async () => {
    // Mock extractYouTubeVideoId to throw an unexpected error
    (youtubeUtils.extractYouTubeVideoId as any).mockImplementationOnce(() => {
      throw new Error("Unexpected error");
    });
    
    await expect(fetchYouTubeTranscript("https://youtube.com/watch?v=dQw4w9WgXcQ"))
      .rejects
      .toThrow(expect.objectContaining({
        code: "UNKNOWN"
      }));
  });
});