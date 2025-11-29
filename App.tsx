
import React, { useState, useEffect, useRef } from 'react';
import { Project, Scene, AppState } from './types';
import * as GeminiService from './services/geminiService';
import * as FileService from './services/fileService';
import Timeline from './components/Timeline';
import LogPanel from './components/LogPanel';
import FullScreenPlayer from './components/FullScreenPlayer';
import SettingsModal from './components/SettingsModal';
import { logger } from './services/logger';
import { 
  PlayIcon, 
  PauseIcon, 
  FilmIcon, 
  PencilIcon, 
  ArrowPathIcon, 
  VideoCameraIcon,
  ArrowDownTrayIcon,
  FolderArrowDownIcon,
  PlayCircleIcon,
  Cog6ToothIcon,
  PhotoIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/solid';

// Define reusable styles as constants to ensure Tailwind picks them up correctly
const inputClass = "w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 transition-all shadow-sm";
const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('dashboard');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Script Gen Inputs
  const [topicInput, setTopicInput] = useState('');
  const [charDescInput, setCharDescInput] = useState('Cute 3D animated cat with blue fur');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  // Character Preview State
  const [isGeneratingCharPreview, setIsGeneratingCharPreview] = useState(false);
  const [charPreviewUrl, setCharPreviewUrl] = useState<string | null>(null);

  // Editing State
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFullMovie, setShowFullMovie] = useState(false);
  const [previewMode, setPreviewMode] = useState<'main' | 'idle'>('main');

  // UI State
  const [showLogs, setShowLogs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check for API key on mount, if missing, prompt settings
    const localKey = localStorage.getItem("gemini_api_key");
    const envKey = process.env.API_KEY;
    if (!localKey && !envKey) {
        setShowSettings(true);
        logger.info("No API Key detected, opening settings.");
    }
  }, []);

  // Handlers
  const handleStartProject = async () => {
    if (!topicInput.trim()) {
        logger.warn("Attempted to start project with empty topic");
        return;
    }
    setIsGeneratingScript(true);
    try {
      const scenes = await GeminiService.generateScript(topicInput);
      const newProject: Project = {
        id: Date.now().toString(),
        name: topicInput.substring(0, 30),
        topic: topicInput,
        characterDescription: charDescInput,
        characterImageUrl: charPreviewUrl || undefined,
        scenes,
        createdAt: Date.now(),
      };
      setCurrentProject(newProject);
      setAppState('editing');
      setActiveSceneIndex(0);
      logger.info("Project initialized", { sceneCount: scenes.length });
    } catch (error) {
      console.error(error);
      alert('Failed to generate script. Check your API Key in Settings.');
      setShowSettings(true);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateCharPreview = async () => {
    if (!charDescInput) return;
    setIsGeneratingCharPreview(true);
    try {
        const url = await GeminiService.generateCharacterPreview(charDescInput);
        setCharPreviewUrl(url);
        logger.success("Character preview generated");
    } catch (error) {
        alert("Failed to generate character preview. Check settings.");
    } finally {
        setIsGeneratingCharPreview(false);
    }
  };

  const handleUpdateScene = (index: number, updatedField: Partial<Scene>) => {
    if (!currentProject) return;
    const newScenes = [...currentProject.scenes];
    // If key content changes, potentially invalidate preview
    newScenes[index] = { ...newScenes[index], ...updatedField }; 
    setCurrentProject({ ...currentProject, scenes: newScenes });
  };

  const generateAllVideos = async () => {
    if (!currentProject) return;
    
    // Set all to pending first to lock UI or show status
    const scenesToProcess = currentProject.scenes.map((s, idx) => ({ ...s, index: idx })).filter(s => !s.videoUrl);
    
    if (scenesToProcess.length === 0) {
        logger.info("All scenes already generated");
        // If all done, offer to preview
        setAppState('preview');
        return;
    }

    logger.info(`Queueing generation for ${scenesToProcess.length} scenes`);

    const updatedScenes = [...currentProject.scenes];
    // Mark pending
    scenesToProcess.forEach(s => updatedScenes[s.index].status = 'pending');
    setCurrentProject({ ...currentProject, scenes: updatedScenes });

    // Process sequentially to avoid rate limits and handle state updates clearly
    for (const item of scenesToProcess) {
       // Update to generating
       updatedScenes[item.index].status = 'generating';
       setCurrentProject({ ...currentProject, scenes: [...updatedScenes] });

       try {
         const url = await GeminiService.generateSceneVideo(item, currentProject.characterDescription);
         updatedScenes[item.index].videoUrl = url;
         updatedScenes[item.index].status = 'completed';
       } catch (err) {
         console.error(`Error scene ${item.scene_number}`, err);
         updatedScenes[item.index].status = 'error';
         updatedScenes[item.index].errorMsg = "Failed to generate";
       }
       // Update state after each generation so user sees progress
       setCurrentProject({ ...currentProject, scenes: [...updatedScenes] });
    }
    setAppState('preview');
    logger.success("Batch generation complete");
  };

  const handleGenerateSingleScene = async (index: number) => {
      if (!currentProject) return;
      const updatedScenes = [...currentProject.scenes];
      updatedScenes[index].status = 'generating';
      setPreviewMode('main');
      setCurrentProject({ ...currentProject, scenes: updatedScenes });

      try {
        const url = await GeminiService.generateSceneVideo(updatedScenes[index], currentProject.characterDescription);
        updatedScenes[index].videoUrl = url;
        updatedScenes[index].status = 'completed';
      } catch (err) {
        updatedScenes[index].status = 'error';
        updatedScenes[index].errorMsg = "Generation failed";
      }
      setCurrentProject({ ...currentProject, scenes: updatedScenes });
  };

  const handleGenerateIdleScene = async (index: number) => {
    if (!currentProject) return;
    const updatedScenes = [...currentProject.scenes];
    updatedScenes[index].idleStatus = 'generating';
    setCurrentProject({ ...currentProject, scenes: updatedScenes });

    try {
        const url = await GeminiService.generateIdleVideo(updatedScenes[index], currentProject.characterDescription);
        updatedScenes[index].idleVideoUrl = url;
        updatedScenes[index].idleStatus = 'completed';
        setPreviewMode('idle'); // Auto switch to view result
        logger.success(`Idle animation generated for scene ${index + 1}`);
    } catch (err) {
        updatedScenes[index].idleStatus = 'error';
        logger.error(`Failed idle animation for scene ${index + 1}`);
    }
    setCurrentProject({ ...currentProject, scenes: updatedScenes });
  };

  const handleGenerateScenePreview = async (index: number) => {
    if (!currentProject) return;
    const updatedScenes = [...currentProject.scenes];
    // We don't change main status to generating, maybe add a localized loading state?
    // For now we just let the button spin
    try {
        logger.info(`Generating preview image for scene ${index + 1}`);
        const url = await GeminiService.generateScenePreview(updatedScenes[index], currentProject.characterDescription);
        updatedScenes[index].previewImageUrl = url;
        setCurrentProject({ ...currentProject, scenes: updatedScenes });
        logger.success("Scene preview image generated");
    } catch (err) {
        logger.error("Failed to generate scene preview image");
    }
  };

  const handleExportProject = async () => {
    if (!currentProject) return;
    await FileService.saveProjectToFolder(currentProject);
  };

  // Player Logic
  useEffect(() => {
    if (!currentProject) return;
    const scene = currentProject.scenes[activeSceneIndex];
    if (!scene) return;

    // Determine what to play based on viewMode
    let src = null;
    if (previewMode === 'main') src = scene.videoUrl;
    if (previewMode === 'idle') src = scene.idleVideoUrl;

    if (appState === 'preview' && src && videoRef.current) {
        videoRef.current.src = src;
        if (isPlaying) {
            videoRef.current.play().catch(e => logger.warn("Autoplay blocked", e));
        }
    }
  }, [activeSceneIndex, appState, currentProject, isPlaying, previewMode]);

  const handleVideoEnded = () => {
      if (!currentProject) return;
      // Loop idle video if in idle mode
      if (previewMode === 'idle' && videoRef.current) {
        videoRef.current.play();
        return;
      }

      if (activeSceneIndex < currentProject.scenes.length - 1) {
          setActiveSceneIndex(prev => prev + 1);
          setPreviewMode('main'); // Always default to main flow when advancing
          logger.info(`Auto-advancing to scene ${activeSceneIndex + 2}`);
      } else {
          setIsPlaying(false);
          setActiveSceneIndex(0); // Reset to start
          logger.info("Playback sequence finished");
      }
  };
  
  const activeScene = currentProject?.scenes[activeSceneIndex];

  // Reset view mode when changing scenes manually
  const onSceneSelect = (idx: number) => {
      setActiveSceneIndex(idx);
      setIsPlaying(false);
      setPreviewMode('main');
  };

  // Views

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/90 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setAppState('dashboard')}>
          <FilmIcon className="w-6 h-6 text-purple-500" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Veo3 Animator
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
            {currentProject && (
              <>
                <span className="text-sm text-gray-400 hidden md:block truncate max-w-[200px]">Project: {currentProject.name}</span>
                
                {/* Generate Button */}
                {appState === 'editing' && (
                    <button 
                        onClick={generateAllVideos}
                        disabled={currentProject.scenes.some(s => s.status === 'generating')}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg hover:from-green-500 hover:to-teal-500 disabled:opacity-50 text-sm font-bold shadow-lg transition-transform hover:scale-105"
                    >
                        <VideoCameraIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate Movie</span>
                    </button>
                )}

                 {/* Watch Full Movie Button (Only if there are completed scenes) */}
                 {currentProject.scenes.some(s => s.status === 'completed') && (
                    <button
                        onClick={() => setShowFullMovie(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 text-sm font-bold shadow-lg transition-transform hover:scale-105"
                    >
                        <PlayCircleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Watch Movie</span>
                    </button>
                 )}

                 {/* Export Button */}
                 <button
                    onClick={handleExportProject}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm font-bold transition-colors"
                    title="Save Project to Folder"
                 >
                    <FolderArrowDownIcon className="w-4 h-4 text-gray-300" />
                    <span className="hidden sm:inline">Export</span>
                 </button>

                 {appState === 'preview' && (
                    <button 
                        onClick={() => setAppState('editing')}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm font-bold"
                    >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                    </button>
                )}
              </>
            )}

            {/* Settings Button */}
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                title="Settings"
            >
                <Cog6ToothIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Dashboard View */}
        {appState === 'dashboard' && (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-xl w-full space-y-8 my-auto">
                <div className="text-center">
                    <h2 className="text-4xl font-extrabold text-white mb-4">Create Magic with Veo</h2>
                    <p className="text-gray-400">Generate storyboarded vertical videos from a simple text prompt.</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl space-y-6">
                    <div>
                        <label className={labelClass}>Video Topic / Idea</label>
                        <textarea 
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 text-sm shadow-sm"
                            placeholder="e.g., A cyberpunk detective chasing a robot through a neon city market..."
                            rows={3}
                        />
                    </div>

                    <div>
                         <label className={labelClass}>Main Character Appearance</label>
                         <div className="flex gap-4">
                             <div className="flex-1">
                                <textarea 
                                    value={charDescInput}
                                    onChange={(e) => setCharDescInput(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 h-24 text-sm shadow-sm"
                                    placeholder="e.g., A cute Shiba Inu wearing sunglasses"
                                />
                             </div>
                             
                             {/* Character Preview Box */}
                             <div className="w-24 flex flex-col space-y-2">
                                <div className="w-24 h-24 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative group">
                                    {charPreviewUrl ? (
                                        <img src={charPreviewUrl} alt="Character Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <EyeIcon className="w-8 h-8 text-gray-600" />
                                    )}
                                    {isGeneratingCharPreview && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <ArrowPathIcon className="w-6 h-6 text-purple-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleGenerateCharPreview}
                                    disabled={!charDescInput || isGeneratingCharPreview}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded w-full flex items-center justify-center"
                                >
                                    {charPreviewUrl ? 'Update' : 'Preview'}
                                </button>
                             </div>
                         </div>
                         <p className="text-xs text-gray-500 mt-1 ml-1">This description is applied to every scene generation.</p>
                    </div>

                    <button 
                        onClick={handleStartProject}
                        disabled={isGeneratingScript || !topicInput}
                        className="w-full py-4 bg-purple-600 rounded-xl font-bold text-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-white"
                    >
                        {isGeneratingScript ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                <span>Dreaming up Script...</span>
                            </>
                        ) : (
                            <span>Create Script</span>
                        )}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Editor & Preview View */}
        {(appState === 'editing' || appState === 'preview') && currentProject && activeScene && (
           <div className="flex-1 flex flex-col md:flex-row h-full">
                
                {/* Left Panel: Scene Details / Editor */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-900 border-r border-gray-800 pb-32">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Scene {activeScene.scene_number}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                activeScene.status === 'completed' ? 'bg-green-900 text-green-300' :
                                activeScene.status === 'generating' ? 'bg-yellow-900 text-yellow-300' :
                                activeScene.status === 'error' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
                            }`}>
                                {activeScene.status}
                            </span>
                        </div>

                        {/* Editable Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Description</label>
                                <textarea 
                                    value={activeScene.description}
                                    onChange={(e) => handleUpdateScene(activeSceneIndex, { description: e.target.value })}
                                    className={`${inputClass} h-24`}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Character Action</label>
                                    <input 
                                        type="text" 
                                        value={activeScene.character.actions.join(', ')}
                                        onChange={(e) => handleUpdateScene(activeSceneIndex, { 
                                            character: { ...activeScene.character, actions: e.target.value.split(', ') } 
                                        })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Expression</label>
                                    <input 
                                        type="text" 
                                        value={activeScene.character.expression}
                                        onChange={(e) => handleUpdateScene(activeSceneIndex, { 
                                            character: { ...activeScene.character, expression: e.target.value } 
                                        })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            
                            {/* Idle Animation Config */}
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <label className={`${labelClass} flex items-center gap-2 mb-3`}>
                                    <ClockIcon className="w-3 h-3 text-blue-400" />
                                    Idle Animation (Loop)
                                </label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Breathing softly, looking around..."
                                        value={activeScene.idleDescription || ''}
                                        onChange={(e) => handleUpdateScene(activeSceneIndex, { idleDescription: e.target.value })}
                                        className={`${inputClass} flex-1`}
                                    />
                                    <button 
                                        onClick={() => handleGenerateIdleScene(activeSceneIndex)}
                                        disabled={activeScene.idleStatus === 'generating'}
                                        className="px-4 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {activeScene.idleStatus === 'generating' ? '...' : 'Gen Idle'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Dialogue (Caption)</label>
                                <textarea 
                                    value={activeScene.dialogue}
                                    onChange={(e) => handleUpdateScene(activeSceneIndex, { dialogue: e.target.value })}
                                    className={`${inputClass} h-16`}
                                />
                            </div>

                             <div>
                                <label className={labelClass}>Background Setting</label>
                                <textarea 
                                    value={activeScene.background}
                                    onChange={(e) => handleUpdateScene(activeSceneIndex, { background: e.target.value })}
                                    className={`${inputClass} h-20 resize-none`}
                                    placeholder="Describe the environment, lighting, time of day..."
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 grid grid-cols-2 gap-4">
                            {/* Preview Image Button */}
                             <button
                                onClick={() => handleGenerateScenePreview(activeSceneIndex)}
                                className="py-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 font-bold flex items-center justify-center space-x-2 text-gray-200 transition-colors"
                             >
                                <PhotoIcon className="w-5 h-5" />
                                <span>{activeScene.previewImageUrl ? 'Update Preview' : 'Gen Preview Image'}</span>
                             </button>

                            {/* Generate Video Button */}
                            {!activeScene.videoUrl || activeScene.status === 'error' || activeScene.status === 'draft' ? (
                                <button 
                                    onClick={() => handleGenerateSingleScene(activeSceneIndex)}
                                    disabled={activeScene.status === 'generating'}
                                    className="py-3 bg-purple-600 rounded-lg hover:bg-purple-500 font-bold flex items-center justify-center space-x-2 disabled:opacity-50 text-white shadow-lg"
                                >
                                    {activeScene.status === 'generating' ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <VideoCameraIcon className="w-5 h-5" />}
                                    <span>{activeScene.status === 'generating' ? 'Rendering...' : 'Generate Clip'}</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleGenerateSingleScene(activeSceneIndex)}
                                    className="py-3 bg-gray-700 rounded-lg hover:bg-gray-600 font-bold flex items-center justify-center space-x-2 text-white"
                                >
                                    <ArrowPathIcon className="w-5 h-5" />
                                    <span>Regenerate Clip</span>
                                </button>
                            )}
                        </div>
                        
                        {activeScene.videoUrl && (
                            <div className="mt-2 text-center">
                                <a 
                                    href={activeScene.videoUrl} 
                                    download={`scene_${activeScene.scene_number}.mp4`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-purple-400 hover:text-purple-300 underline flex items-center justify-center gap-1"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download MP4
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="w-full md:w-[400px] bg-black flex flex-col items-center justify-center p-4 relative border-l border-gray-800">
                    
                    {/* View Mode Toggle (If Idle Exists) */}
                    {(activeScene.videoUrl || activeScene.idleVideoUrl) && (
                        <div className="absolute top-4 z-10 bg-gray-900/80 backdrop-blur rounded-full p-1 flex space-x-1 border border-gray-700">
                            <button
                                onClick={() => setPreviewMode('main')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    previewMode === 'main' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                                disabled={!activeScene.videoUrl}
                            >
                                Main Action
                            </button>
                            {activeScene.idleVideoUrl && (
                                <button
                                    onClick={() => setPreviewMode('idle')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                        previewMode === 'idle' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Idle Loop
                                </button>
                            )}
                        </div>
                    )}

                    <div className="relative aspect-[9/16] h-[80vh] max-h-[700px] bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 group">
                        
                        {/* Logic: 
                            1. If Preview Mode is Main and Main URL exists -> Show Main Video
                            2. If Preview Mode is Idle and Idle URL exists -> Show Idle Video
                            3. Else if Image Preview exists -> Show Image
                            4. Else -> Show Empty State
                        */}

                        {previewMode === 'main' && activeScene.videoUrl ? (
                            <>
                                <video 
                                    ref={videoRef}
                                    src={activeScene.videoUrl} 
                                    className="w-full h-full object-cover"
                                    onEnded={handleVideoEnded}
                                    controls={false}
                                    autoPlay={isPlaying}
                                    playsInline
                                />
                                <div className="absolute bottom-12 left-4 right-4 text-center">
                                    <p className="text-white text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/30 p-2 rounded backdrop-blur-sm">
                                        {activeScene.dialogue}
                                    </p>
                                </div>
                            </>
                        ) : previewMode === 'idle' && activeScene.idleVideoUrl ? (
                            <>
                                <video 
                                    ref={videoRef}
                                    src={activeScene.idleVideoUrl} 
                                    className="w-full h-full object-cover"
                                    // Idle loops indefinitely until manually stopped or switched
                                    loop
                                    autoPlay={true} 
                                    controls={false}
                                    playsInline
                                />
                                <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
                                    <span className="bg-blue-600/80 text-white px-2 py-1 rounded text-xs font-mono uppercase tracking-widest backdrop-blur">
                                        Idle Animation
                                    </span>
                                </div>
                            </>
                        ) : activeScene.previewImageUrl ? (
                            /* Static Preview Layer */
                            <>
                                <img 
                                    src={activeScene.previewImageUrl} 
                                    alt="Scene Preview" 
                                    className="w-full h-full object-cover opacity-90"
                                />
                                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-end pb-12">
                                     <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
                                         <p className="text-white text-xs font-mono uppercase tracking-widest">Image Preview</p>
                                     </div>
                                </div>
                                <div className="absolute bottom-24 left-4 right-4 text-center opacity-80">
                                    <p className="text-white text-lg font-bold drop-shadow-md bg-black/30 p-2 rounded">
                                        {activeScene.dialogue}
                                    </p>
                                </div>
                            </>
                        ) : (
                            /* Empty State */
                             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                                {activeScene.status === 'generating' || activeScene.idleStatus === 'generating' ? (
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-16 w-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                                            <ArrowPathIcon className="w-8 h-8 text-purple-500 animate-spin" />
                                        </div>
                                        <p>Generating...</p>
                                    </div>
                                ) : (
                                    <>
                                        <FilmIcon className="w-16 h-16 mb-4 opacity-50" />
                                        <p>No video generated yet.</p>
                                        <p className="text-xs mt-2 text-gray-600">Generate an image preview or the full video to see results.</p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Player Controls (Only for Main Video) */}
                        {previewMode === 'main' && activeScene.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => {
                                        if (videoRef.current) {
                                            if (isPlaying) videoRef.current.pause();
                                            else videoRef.current.play();
                                            setIsPlaying(!isPlaying);
                                        }
                                    }}
                                    className="p-4 bg-white/20 backdrop-blur rounded-full hover:bg-white/30 transition-all"
                                >
                                    {isPlaying ? <PauseIcon className="w-8 h-8 text-white" /> : <PlayIcon className="w-8 h-8 text-white" />}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-500 font-mono">
                         9:16 Vertical Preview • {activeScene.duration_seconds}s
                    </div>
                </div>
           </div>
        )}
      </main>

      {/* Timeline Footer */}
      {(appState === 'editing' || appState === 'preview') && currentProject && (
        <Timeline 
            scenes={currentProject.scenes} 
            activeSceneIndex={activeSceneIndex}
            onSceneSelect={onSceneSelect}
        />
      )}
    
      {/* Log Panel */}
      <LogPanel isVisible={showLogs} onClose={() => setShowLogs(false)} />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        showLogs={showLogs}
        onToggleLogs={() => setShowLogs(!showLogs)}
      />

      {/* Full Movie Player Overlay */}
      {showFullMovie && currentProject && (
        <FullScreenPlayer 
            scenes={currentProject.scenes} 
            onClose={() => setShowFullMovie(false)} 
        />
      )}

    </div>
  );
};

export default App;
