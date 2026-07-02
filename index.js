const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const commandHandler = require('./handlers/commandHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const config = require('./config.json');

// Store active bot instances
client.activeBots = new Map();
client.commands = new Collection();

client.on('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  // Load commands
  await commandHandler.load(client);
  
  client.user.setActivity('/start - Discord x Minecraft Automation', { type: 'WATCHING' });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`❌ Command Error: ${error.message}`);
    await interaction.reply({
      embeds: [{
        color: 0xFF0000,
        title: '⚠️ Error',
        description: `An error occurred: ${error.message}`,
        timestamp: new Date()
      }],
      flags: 64 // ephemeral flag instead of deprecated ephemeral property
    }).catch(() => null);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

client.login(config.token);
