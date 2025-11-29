
import React, { useState, useEffect } from 'react';
import { XMarkIcon, KeyIcon, CommandLineIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  showLogs: boolean;
  onToggleLogs: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, showLogs, onToggleLogs }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentKey = localStorage.getItem("gemini_api_key") || '';
      setApiKeyInput(currentKey);
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem("gemini_api_key", apiKeyInput.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      alert("API Key saved! You can now generate content.");
    } else {
      localStorage.removeItem("gemini_api_key");
      alert("API Key removed.");
    }
  };

  const inputClass = "w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 w-full max-w-md rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900/50">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          
          {/* API Key Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Account & Security</h3>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <KeyIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 w-full">
                  <h4 className="text-white font-medium mb-1">Google API Key</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Enter your Google GenAI API Key manually.
                  </p>
                  
                  <div className="space-y-3">
                    <input 
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste your API Key here (starts with AIza...)"
                      className={inputClass}
                    />
                    <button 
                      onClick={handleSaveKey}
                      className={`w-full py-2 px-4 rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center space-x-2 ${
                        saved ? 'bg-green-600 hover:bg-green-500' : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                    >
                      {saved ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <span>Save Key</span>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-gray-500 mt-2">
                    Key is stored locally in your browser. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Get a key here</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Developer Tools</h3>
            <div 
              className="flex items-center justify-between bg-gray-900 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors"
              onClick={onToggleLogs}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${showLogs ? 'bg-green-900/30' : 'bg-gray-800'}`}>
                  <CommandLineIcon className={`w-6 h-6 ${showLogs ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h4 className="text-white font-medium">System Console</h4>
                  <p className="text-sm text-gray-400">Show detailed logs for debugging</p>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${showLogs ? 'bg-purple-600' : 'bg-gray-700'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${showLogs ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">Veo3 Animator v1.1.0</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
