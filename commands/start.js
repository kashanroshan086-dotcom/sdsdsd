const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const config = require('../config.json');
const MinecraftManager = require('../managers/minecraftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start Minecraft automation (Premium Only)')
    .addStringOption(option =>
      option.setName('ssid')
        .setDescription('Minecraft session token/SSID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('server')
        .setDescription('Target server')
        .setRequired(true)
        .addChoices(
          { name: 'CatPvP', value: 'catpvp' },
          { name: 'PvpLand', value: 'pvpland' },
          { name: 'Minemen', value: 'minemen' }
        )
    )
    .addStringOption(option =>
      option.setName('msg1')
        .setDescription('First message to spam')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('msg2')
        .setDescription('Second message to spam (Optional)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Premium check
    const database = JSON.parse(fs.readFileSync('./database.json', 'utf-8'));
    
    if (!database.premium_users.includes(interaction.user.id)) {
      return interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: '❌ Premium Required',
          description: 'You need a premium subscription to use this command. Use `/redeem` to activate your key.'
        }],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const ssid = interaction.options.getString('ssid');
    const server = interaction.options.getString('server');
    const msg1 = interaction.options.getString('msg1');
    const msg2 = interaction.options.getString('msg2') || null;

    try {
      // Create logging channel
      const guild = interaction.guild;
      const categoryId = config.log_category_id;
      
      // Use a placeholder username for now (will resolve from session)
      const username = `minecraft_${interaction.user.id.substring(0, 8)}`;
      const channelName = `🤖-log-${username}`;

      const logChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }
        ]
      });

      // Initialize Minecraft Manager
      const mcManager = new MinecraftManager(ssid, server, username);
      
      const connected = await mcManager.connect();
      
      if (!connected) {
        await logChannel.delete();
        return interaction.editReply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Connection Failed',
            description: 'Failed to connect to the Minecraft server.'
          }]
        });
      }

      // Store instance
      client.activeBots.set(interaction.user.id, mcManager);

      // Send welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x2C3E50)
        .setTitle('🤖 Automation Started')
        .addFields(
          { name: 'Username', value: `\`${username}\``, inline: true },
          { name: 'Server', value: `\`${server.toUpperCase()}\``, inline: true },
          { name: 'Message 1', value: `\`${msg1}\``, inline: false },
          { name: 'Message 2', value: `\`${msg2 || 'None'}\``, inline: false }
        )
        .setTimestamp();

      await logChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [welcomeEmbed]
      });

      // Set spam messages and start looping
      mcManager.setSpamMessages(msg1, msg2, logChannel);

      await interaction.editReply({
        embeds: [{
          color: 0x00FF00,
          title: '✅ Automation Started',
          description: `Check <#${logChannel.id}> for activity logs.`
        }]
      });

    } catch (error) {
      console.error('Error starting automation:', error);
      await interaction.editReply({
        embeds: [{
          color: 0xFF0000,
          title: '❌ Error',
          description: error.message
        }]
      });
    }
  }
};