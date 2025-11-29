
import React, { useEffect, useRef, useState } from 'react';
import { logger } from '../services/logger';
import { LogEntry } from '../types';
import { XMarkIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

const LogPanel: React.FC<Props> = ({ isVisible, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logger updates
    const unsubscribe = logger.subscribe((newLog) => {
      // Nếu log này đã tồn tại (do logic subscribe gửi lại history), ta không add duplicate
      // Tuy nhiên cách đơn giản nhất là setLogs từ getHistory hoặc append.
      // Ở đây ta dùng cách append safe hơn:
      setLogs(prev => {
        if (prev.find(l => l.id === newLog.id)) return prev;
        return [...prev, newLog];
      });
    });

    // Load initial history
    setLogs(logger.getHistory());

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (bottomRef.current && !isMinimized && isVisible) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized, isVisible]);

  if (!isVisible) return null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400 font-bold';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 flex flex-col font-mono text-xs ${isMinimized ? 'h-10' : 'h-80'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold text-gray-300">System Console</span>
          <span className="bg-gray-700 text-gray-400 px-1.5 rounded text-[10px]">{logs.length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={(e) => { e.stopPropagation(); logger.clear(); setLogs([]); }}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Clear Console"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          >
            {isMinimized ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-black/50 backdrop-blur-sm rounded-b-lg scrollbar-thin scrollbar-thumb-gray-700">
          {logs.length === 0 && (
            <div className="text-gray-600 italic text-center mt-10">No logs generated yet...</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex space-x-2 break-all hover:bg-gray-800/50 p-0.5 rounded">
              <span className="text-gray-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
              <span className={`shrink-0 w-16 uppercase font-semibold ${getLevelColor(log.level)}`}>{log.level}</span>
              <span className="text-gray-300">
                {log.message}
                {log.details && (
                  <details className="mt-1 ml-2 text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-400">details</summary>
                    <pre className="mt-1 bg-gray-800 p-2 rounded overflow-x-auto text-[10px]">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default LogPanel;
