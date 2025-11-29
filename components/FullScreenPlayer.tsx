
import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';
import { XMarkIcon, PlayIcon, PauseIcon, BackwardIcon, ForwardIcon } from '@heroicons/react/24/solid';

interface Props {
  scenes: Scene[];
  onClose: () => void;
}

const FullScreenPlayer: React.FC<Props> = ({ scenes, onClose }) => {
  // Filter only scenes with videos
  const playableScenes = scenes.filter(s => s.videoUrl && s.status === 'completed');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Reset time when scene changes
    setCurrentTime(0);
    if (videoRef.current && playableScenes[currentIndex]) {
      videoRef.current.src = playableScenes[currentIndex].videoUrl!;
      videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
      setIsPlaying(true);
    }
  }, [currentIndex, playableScenes]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleEnded = () => {
    if (currentIndex < playableScenes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < playableScenes.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (playableScenes.length === 0) return null;

  const currentScene = playableScenes[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-50 transition-colors"
      >
        <XMarkIcon className="w-8 h-8" />
      </button>

      {/* Video Container */}
      <div className="relative h-full w-full max-w-[56.25vh] aspect-[9/16] bg-gray-900 shadow-2xl overflow-hidden group">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          onEnded={handleEnded}
          onClick={() => togglePlay()}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
        />

        {/* Bottom Info & Slider Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-20 flex flex-col justify-end pointer-events-none">
           
           {/* Slider (Interactive, visible on hover) */}
           <div className="mb-4 flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] font-mono text-white/70 w-8 text-right shadow-black drop-shadow-md">
                  {Math.floor(currentTime)}s
              </span>
              <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  step="0.01"
                  value={currentTime} 
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-1.5 transition-all focus:outline-none"
              />
              <span className="text-[10px] font-mono text-white/70 w-8 shadow-black drop-shadow-md">
                  {Math.floor(duration)}s
              </span>
           </div>

           {/* Dialogue Text (Always visible) */}
           <div className="mb-2">
             <p className="text-white/90 font-medium text-lg leading-snug shadow-black drop-shadow-md">
               {currentScene.dialogue}
             </p>
           </div>
           
           {/* Scene Info */}
           <div className="flex justify-between items-end text-xs text-white/50 font-mono">
             <span>Scene {currentScene.scene_number}</span>
             <span>{currentIndex + 1} / {playableScenes.length}</span>
           </div>
        </div>

        {/* Central Controls (Visible on hover or pause) */}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-300 pointer-events-none ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
            <div className="flex items-center space-x-8 pointer-events-auto" onClick={e => e.stopPropagation()}>
                <button onClick={prev} className="p-4 hover:bg-white/10 rounded-full text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors" disabled={currentIndex === 0}>
                    <BackwardIcon className="w-8 h-8" />
                </button>
                <button onClick={(e) => togglePlay(e)} className="p-6 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 text-white transition-transform transform hover:scale-105">
                    {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10" />}
                </button>
                <button onClick={next} className="p-4 hover:bg-white/10 rounded-full text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors" disabled={currentIndex === playableScenes.length - 1}>
                    <ForwardIcon className="w-8 h-8" />
                </button>
            </div>
        </div>

        {/* Top Progress Bar (Scene Segments) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 flex z-10 pointer-events-none">
            {playableScenes.map((_, idx) => (
                <div key={idx} className="flex-1 h-full border-r border-black/50 bg-gray-700">
                    <div className={`h-full bg-purple-500 transition-all duration-300 ${idx < currentIndex ? 'w-full' : idx === currentIndex ? 'animate-pulse w-full' : 'w-0'}`} />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FullScreenPlayer;
