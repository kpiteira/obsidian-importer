// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/MovieHandler.ts
import { GenericContentHandler, GenericContentMetadata } from "./GenericContentHandler";
import { LLMOutput } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Movie-specific metadata structure
 */
export interface MovieMetadata extends GenericContentMetadata {
  movieTitle: string;
  director?: string;
  year?: string;
  genre?: string[];
  cast?: string[];
  duration?: string;
  rating?: string;
  plot?: string;
  reviews?: string[];
}

/**
 * LLM output structure for movie content
 */
export interface MovieLLMOutput extends LLMOutput {
  movieTitle: string;
  director?: string;
  year?: string;
  genre?: string[];
  cast?: string[];
  duration?: string;
  rating?: string;
  plot?: string;
  reviews?: string[];
}

/**
 * Handler for movie content
 */
export class MovieHandler extends GenericContentHandler {
  public readonly type = "movie";

  /**
   * Movie-specific prompt template
   */
  private static readonly MOVIE_PROMPT_TEMPLATE = `
You are a movie information extraction expert. Analyze the following content from a webpage and extract movie details in a structured format.

Content: {{content}}

Extract the following information:
1. Movie Title
2. Director
3. Release Year
4. Genre(s)
5. Cast (main actors/actresses)
6. Duration (runtime)
7. Rating (IMDB, Rotten Tomatoes, etc.)
8. Plot Summary
9. Notable Reviews or Quotes

Format your response in proper JSON inside triple backticks:
\`\`\`json
{
  "movieTitle": "Full movie title",
  "director": "Director name",
  "year": "Release year",
  "genre": ["Genre 1", "Genre 2", ...],
  "cast": ["Actor 1", "Actor 2", ...],
  "duration": "Runtime in minutes or hours",
  "rating": "Rating score",
  "plot": "Brief plot summary",
  "reviews": ["Review quote 1", "Review quote 2", ...]
}
\`\`\`

If any information is not available in the content, use "Not specified" for text fields or empty arrays for lists.
If this content does not appear to be a movie at all, respond with { "movieTitle": "Not a movie" }
`;

  /**
   * Generate the LLM prompt for movie information extraction
   */
  getPrompt(unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    if (!unifiedContent?.content) {
      logger.error("MovieHandler.getPrompt: No content provided");
      throw new Error("No content available for movie extraction");
    }
    
    return MovieHandler.MOVIE_PROMPT_TEMPLATE.replace("{{content}}", unifiedContent.content);
  }

  /**
   * Parse the LLM response into a structured movie object
   */
  parseLLMResponse(markdown: string): MovieLLMOutput {
    const logger = getLogger();
    logger.debugLog("Parsing LLM response for movie information");
    
    try {
      // Extract JSON from markdown response
      const jsonMatch = markdown.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        markdown.match(/({[\s\S]*?"movieTitle"[\s\S]*?})/);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Could not extract JSON from LLM response");
      }
      
      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      // Return the structured movie data
      return {
        movieTitle: parsedResponse.movieTitle || "Untitled Movie",
        director: parsedResponse.director,
        year: parsedResponse.year,
        genre: Array.isArray(parsedResponse.genre) ? parsedResponse.genre : [],
        cast: Array.isArray(parsedResponse.cast) ? parsedResponse.cast : [],
        duration: parsedResponse.duration,
        rating: parsedResponse.rating,
        plot: parsedResponse.plot,
        reviews: Array.isArray(parsedResponse.reviews) ? parsedResponse.reviews : []
      };
    } catch (error) {
      logger.error(`Error parsing movie LLM response: ${error}`);
      throw new Error(`Failed to parse movie data: ${error}`);
    }
  }

  /**
   * Validate the LLM output for movie content
   */
  validateLLMOutput(output: LLMOutput): boolean {
    const movie = output as MovieLLMOutput;
    const logger = getLogger();
    
    // Check if this isn't a movie at all
    if (movie.movieTitle === "Not a movie") {
      throw new Error("Content is not a movie");
    }
    
    // Basic validation
    if (!movie.movieTitle || movie.movieTitle.trim() === "") {
      logger.warn("Movie missing title, using placeholder");
      movie.movieTitle = "Untitled Movie";
    }
    
    // Make sure arrays are initialized
    if (!Array.isArray(movie.genre)) {
      logger.warn("Movie genre not in array format, initializing empty array");
      movie.genre = [];
    }
    
    if (!Array.isArray(movie.cast)) {
      logger.warn("Movie cast not in array format, initializing empty array");
      movie.cast = [];
    }
    
    if (!Array.isArray(movie.reviews)) {
      logger.warn("Movie reviews not in array format, initializing empty array");
      movie.reviews = [];
    }
    
    return true;
  }

  /**
   * Generate the final note content for the movie
   */
  getNoteContent(markdown: string, unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    try {
      const movie = this.parseLLMResponse(markdown);
      this.validateLLMOutput(movie);
      
      // Build the note content
      const noteContent = [
        `# ${movie.movieTitle}`,
        '',
        `🔗 [Source](${unifiedContent.url})`,
        ''
      ];
      
      // Add image if available
      if (unifiedContent.imageUrl) {
        noteContent.push(`![Image](${unifiedContent.imageUrl})`);
        noteContent.push('');
      }
      
      // Add meta information
      const metaInfo = [];
      if (movie.year && movie.year !== "Not specified") {
        metaInfo.push(`**Year**: ${movie.year}`);
      }
      if (movie.duration && movie.duration !== "Not specified") {
        metaInfo.push(`**Duration**: ${movie.duration}`);
      }
      if (movie.rating && movie.rating !== "Not specified") {
        metaInfo.push(`**Rating**: ${movie.rating}`);
      }
      
      if (metaInfo.length > 0) {
        noteContent.push(metaInfo.join(' | '));
        noteContent.push('');
      }
      
      // Add director if available
      if (movie.director && movie.director !== "Not specified") {
        noteContent.push(`**Director**: ${movie.director}`);
        noteContent.push('');
      }
      
      // Add genre if available
      if (movie.genre && movie.genre.length > 0) {
        noteContent.push('## Genre');
        movie.genre.forEach(g => {
          noteContent.push(`- ${g}`);
        });
        noteContent.push('');
      }
      
      // Add cast if available
      if (movie.cast && movie.cast.length > 0) {
        noteContent.push('## Cast');
        movie.cast.forEach(actor => {
          noteContent.push(`- ${actor}`);
        });
        noteContent.push('');
      }
      
      // Add plot if available
      if (movie.plot && movie.plot !== "Not specified") {
        noteContent.push('## Plot');
        noteContent.push(movie.plot);
        noteContent.push('');
      }
      
      // Add reviews if available
      if (movie.reviews && movie.reviews.length > 0) {
        noteContent.push('## Reviews');
        movie.reviews.forEach((review, index) => {
          noteContent.push(`> ${review}`);
          if (index < movie.reviews!.length - 1) {
            noteContent.push('');
          }
        });
        noteContent.push('');
      }
      
      return noteContent.join('\n');
    } catch (error) {
      logger.error(`Error generating movie note content: ${error}`);
      throw new Error(`Failed to generate movie note: ${error}`);
    }
  }

  /**
   * Get the folder name for storing movie notes
   */
  getFolderName(): string {
    return "Movies";
  }
}