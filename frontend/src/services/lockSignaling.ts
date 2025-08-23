import { io, Socket } from 'socket.io-client';

class LockSignalingService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      console.log('Lock signaling already connected');
      return;
    }

    // Clean up any existing socket before creating new one
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket = null;
    }

    const serverUrl = import.meta.env.DEV ? 'http://localhost:5003' : window.location.origin;
    
    this.socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: false // Reuse existing connection if possible
    });

    this.socket.on('connect', () => {
      console.log('Lock signaling connected');
      // Rejoin current project if we were in one
      if (this.currentProjectId) {
        this.joinProjectRoom(this.currentProjectId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Lock signaling disconnected:', reason);
      // Clear listeners on unexpected disconnect to prevent memory leaks
      if (reason === 'transport close' || reason === 'transport error') {
        this.listeners.clear();
      }
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
      // Remove all socket event listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentProjectId = null;
    // Clear all event listeners to prevent memory leaks
    this.listeners.clear();
  }

  // Add cleanup method for component unmounting
  cleanup() {
    this.leaveProject();
    this.disconnect();
    this.listeners.clear();
  }

  joinProject(projectId: string) {
    // Only connect if not already connected
    if (!this.socket?.connected) {
      this.connect();
      // Wait for connection before joining project
      if (this.socket) {
        this.socket.once('connect', () => {
          this.joinProjectRoom(projectId);
        });
      }
      return;
    }
    
    this.joinProjectRoom(projectId);
  }

  private joinProjectRoom(projectId: string) {
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.socket?.emit('leave-project', this.currentProjectId);
    }
    
    this.currentProjectId = projectId;
    this.socket?.emit('join-project', projectId);
    console.log(`Joined project room: ${projectId}`);
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