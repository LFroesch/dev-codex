type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Set<(toasts: Toast[]) => void> = new Set();

  show(message: string, type: ToastType = 'info', duration: number = 4000) {
    // Clear all existing toasts - only one toast at a time
    this.toasts = [];

    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };

    this.toasts.push(toast);
    this.notifyListeners();

    // Auto remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.toasts = [];
    this.notifyListeners();
  }

  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }

  subscribe(callback: (toasts: Toast[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback([...this.toasts]));
  }

  getToasts() {
    return [...this.toasts];
  }
}

export const toast = new ToastService();
export type { Toast, ToastType };