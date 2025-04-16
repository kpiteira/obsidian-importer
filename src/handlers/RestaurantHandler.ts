// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/RestaurantHandler.ts
import { GenericContentHandler, GenericContentMetadata } from "./GenericContentHandler";
import { LLMOutput } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Restaurant-specific metadata structure
 */
export interface RestaurantMetadata extends GenericContentMetadata {
  restaurantName: string;
  cuisine?: string;
  location?: string;
  address?: string;
  phoneNumber?: string;
  hours?: string[];
  priceRange?: string;
  recommendations?: string[];
  rating?: string;
  review?: string;
}

/**
 * LLM output structure for restaurant content
 */
export interface RestaurantLLMOutput extends LLMOutput {
  restaurantName: string;
  cuisine?: string;
  location?: string;
  address?: string;
  phoneNumber?: string;
  hours?: string[];
  priceRange?: string;
  recommendations?: string[];
  rating?: string;
  review?: string;
}

/**
 * Handler for restaurant content
 */
export class RestaurantHandler extends GenericContentHandler {
  public readonly type = "restaurant";

  /**
   * Restaurant-specific prompt template
   */
  private static readonly RESTAURANT_PROMPT_TEMPLATE = `
You are a restaurant information extraction expert. Analyze the following content from a webpage and extract restaurant details in a structured format.

Content: {{content}}

Extract the following information:
1. Restaurant Name
2. Cuisine Type
3. Location (city/neighborhood)
4. Full Address
5. Phone Number
6. Operating Hours
7. Price Range
8. Recommended Dishes
9. Rating (if available)
10. Brief Review or Description

Format your response in proper JSON inside triple backticks:
\`\`\`json
{
  "restaurantName": "Full restaurant name",
  "cuisine": "Cuisine type",
  "location": "City, Neighborhood, etc.",
  "address": "Full street address",
  "phoneNumber": "Contact number",
  "hours": [
    "Monday: 9am-9pm",
    "Tuesday: 9am-9pm",
    ...
  ],
  "priceRange": "$ / $$ / $$$ / $$$$",
  "recommendations": [
    "dish 1",
    "dish 2",
    ...
  ],
  "rating": "X.X/5 or similar",
  "review": "Brief description or review of the restaurant"
}
\`\`\`

If any information is not available in the content, use "Not specified" for text fields or empty arrays for lists.
If this content does not appear to be a restaurant at all, respond with { "restaurantName": "Not a restaurant" }
`;

  /**
   * Generate the LLM prompt for restaurant information extraction
   */
  getPrompt(unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    if (!unifiedContent?.content) {
      logger.error("RestaurantHandler.getPrompt: No content provided");
      throw new Error("No content available for restaurant extraction");
    }
    
    return RestaurantHandler.RESTAURANT_PROMPT_TEMPLATE.replace("{{content}}", unifiedContent.content);
  }

  /**
   * Parse the LLM response into a structured restaurant object
   */
  parseLLMResponse(markdown: string): RestaurantLLMOutput {
    const logger = getLogger();
    logger.debugLog("Parsing LLM response for restaurant information");
    
    try {
      // Extract JSON from markdown response
      const jsonMatch = markdown.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        markdown.match(/({[\s\S]*?"restaurantName"[\s\S]*?})/);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Could not extract JSON from LLM response");
      }
      
      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      // Return the structured restaurant data
      return {
        restaurantName: parsedResponse.restaurantName || "Untitled Restaurant",
        cuisine: parsedResponse.cuisine,
        location: parsedResponse.location,
        address: parsedResponse.address,
        phoneNumber: parsedResponse.phoneNumber,
        hours: Array.isArray(parsedResponse.hours) ? parsedResponse.hours : [],
        priceRange: parsedResponse.priceRange,
        recommendations: Array.isArray(parsedResponse.recommendations) ? parsedResponse.recommendations : [],
        rating: parsedResponse.rating,
        review: parsedResponse.review
      };
    } catch (error) {
      logger.error(`Error parsing restaurant LLM response: ${error}`);
      throw new Error(`Failed to parse restaurant data: ${error}`);
    }
  }

  /**
   * Validate the LLM output for restaurant content
   */
  validateLLMOutput(output: LLMOutput): boolean {
    const restaurant = output as RestaurantLLMOutput;
    const logger = getLogger();
    
    // Check if this isn't a restaurant at all
    if (restaurant.restaurantName === "Not a restaurant") {
      throw new Error("Content is not a restaurant");
    }
    
    // Basic validation
    if (!restaurant.restaurantName || restaurant.restaurantName.trim() === "") {
      logger.warn("Restaurant missing name, using placeholder");
      restaurant.restaurantName = "Untitled Restaurant";
    }
    
    // Make sure arrays are initialized
    if (!Array.isArray(restaurant.hours)) {
      logger.warn("Restaurant hours not in array format, initializing empty array");
      restaurant.hours = [];
    }
    
    if (!Array.isArray(restaurant.recommendations)) {
      logger.warn("Restaurant recommendations not in array format, initializing empty array");
      restaurant.recommendations = [];
    }
    
    return true;
  }

  /**
   * Generate the final note content for the restaurant
   */
  getNoteContent(markdown: string, unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    try {
      const restaurant = this.parseLLMResponse(markdown);
      this.validateLLMOutput(restaurant);
      
      // Clean formatting characters that could interfere with Markdown rendering
      const cleanField = (field: string | undefined): string => {
        if (!field || field === "Not specified") return "";
        // Remove any markdown formatting characters that could cause issues
        return field.replace(/[`*_]/g, "");
      };
      
      // Build the note content
      const noteContent = [
        `# ${restaurant.restaurantName}`,
        '',
        `🔗 [Source](${unifiedContent.url})`,
        ''
      ];
      
      // Add image if available
      if (unifiedContent.imageUrl) {
        noteContent.push(`![Image](${unifiedContent.imageUrl})`);
        noteContent.push('');
      }
      
      // Add cuisine and location if available
      const infoLines = [];
      if (restaurant.cuisine && restaurant.cuisine !== "Not specified") {
        infoLines.push(`**Cuisine**: ${cleanField(restaurant.cuisine)}`);
      }
      if (restaurant.location && restaurant.location !== "Not specified") {
        infoLines.push(`**Location**: ${cleanField(restaurant.location)}`);
      }
      if (restaurant.priceRange && restaurant.priceRange !== "Not specified") {
        // Escape dollar signs in price range to prevent Obsidian interpreting them as math blocks
        const escapedPriceRange = cleanField(restaurant.priceRange).replace(/\$/g, '\\$');
        infoLines.push(`**Price Range**: ${escapedPriceRange}`);
      }
      if (restaurant.rating && restaurant.rating !== "Not specified") {
        infoLines.push(`**Rating**: ${cleanField(restaurant.rating)}`);
      }
      
      if (infoLines.length > 0) {
        noteContent.push(infoLines.join(' | '));
        noteContent.push('');
      }
      
      // Add review/description if available
      if (restaurant.review && restaurant.review !== "Not specified") {
        noteContent.push('## Description');
        noteContent.push(restaurant.review);
        noteContent.push('');
      }
      
      // Add recommendations if available
      if (restaurant.recommendations && restaurant.recommendations.length > 0) {
        noteContent.push('## Recommended Dishes');
        restaurant.recommendations.forEach(dish => {
          noteContent.push(`- ${cleanField(dish)}`);
        });
        noteContent.push('');
      }
      
      // Add contact information
      noteContent.push('## Contact Information');
      if (restaurant.address && restaurant.address !== "Not specified") {
        noteContent.push(`**Address**: ${cleanField(restaurant.address)}`);
      }
      if (restaurant.phoneNumber && restaurant.phoneNumber !== "Not specified") {
        noteContent.push(`**Phone**: ${cleanField(restaurant.phoneNumber)}`);
      }
      noteContent.push('');
      
      // Add hours if available
      if (restaurant.hours && restaurant.hours.length > 0) {
        noteContent.push('## Hours');
        restaurant.hours.forEach(hour => {
          noteContent.push(`- ${cleanField(hour)}`);
        });
        noteContent.push('');
      }
      
      return noteContent.join('\n');
    } catch (error) {
      logger.error(`Error generating restaurant note content: ${error}`);
      throw new Error(`Failed to generate restaurant note: ${error}`);
    }
  }

  /**
   * Get the folder name for storing restaurant notes
   */
  getFolderName(): string {
    return "Restaurants";
  }
}