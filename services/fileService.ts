
import { Project, Scene } from '../types';
import { logger } from './logger';

export const saveProjectToFolder = async (project: Project) => {
  try {
    // 1. Ask user to pick a directory
    if (!('showDirectoryPicker' in window)) {
      throw new Error("Your browser does not support the File System Access API. Please use Chrome or Edge.");
    }

    // @ts-ignore - TS might not fully know showDirectoryPicker yet in all environments
    const dirHandle = await window.showDirectoryPicker();
    
    logger.info("Directory selected, starting export...");

    // 2. Save Project JSON
    const jsonHandle = await dirHandle.getFileHandle(`${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.json`, { create: true });
    const writableJson = await jsonHandle.createWritable();
    await writableJson.write(JSON.stringify(project, null, 2));
    await writableJson.close();
    logger.success("Project data saved.");

    // 3. Save Video Files
    let savedCount = 0;
    for (const scene of project.scenes) {
      if (scene.videoUrl && scene.status === 'completed') {
        try {
          const fileName = `scene_${scene.scene_number.toString().padStart(2, '0')}.mp4`;
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          
          // Fetch the blob data from the internal blob: URL
          const response = await fetch(scene.videoUrl);
          const blob = await response.blob();
          
          const writableVideo = await fileHandle.createWritable();
          await writableVideo.write(blob);
          await writableVideo.close();
          savedCount++;
          logger.info(`Saved ${fileName}`);
        } catch (err) {
          logger.error(`Failed to save video for scene ${scene.scene_number}`, err);
        }
      }
    }

    if (savedCount > 0) {
      logger.success(`Export complete! Saved ${savedCount} videos to folder.`);
      return true;
    } else {
      logger.warn("Export finished but no videos were ready to save.");
      return false;
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.info("Export cancelled by user.");
      return false;
    }
    logger.error("Export failed", error);
    throw error;
  }
};
