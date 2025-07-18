// Simple event system for Slack integration status updates
type Listener = () => void;

class SlackEventEmitter {
  private listeners: Listener[] = [];

  // Subscribe to status change events
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Emit status change event
  emitStatusChange(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const slackEvents = new SlackEventEmitter();