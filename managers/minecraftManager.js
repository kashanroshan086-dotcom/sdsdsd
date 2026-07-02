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
      
      this.client = mc.createClient({
        host: serverConfig.ip,
        port: serverConfig.port,
        username: this.username,
        auth: 'microsoft',
        authServer: 'https://authserver.mojang.com',
        version: serverConfig.version,
        keepAlive: true
      });

      this.client.on('login', () => {
        console.log(`✅ Minecraft bot logged in as ${this.username}`);
        this.isConnected = true;
        this.handleSpawn();
      });

      this.client.on('chat', (message) => {
        this.handleChatMessage(message);
      });

      this.client.on('end', (reason) => {
        console.log(`⚠️ Minecraft client disconnected: ${reason}`);
        this.isConnected = false;
        this.cleanup();
      });

      this.client.on('error', (error) => {
        console.error(`❌ Minecraft Error: ${error.message}`);
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to Minecraft: ${error.message}`);
      return false;
    }
  }

  async handleSpawn() {
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
    console.log('🐱 Handling CatPvP logic...');
    
    // Move up 5 blocks
    await this.moveUp(5);
    
    // Start spam loop
    this.startSpamLoop();
  }

  async handlePvpLand() {
    console.log('🏠 Handling PvpLand logic...');
    
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
    console.log('⚔️ Handling Minemen logic...');
    
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
    console.log(`📍 Moving up ${blocks} blocks...`);
    
    for (let i = 0; i < blocks; i++) {
      if (this.client) {
        this.client.write('player', {
          x: this.client.player.x,
          y: this.client.player.y + 1,
          z: this.client.player.z,
          onGround: false
        });
        await this.delay(100);
      }
    }
  }

  sendCommand(command) {
    if (this.client && this.isConnected) {
      this.client.write('chat', { message: command });
    }
  }

  clickWindowSlot(slot) {
    if (this.client && this.isConnected) {
      this.client.write('window_click', {
        windowId: 0,
        slot: slot,
        mouseButton: 0,
        action: 0,
        mode: 0,
        item: null
      });
    }
  }

  handleChatMessage(message) {
    const msg = message.toString().toLowerCase();
    
    // Check for ban/mute detection
    const punishmentKeywords = [
      'you have been muted',
      'you have been banned',
      'you are banned',
      'banned from',
      'suspended',
      'kicked'
    ];

    if (punishmentKeywords.some(keyword => msg.includes(keyword))) {
      console.log(`🚨 PUNISHMENT DETECTED: ${message}`);
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
    console.log('📢 Starting spam loop...');
    // This will be called by the command handler with msg1 and msg2
  }

  setSpamMessages(msg1, msg2, channel) {
    let messageIndex = 0;
    const messages = msg2 ? [msg1, msg2] : [msg1];

    this.spamInterval = setInterval(() => {
      if (this.isConnected && this.client) {
        const currentMsg = messages[messageIndex % messages.length];
        this.sendCommand(currentMsg);
        messageIndex++;
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
        }).catch(err => console.error('Failed to send transcript:', err));

        this.chatLogs = []; // Clear logs after sending
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
    console.log(`🔌 Disconnecting: ${reason}`);
    
    if (this.spamInterval) clearInterval(this.spamInterval);
    if (this.transcriptInterval) clearInterval(this.transcriptInterval);
    
    this.isConnected = false;
    
    if (this.client) {
      try {
        this.client.end();
      } catch (error) {
        console.error('Error closing client:', error);
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