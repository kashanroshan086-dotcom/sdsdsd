const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generate a premium subscription key (Owner Only)')
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days for the key')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Owner only check
    if (interaction.user.id !== config.owner_id) {
      return interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: '❌ Access Denied',
          description: 'Only the bot owner can use this command.'
        }],
        ephemeral: true
      });
    }

    const days = interaction.options.getInteger('days') || 30;
    
    // Generate random key
    const key = `KEY-${Math.random().toString(36).substring(2, 15).toUpperCase()}-${Date.now()}`;
    
    // Load database
    let database = JSON.parse(fs.readFileSync('./database.json', 'utf-8'));
    
    // Add key
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    database.keys.push({
      key: key,
      redeemed: false,
      redeemed_by: null,
      expires_at: expiresAt.toISOString()
    });
    
    // Save database
    fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔑 Premium Key Generated')
      .setDescription(`\`\`\`${key}\`\`\``)
      .addFields(
        { name: 'Duration', value: `${days} days`, inline: true },
        { name: 'Expires', value: expiresAt.toLocaleDateString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};