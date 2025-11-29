import React, { useState, useEffect } from 'react';

interface Props {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<Props> = ({ onKeySelected }) => {
  const [hasKey, setHasKey] = useState(false);

  const checkKey = async () => {
    // Cast window to any to access aistudio without type conflict
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
      if (selected) {
        onKeySelected();
      }
    }
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Assume success after interaction (race condition mitigation)
      setHasKey(true);
      onKeySelected();
    } else {
      alert("AI Studio environment not detected. Please run this in the correct environment.");
    }
  };

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-purple-400">Veo3 Animator Access</h2>
        <p className="text-gray-300 mb-6">
          To generate high-quality AI videos using Google's Veo models, you must select a valid API key associated with a billing-enabled Google Cloud Project.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
        >
          Select API Key
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Learn more about billing at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">ai.google.dev</a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeySelector;