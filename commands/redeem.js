const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem a premium subscription key')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Your premium key')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const key = interaction.options.getString('key');
      
      // Validation - prevent null trim error
      if (!key || typeof key !== 'string') {
        return interaction.reply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Invalid Input',
            description: 'Please provide a valid key.'
          }],
          flags: 64 // ephemeral flag
        });
      }

      const keyTrimmed = key.trim();
      const userId = interaction.user.id;

      // Load database
      if (!fs.existsSync('./database.json')) {
        return interaction.reply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Database Error',
            description: 'Database file not found.'
          }],
          flags: 64
        });
      }

      let database = JSON.parse(fs.readFileSync('./database.json', 'utf-8'));

      // Find key
      const keyEntry = database.keys.find(k => k.key === keyTrimmed);

      if (!keyEntry) {
        return interaction.reply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Invalid Key',
            description: 'The key you provided does not exist.'
          }],
          flags: 64
        });
      }

      if (keyEntry.redeemed) {
        return interaction.reply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Already Redeemed',
            description: `This key was already redeemed by <@${keyEntry.redeemed_by}>`
          }],
          flags: 64
        });
      }

      if (keyEntry.expires_at && new Date(keyEntry.expires_at) < new Date()) {
        return interaction.reply({
          embeds: [{
            color: 0xFF0000,
            title: '❌ Expired Key',
            description: 'This key has expired.'
          }],
          flags: 64
        });
      }

      // Redeem key
      keyEntry.redeemed = true;
      keyEntry.redeemed_by = userId;

      // Add user to premium users
      if (!database.premium_users.includes(userId)) {
        database.premium_users.push(userId);
      }

      fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Key Redeemed Successfully')
        .setDescription('You now have access to the `/start` command!')
        .addFields(
          { name: 'Premium Status', value: '✨ Active', inline: true },
          { name: 'Expires', value: keyEntry.expires_at ? new Date(keyEntry.expires_at).toLocaleDateString() : 'Never', inline: true }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed]
      });
    } catch (error) {
      console.error('Redeem error:', error);
      await interaction.reply({
        embeds: [{
          color: 0xFF0000,
          title: '❌ Error',
          description: error.message
        }],
        flags: 64
      }).catch(() => null);
    }
  }
};
