
import { LogEntry } from '../types';

type Listener = (log: LogEntry) => void;

class LoggerService {
  private listeners: Listener[] = [];
  private logs: LogEntry[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Gửi ngay lịch sử log hiện tại cho subscriber mới
    this.logs.forEach(log => listener(log));
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(entry: LogEntry) {
    this.logs.push(entry);
    this.listeners.forEach(l => l(entry));
  }

  log(level: LogEntry['level'], message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level,
      message,
      details
    };
    
    // Vẫn log ra console trình duyệt để debug cứng nếu cần
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (details) {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, details);
    } else {
      consoleMethod(`[${level.toUpperCase()}] ${message}`);
    }
    
    this.emit(entry);
  }

  info(message: string, details?: any) { this.log('info', message, details); }
  warn(message: string, details?: any) { this.log('warn', message, details); }
  error(message: string, details?: any) { this.log('error', message, details); }
  success(message: string, details?: any) { this.log('success', message, details); }
  
  getHistory() { return this.logs; }
  
  clear() { 
    this.logs = []; 
    // Thông báo cho UI biết đã clear bằng một log đặc biệt hoặc reload, 
    // ở đây ta đơn giản là để UI tự quản lý việc hiển thị khi nhận được log mới
    this.info('Logs cleared');
  }
}

export const logger = new LoggerService();
