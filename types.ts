
export interface Character {
  name: string;
  pose: string;
  expression: string;
  actions: string[];
}

export interface Scene {
  scene_number: number;
  duration_seconds: number;
  description: string;
  character: Character;
  background: string;
  audio: string;
  dialogue: string;
  status: 'draft' | 'pending' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  previewImageUrl?: string; // New: Static storyboard image
  errorMsg?: string;
  // Idle Animation Fields
  idleDescription?: string;
  idleVideoUrl?: string;
  idleStatus?: 'draft' | 'generating' | 'completed' | 'error';
}

export interface Project {
  id: string;
  name: string;
  topic: string;
  characterDescription: string;
  characterImageUrl?: string; // New: Character reference image
  scenes: Scene[];
  createdAt: number;
}

export type AppState = 'dashboard' | 'scripting' | 'editing' | 'generating' | 'preview';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}
