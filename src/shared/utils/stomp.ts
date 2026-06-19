import { logger } from './logger';

export interface StompConfig {
  url: string;
  topic: string;
  onMessage: (message: any) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export class SimpleStompClient {
  private socket: WebSocket | null = null;
  private config: StompConfig;
  private isConnected = false;
  private reconnectTimeout: number | null = null;
  private shouldReconnect = true;

  constructor(config: StompConfig) {
    this.config = config;
  }

  public connect() {
    this.shouldReconnect = true;
    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(this.config.url);

      this.socket.onopen = () => {
        this.sendFrame('CONNECT', {
          'accept-version': '1.2',
          host: new URL(this.config.url).host,
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (error) => {
        logger.error('[STOMP] WebSocket error.');
      };

      this.socket.onclose = () => {
        logger.warn('[STOMP] WebSocket connection closed.');
        this.isConnected = false;
        this.setStatus('disconnected');

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch {
      logger.error('[STOMP] Failed to connect WebSocket.');
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      if (this.isConnected) {
        this.sendFrame('DISCONNECT');
      }
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.setStatus('disconnected');
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    if (this.config.onStatusChange) {
      this.config.onStatusChange(status);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    logger.info('[STOMP] Scheduling reconnect in 3s.');
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.shouldReconnect) {
        this.connect();
      }
    }, 3000);
  }

  private sendFrame(command: string, headers: Record<string, string> = {}, body = '') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    let frame = `${command}\n`;
    for (const [key, val] of Object.entries(headers)) {
      frame += `${key}:${val}\n`;
    }
    frame += `\n${body}\x00`;

    this.socket.send(frame);
  }

  private handleMessage(data: string) {
    // A STOMP frame can contain heartbeats (new lines)
    if (data === '\n' || data === '\r\n') {
      return;
    }

    const nullCharIndex = data.indexOf('\x00');
    const frameContent = nullCharIndex !== -1 ? data.slice(0, nullCharIndex) : data;

    const parts = frameContent.split('\n\n');
    if (parts.length < 1) return;

    const headerLines = parts[0].split('\n');
    const command = headerLines[0].trim();

    if (command === 'CONNECTED') {
      logger.info('[STOMP] Connected to backend.');
      this.isConnected = true;
      this.setStatus('connected');

      // Subscribe to target topic
      this.sendFrame('SUBSCRIBE', {
        id: 'sub-0',
        destination: this.config.topic,
      });
    } else if (command === 'MESSAGE') {
      const body = parts.slice(1).join('\n\n').trim();
      if (!body) return;

      try {
        const json = JSON.parse(body);
        this.config.onMessage(json);
      } catch {
        logger.error('[STOMP] Failed to parse message body as JSON.');
      }
    }
  }
}
