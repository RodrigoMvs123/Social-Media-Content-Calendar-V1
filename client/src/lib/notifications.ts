// Browser notification service
class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Specific notification methods
  async notifyPostScheduled(platform: string, content: string) {
    await this.showNotification('📅 Post Scheduled', {
      body: `${platform}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      tag: 'post-scheduled'
    });
  }

  async notifyPostPublished(platform: string, content: string) {
    await this.showNotification('🎉 Post Published', {
      body: `${platform}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      tag: 'post-published'
    });
  }

  async notifyPostFailed(platform: string, content: string, error: string) {
    await this.showNotification('❌ Post Failed', {
      body: `${platform}: ${error}`,
      tag: 'post-failed'
    });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

export const notificationService = NotificationService.getInstance();