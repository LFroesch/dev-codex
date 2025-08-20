import { io, Socket } from 'socket.io-client';

class LockSignalingService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    const serverUrl = import.meta.env.DEV ? 'http://localhost:5003' : window.location.origin;
    
    this.socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      // Rejoin current project if we were in one
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId);
      }
    });

    this.socket.on('disconnect', () => {
    });

    // Set up event listeners
    this.socket.on('note-locked', (data: { noteId: string; lockedBy: { email: string; name: string } }) => {
      this.emit('note-locked', data);
    });

    this.socket.on('note-unlocked', (data: { noteId: string }) => {
      this.emit('note-unlocked', data);
    });

    this.socket.on('note-updated', (data: { noteId: string; note: any }) => {
      this.emit('note-updated', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentProjectId = null;
  }

  joinProject(projectId: string) {
    if (!this.socket?.connected) {
      this.connect();
    }
    
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.socket?.emit('leave-project', this.currentProjectId);
    }
    
    this.currentProjectId = projectId;
    this.socket?.emit('join-project', projectId);
  }

  leaveProject() {
    if (this.currentProjectId && this.socket?.connected) {
      this.socket.emit('leave-project', this.currentProjectId);
    }
    this.currentProjectId = null;
  }

  // Event emitter functionality
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in lock signaling callback:', error);
      }
    });
  }
}

export const lockSignaling = new LockSignalingService();