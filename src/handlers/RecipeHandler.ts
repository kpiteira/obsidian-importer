// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/RecipeHandler.ts
import { GenericContentHandler, GenericContentMetadata } from "./GenericContentHandler";
import { LLMOutput } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Recipe-specific metadata structure
 */
export interface RecipeMetadata extends GenericContentMetadata {
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  notes?: string;
}

/**
 * LLM output structure for recipe content
 */
export interface RecipeLLMOutput extends LLMOutput {
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  notes?: string;
}

/**
 * Handler for recipe content
 */
export class RecipeHandler extends GenericContentHandler {
  public readonly type = "recipe";

  /**
   * Recipe-specific prompt template
   */
  private static readonly RECIPE_PROMPT_TEMPLATE = `
You are a recipe extraction expert. Analyze the following content from a webpage and extract the recipe details in a structured format.

Content: {{content}}

Extract the following information:
1. Recipe Name
2. List of Ingredients (with measurements)
3. Step-by-step Instructions
4. Preparation Time
5. Cooking Time
6. Number of Servings
7. Any notes or tips

Format your response in proper JSON inside triple backticks:
\`\`\`json
{
  "recipeName": "Full recipe title",
  "ingredients": [
    "ingredient 1 with measurement",
    "ingredient 2 with measurement",
    ...
  ],
  "instructions": [
    "step 1",
    "step 2",
    ...
  ],
  "prepTime": "preparation time",
  "cookTime": "cooking time",
  "servings": "number of servings",
  "notes": "Any additional notes or tips"
}
\`\`\`

If any information is not available in the content, use "Not specified" for text fields or empty arrays for lists.
If this content does not appear to be a recipe at all, respond with { "recipeName": "Not a recipe" }
`;

  /**
   * Generate the LLM prompt for recipe extraction
   */
  getPrompt(unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    if (!unifiedContent?.content) {
      logger.error("RecipeHandler.getPrompt: No content provided");
      throw new Error("No content available for recipe extraction");
    }
    
    return RecipeHandler.RECIPE_PROMPT_TEMPLATE.replace("{{content}}", unifiedContent.content);
  }

  /**
   * Parse the LLM response into a structured recipe object
   */
  parseLLMResponse(markdown: string): RecipeLLMOutput {
    const logger = getLogger();
    logger.debugLog("Parsing LLM response for recipe extraction");
    
    try {
      // Extract JSON from markdown response
      const jsonMatch = markdown.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        markdown.match(/({[\s\S]*?"recipeName"[\s\S]*?})/);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Could not extract JSON from LLM response");
      }
      
      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      // Return the structured recipe data
      return {
        recipeName: parsedResponse.recipeName || "Untitled Recipe",
        ingredients: Array.isArray(parsedResponse.ingredients) ? parsedResponse.ingredients : [],
        instructions: Array.isArray(parsedResponse.instructions) ? parsedResponse.instructions : [],
        prepTime: parsedResponse.prepTime,
        cookTime: parsedResponse.cookTime,
        servings: parsedResponse.servings,
        notes: parsedResponse.notes
      };
    } catch (error) {
      logger.error(`Error parsing recipe LLM response: ${error}`);
      throw new Error(`Failed to parse recipe data: ${error}`);
    }
  }

  /**
   * Validate the LLM output for recipe content
   */
  validateLLMOutput(output: LLMOutput): boolean {
    const recipe = output as RecipeLLMOutput;
    const logger = getLogger();
    
    // Check if this isn't a recipe at all
    if (recipe.recipeName === "Not a recipe") {
      throw new Error("Content is not a recipe");
    }
    
    // Basic validation
    if (!recipe.recipeName || recipe.recipeName.trim() === "") {
      logger.warn("Recipe missing name, using placeholder");
      recipe.recipeName = "Untitled Recipe";
    }
    
    // Make sure arrays are initialized
    if (!Array.isArray(recipe.ingredients)) {
      logger.warn("Recipe ingredients not in array format, initializing empty array");
      recipe.ingredients = [];
    }
    
    if (!Array.isArray(recipe.instructions)) {
      logger.warn("Recipe instructions not in array format, initializing empty array");
      recipe.instructions = [];
    }
    
    // Must have either ingredients or instructions to be valid
    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
      throw new Error("Invalid recipe: missing both ingredients and instructions");
    }
    
    return true;
  }

  /**
   * Generate the final note content for the recipe
   */
  getNoteContent(markdown: string, unifiedContent: GenericContentMetadata): string {
    const logger = getLogger();
    
    try {
      const recipe = this.parseLLMResponse(markdown);
      this.validateLLMOutput(recipe);
      
      // Use the template format defined in the spec
      const noteContent = [
        `# ${recipe.recipeName}`,
        '',
        `🔗 [Source](${unifiedContent.url})`,
        ''
      ];
      
      // Add image if available
      if (unifiedContent.imageUrl) {
        noteContent.push(`![Image](${unifiedContent.imageUrl})`);
        noteContent.push('');
      }
      
      // Add ingredients
      noteContent.push('## Ingredients');
      recipe.ingredients.forEach(ingredient => {
        noteContent.push(`- ${ingredient}`);
      });
      noteContent.push('');
      
      // Add instructions
      noteContent.push('## Instructions');
      recipe.instructions.forEach((step, index) => {
        noteContent.push(`${index + 1}. ${step}`);
      });
      noteContent.push('');
      
      // Add notes if available
      if (recipe.notes && recipe.notes !== "Not specified") {
        noteContent.push('## Notes');
        noteContent.push(recipe.notes);
        noteContent.push('');
      }
      
      // Add metadata
      noteContent.push('## Metadata');
      if (recipe.servings && recipe.servings !== "Not specified") {
        noteContent.push(`- Servings: ${recipe.servings}`);
      }
      if (recipe.prepTime && recipe.prepTime !== "Not specified") {
        noteContent.push(`- Prep Time: ${recipe.prepTime}`);
      }
      if (recipe.cookTime && recipe.cookTime !== "Not specified") {
        noteContent.push(`- Cook Time: ${recipe.cookTime}`);
      }
      
      return noteContent.join('\n');
    } catch (error) {
      logger.error(`Error generating recipe note content: ${error}`);
      throw new Error(`Failed to generate recipe note: ${error}`);
    }
  }

  /**
   * Get the folder name for storing recipe notes
   */
  getFolderName(): string {
    return "Recipes";
  }
}