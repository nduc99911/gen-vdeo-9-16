
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Scene, Character } from "../types";
import { logger } from "./logger";

// Helper to get client
const getClient = () => {
  // Prioritize local storage key (manual entry), fallback to env (system injection)
  const localKey = localStorage.getItem("gemini_api_key");
  const apiKey = localKey || process.env.API_KEY;

  if (!apiKey) {
    logger.error("API Key missing");
    throw new Error("API Key not found. Please enter your API Key in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateScript = async (topic: string): Promise<Scene[]> => {
  logger.info("Starting script generation", { topic });
  const ai = getClient();
  
  const characterSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      pose: { type: Type.STRING },
      expression: { type: Type.STRING },
      actions: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["name", "pose", "expression", "actions"],
  };

  const sceneSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      scene_number: { type: Type.INTEGER },
      duration_seconds: { type: Type.INTEGER },
      description: { type: Type.STRING },
      character: characterSchema,
      background: { type: Type.STRING },
      audio: { type: Type.STRING },
      dialogue: { type: Type.STRING },
    },
    required: ["scene_number", "duration_seconds", "description", "character", "background", "audio", "dialogue"],
  };

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: sceneSchema,
  };

  const prompt = `
    Create a detailed video script for a short vertical animated video (9:16 format) about: "${topic}".
    Break it down into sequential scenes.
    Ensure the character remains consistent in name and general vibe.
    Each scene should be approx 5-10 seconds.
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert storyboard artist and director for vertical short-form video content.",
      },
    });

    if (!response.text) {
      logger.error("Empty response from AI for script");
      throw new Error("No script generated");
    }
    
    logger.success("Script generated successfully");
    const rawScenes = JSON.parse(response.text) as Omit<Scene, 'status'>[];
    
    // Hydrate with local app state
    return rawScenes.map(s => ({
      ...s,
      status: 'draft',
      idleDescription: "Standing comfortably, breathing softly, looking around.", // Default idle
    }));
  } catch (err: any) {
    logger.error("Script generation failed", err);
    throw err;
  }
};

// Generic Image Generator using Flash-Image
const generateImage = async (prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
  const ai = getClient();
  // gemini-2.5-flash-image is good for general tasks and speed
  const model = 'gemini-2.5-flash-image';

  logger.info("Generating image...", { prompt, aspectRatio });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        // @ts-ignore - SDK types might not fully reflect imageConfig yet
        imageConfig: {
             aspectRatio: aspectRatio, 
        }
      }
    });

    // Extract image from response parts
    let imageUrl = null;
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64String = part.inlineData.data;
                imageUrl = `data:${part.inlineData.mimeType};base64,${base64String}`;
                break;
            }
        }
    }

    if (!imageUrl) {
        throw new Error("No image data returned in response. The model might have returned text only.");
    }
    
    return imageUrl;
  } catch (err: any) {
      logger.error("Image generation failed", err);
      throw err;
  }
};

export const generateCharacterPreview = async (description: string): Promise<string> => {
    const prompt = `Character design reference sheet, high quality 3D render style. Character: ${description}. Neutral lighting, simple background.`;
    return generateImage(prompt, "1:1");
};

export const generateScenePreview = async (scene: Scene, charDesc: string): Promise<string> => {
    const prompt = `Storyboard frame for animated movie, 9:16 vertical.
    Scene Description: ${scene.description}
    Character: ${charDesc}. 
    Action: ${scene.character.actions.join(', ')}. 
    Pose: ${scene.character.pose}. Expression: ${scene.character.expression}.
    Background: ${scene.background}.
    Style: High quality 3D render, vibrant, cinematic lighting.`;
    
    return generateImage(prompt, "9:16");
};

export const generateSceneVideo = async (
  scene: Scene, 
  globalCharacterDesc: string
): Promise<string> => {
  const ai = getClient();
  // Using fast preview for responsiveness
  const model = 'veo-3.1-fast-generate-preview';

  // Construct a rich prompt ensuring consistency and aspect ratio
  const prompt = `
    Cinematic vertical animated video (9:16 aspect ratio).
    CHARACTER APPEARANCE: ${globalCharacterDesc}
    SCENE ACTION: ${scene.description}
    CHARACTER ACTION: The character (${scene.character.name}) is ${scene.character.actions.join(' and ')} with a ${scene.character.expression} expression. Pose: ${scene.character.pose}.
    BACKGROUND: ${scene.background}.
    ATMOSPHERE: High quality, 3d render style, vivid colors.
  `;

  logger.info(`Starting video generation for Scene ${scene.scene_number}`, { prompt });

  try {
    let operation = await ai.models.generateVideos({
      model: model,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: '9:16',
        resolution: '720p', 
      }
    });

    logger.info(`Operation started for Scene ${scene.scene_number}`, { operationName: operation.name });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      // logger.info(`Polling status for Scene ${scene.scene_number}...`);
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Check for explicit API errors
    if (operation.error) {
        logger.error(`Generation error for Scene ${scene.scene_number}`, operation.error);
        throw new Error(`Veo API Error: ${operation.error.message || JSON.stringify(operation.error)}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
        logger.error(`No video URI found for Scene ${scene.scene_number}`, { 
            fullResponse: operation 
        });
        throw new Error("Video generation completed but returned no video URI. The prompt might have triggered safety filters.");
    }

    logger.success(`Video generated for Scene ${scene.scene_number}, downloading...`);

    // Fetch the actual MP4 bytes using the key and convert to blob for playback
    const localKey = localStorage.getItem("gemini_api_key");
    const apiKey = localKey || process.env.API_KEY;
    const fetchUrl = `${videoUri}&key=${apiKey}`;
    
    const response = await fetch(fetchUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    logger.success(`Video ready for playback: Scene ${scene.scene_number}`);
    return blobUrl;

  } catch (error: any) {
    logger.error(`Error processing Scene ${scene.scene_number}`, error);
    throw error;
  }
};

export const generateIdleVideo = async (
  scene: Scene,
  globalCharacterDesc: string
): Promise<string> => {
  const ai = getClient();
  const model = 'veo-3.1-fast-generate-preview';

  const idlePrompt = `
    Cinematic vertical video (9:16). SEAMLESS LOOPING IDLE ANIMATION.
    CHARACTER: ${globalCharacterDesc}. Name: ${scene.character.name}.
    ACTION: IDLE LOOP. ${scene.idleDescription || "Standing comfortably, breathing softly, subtle movements"}.
    EXPRESSION: ${scene.character.expression}.
    BACKGROUND: ${scene.background}.
    STYLE: High quality 3D render, stable camera, no cuts.
  `;

  logger.info(`Starting Idle Animation for Scene ${scene.scene_number}`, { idlePrompt });

  try {
    let operation = await ai.models.generateVideos({
      model: model,
      prompt: idlePrompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: '9:16',
        resolution: '720p',
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error(`Veo API Error: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No idle video URI returned.");
    }

    const localKey = localStorage.getItem("gemini_api_key");
    const apiKey = localKey || process.env.API_KEY;
    const fetchUrl = `${videoUri}&key=${apiKey}`;
    
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error("Failed to fetch idle video");
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    logger.error(`Error generating idle for Scene ${scene.scene_number}`, error);
    throw error;
  }
};
