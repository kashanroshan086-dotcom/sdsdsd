const mc = require('minecraft-protocol');
const config = require('../config.json');

class MinecraftManager {
  constructor(ssid, server, username) {
    this.ssid = ssid;
    this.server = server;
    this.username = username;
    this.client = null;
    this.chatLogs = [];
    this.transcriptInterval = null;
    this.spamInterval = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const serverConfig = config.servers[this.server];
      
      console.log(`[${this.username}] Connecting with username: ${this.username}`);
      console.log(`[${this.username}] Server: ${serverConfig.ip}:${serverConfig.port}`);
      
      // Direct connection without authentication
      // Use offline mode or direct username
      this.client = mc.createClient({
        host: serverConfig.ip,
        port: serverConfig.port,
        username: this.username,
        version: serverConfig.version,
        keepAlive: true,
        hideErrors: false,
        connect: (client) => {
          console.log(`[${this.username}] Handshake initiated`);
        }
      });

      this.client.on('login', () => {
        console.log(`✅ [${this.username}] Minecraft bot logged in successfully`);
        this.isConnected = true;
        this.handleSpawn();
      });

      this.client.on('packet', (packet) => {
        // Handle incoming packets
        if (packet.message) {
          this.handleChatMessage(packet.message);
        }
      });

      this.client.on('chat', (packet) => {
        const message = packet.message || packet.text || '';
        if (message) {
          this.handleChatMessage(message);
        }
      });

      this.client.on('end', (reason) => {
        console.log(`⚠️ [${this.username}] Minecraft client disconnected: ${reason}`);
        this.isConnected = false;
        this.cleanup();
      });

      this.client.on('error', (error) => {
        console.error(`❌ [${this.username}] Minecraft Error: ${error.message}`);
        console.error(error.stack);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log(`[${this.username}] Connected to server`);
      });

      // Wait for connection attempt
      await this.delay(3000);

      if (!this.isConnected && this.client) {
        console.log(`[${this.username}] Still connecting...`);
      }

      return true;
    } catch (error) {
      console.error(`❌ [${this.username}] Failed to connect to Minecraft: ${error.message}`);
      console.error(error.stack);
      return false;
    }
  }

  async handleSpawn() {
    await this.delay(1000);
    
    // Send /lobby command
    this.sendCommand('/lobby');

    // Wait for server to process
    await this.delay(2000);

    // Server-specific logic
    switch (this.server) {
      case 'catpvp':
        await this.handleCatPvP();
        break;
      case 'pvpland':
        await this.handlePvpLand();
        break;
      case 'minemen':
        await this.handleMinemen();
        break;
    }
  }

  async handleCatPvP() {
    console.log(`🐱 [${this.username}] Handling CatPvP logic...`);
    
    // Move up 5 blocks
    await this.moveUp(5);
    
    // Start spam loop
    this.startSpamLoop();
  }

  async handlePvpLand() {
    console.log(`🏠 [${this.username}] Handling PvpLand logic...`);
    
    // Open window (chest/GUI)
    await this.delay(1000);
    this.sendCommand('/select');
    
    await this.delay(1000);
    // Click slot 13 (diamond sword - Arena)
    this.clickWindowSlot(13);
    
    await this.delay(1000);
    this.startSpamLoop();
  }

  async handleMinemen() {
    console.log(`⚔️ [${this.username}] Handling Minemen logic...`);
    
    // Open window
    await this.delay(1000);
    this.sendCommand('/play');
    
    await this.delay(1000);
    // Click slot 12 (diamond sword - Classic Practice)
    this.clickWindowSlot(12);
    
    await this.delay(1000);
    this.startSpamLoop();
  }

  async moveUp(blocks) {
    console.log(`📍 [${this.username}] Moving up ${blocks} blocks...`);
    
    for (let i = 0; i < blocks; i++) {
      if (this.client && this.client.player) {
        try {
          this.client.write('player', {
            x: this.client.player.x,
            y: this.client.player.y + 1.0,
            z: this.client.player.z,
            onGround: false
          });
          console.log(`[${this.username}] Block ${i + 1}/${blocks} moved`);
        } catch (e) {
          console.error(`[${this.username}] Error moving up: ${e.message}`);
        }
        await this.delay(150);
      }
    }
  }

  sendCommand(command) {
    if (this.client && this.isConnected) {
      try {
        this.client.write('chat', { message: command });
        console.log(`[${this.username}] Sent command: ${command}`);
      } catch (e) {
        console.error(`[${this.username}] Error sending command: ${e.message}`);
      }
    }
  }

  clickWindowSlot(slot) {
    if (this.client && this.isConnected) {
      try {
        this.client.write('window_click', {
          windowId: 0,
          slot: slot,
          mouseButton: 0,
          action: 0,
          mode: 0,
          item: null
        });
        console.log(`[${this.username}] Clicked slot ${slot}`);
      } catch (e) {
        console.error(`[${this.username}] Error clicking slot: ${e.message}`);
      }
    }
  }

  handleChatMessage(message) {
    if (!message) return;
    
    const msg = message.toString().toLowerCase();
    
    console.log(`[${this.username}] Chat: ${message}`);
    
    // Check for ban/mute detection
    const punishmentKeywords = [
      'you have been muted',
      'you have been banned',
      'you are banned',
      'banned from',
      'suspended',
      'kicked',
      'connection lost',
      'timed out'
    ];

    if (punishmentKeywords.some(keyword => msg.includes(keyword))) {
      console.log(`🚨 [${this.username}] PUNISHMENT DETECTED: ${message}`);
      this.chatLogs.push({
        type: 'PUNISHMENT',
        message: message,
        timestamp: new Date()
      });
      this.disconnect('User was punished');
      return;
    }

    this.chatLogs.push({
      type: 'CHAT',
      message: message,
      timestamp: new Date()
    });
  }

  startSpamLoop() {
    console.log(`📢 [${this.username}] Starting spam loop...`);
  }

  setSpamMessages(msg1, msg2, channel) {
    let messageIndex = 0;
    const messages = msg2 ? [msg1, msg2] : [msg1];

    console.log(`[${this.username}] Spam messages set: ${messages.join(' | ')}`);

    this.spamInterval = setInterval(() => {
      if (this.isConnected && this.client) {
        const currentMsg = messages[messageIndex % messages.length];
        this.sendCommand(currentMsg);
        messageIndex++;
      } else {
        console.log(`[${this.username}] Spam loop paused - not connected`);
      }
    }, config.spam_interval);

    // Start transcript updates
    this.startTranscriptUpdates(channel);
  }

  startTranscriptUpdates(channel) {
    this.transcriptInterval = setInterval(() => {
      if (channel && this.chatLogs.length > 0) {
        const transcript = this.generateTranscript();
        channel.send({
          embeds: [{
            color: 0x2C3E50,
            title: '📋 Activity Transcript (Last 30s)',
            description: transcript,
            timestamp: new Date()
          }]
        }).catch(err => console.error(`[${this.username}] Failed to send transcript:`, err));

        this.chatLogs = [];
      }
    }, config.transcript_interval);
  }

  generateTranscript() {
    if (this.chatLogs.length === 0) return 'No activity in the last 30 seconds.';

    return this.chatLogs
      .map((log, idx) => {
        const time = log.timestamp.toLocaleTimeString();
        const type = log.type === 'PUNISHMENT' ? '🚨' : '💬';
        return `${idx + 1}. [${time}] ${type} ${log.message}`;
      })
      .join('\n') || 'No logs recorded.';
  }

  async disconnect(reason = 'User disconnected') {
    console.log(`🔌 [${this.username}] Disconnecting: ${reason}`);
    
    if (this.spamInterval) clearInterval(this.spamInterval);
    if (this.transcriptInterval) clearInterval(this.transcriptInterval);
    
    this.isConnected = false;
    
    if (this.client) {
      try {
        this.client.end();
      } catch (error) {
        console.error(`[${this.username}] Error closing client:`, error.message);
      }
    }
  }

  cleanup() {
    this.disconnect('Cleanup');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MinecraftManager;
