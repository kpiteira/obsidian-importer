## High Level Description
The goal of Obsidian Importer is to be able to import content from the internet, automatically detect its type, and download the relevant content, process it, most likely through an LLM, and then create an Obsidian node in the right place with that content.
Examples can be a YouTube video, a recipe, a restaurant page, a book, multiple things like that. And depending on the type, I will want a different type of template for the note. For example, the YouTube video, in that case, we should analyze the transcript and extract the key points of the transcript, extract the key concepts and create links to those key concepts. Just in case I already have a page like that in my Obsidian, for example, or create new links to new notes. I would like to have the author, so the channel, identify things like that. So I'll define these templates. A recipe should have sections like ingredients and then the steps and things like that automatically formatted in my Obsidian. So really the goal is to load the content, analyze it, understand what type it is, and depending on the type, some processing to create an appropriate note, and then move it to the right place in the vault.
## Content Type
In terms of content type, I currently have:
- books, 
- images, 
- Medium articles, 
- Movies, 
- YouTube videos, 
- Recipes, and 
- Restaurants. 
## Templates
### YouTube Videos
I really like the template currently used by the note [[12 Logging BEST Practices in 12 minutes]] for example.
### Books
For books, the template should include the title, the author with links, so for the title I'd like a link to the Goodreads, and for the author probably a link to the author's Goodreads page, probably a summary of what the book is about, the key themes approached, the key highlights, and potentially create links on the key concepts discussed in the book, again, that will allow us to have some potentially new notes that I may want to explore further knowledge.
### Images
Currently, my images folder only contains the raw images. I don't believe I have any metadata. So we might want to think about just copying the raw image, so downloading it and putting it in the sources/image folder, and potentially have a note with some metadata about the image. I'm not sure about that yet.
### Medium Articles
For Medium articles, definitely a summary of the article, the key highlights, the key topics, and the key concepts, again with the same idea of creating links to those concepts in Obsidian.
### Movies
In movies, what I'm mostly interested in is some information about the movie, like main actors, for example, summary of the movie, but also some tags that identify whether I liked it or not, if I've seen it or not, things like that.
### Recipes
In recipes, I basically want a copy of the recipe in my vault, but I want it formatted in a certain way, like very consistently. So I want the title of the recipe, a link to where it was found, then a section with the ingredients. Also, making sure that we specify for how many servings this list of ingredients is. And then below all the steps to accomplish the recipe. If the recipe has pictures, especially for the steps, then I'm interested in having those pictures as well with the steps. And maybe some brief description of the meal. If there's a long description, for example, of the recipe and the meal itself, have just a summary. If it's just a short description, maybe a copy of it. But I don't want something too long, like just a brief summary. And that's why the link is there is like if we want to go back to the original, we can always do that.
### Restaurants
For restaurants, of course, like for the rest, we'll have the link to the restaurant, a brief description based on the webpage of the restaurant. If we can find some ratings, it would be great to have the ratings. I also would like to have a kind of a personal note section and the address, so where the restaurant is. And whether it offers booking.

## How this works
So, as we can see from all the templates given above, the common denominator is given a URL, we download content, we analyze what type of link this is, and then depending on that, we perform different actions in order to fill in the template.
Most of these also mention that we want to create links to new nodes, or existing nodes by the way, in order to fully benefit from the power of Obsidian. That's an important idea where I want the LLM that will analyze the content downloaded to extract those key concepts that it can then connect to nodes and ideas present or not in my vault.
