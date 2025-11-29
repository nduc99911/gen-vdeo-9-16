import React from 'react';
import { Scene } from '../types';

interface Props {
  scenes: Scene[];
  activeSceneIndex: number;
  onSceneSelect: (index: number) => void;
}

const Timeline: React.FC<Props> = ({ scenes, activeSceneIndex, onSceneSelect }) => {
  return (
    <div className="w-full overflow-x-auto bg-gray-900 border-t border-gray-700 p-4 sticky bottom-0 z-20">
      <div className="flex space-x-4 min-w-max">
        {scenes.map((scene, index) => (
          <div
            key={index}
            onClick={() => onSceneSelect(index)}
            className={`cursor-pointer relative flex-shrink-0 w-32 h-24 rounded-lg border-2 transition-all duration-200 overflow-hidden group ${
              index === activeSceneIndex
                ? 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            {/* Status Indicator */}
            <div className={`absolute top-1 right-1 w-3 h-3 rounded-full z-10 ${
                scene.status === 'completed' ? 'bg-green-500' :
                scene.status === 'generating' ? 'bg-yellow-500 animate-pulse' :
                scene.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />

            <div className="absolute bottom-1 left-2 text-xs font-mono font-bold text-white z-10 drop-shadow-md">
              Scene {scene.scene_number}
            </div>
            
            {scene.videoUrl ? (
              <video 
                src={scene.videoUrl} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100" 
                muted
                playsInline
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-2xl text-gray-600">🎬</span>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-1 right-2 text-[10px] text-gray-300 font-mono z-10">
              {scene.duration_seconds}s
            </div>
          </div>
        ))}
        {/* Add new scene placeholder if needed */}
        <div className="w-32 h-24 border border-dashed border-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-sm hover:text-gray-300 hover:border-gray-500 cursor-not-allowed" title="Add Scene (Coming Soon)">
          + Add Scene
        </div>
      </div>
    </div>
  );
};

export default Timeline;