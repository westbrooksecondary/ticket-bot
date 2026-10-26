import 'dotenv/config';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('Set DISCORD_BOT_TOKEN in .env before starting the bot.');
}

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const dataDirectory = path.resolve(process.env.DATA_DIR || './data');
const blacklistPath = path.join(dataDirectory, 'guild-blacklists.json');
let guildBlacklists = {};

await mkdir(dataDirectory, { recursive: true });
try {
  guildBlacklists = JSON.parse(await readFile(blacklistPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

async function saveBlacklists() {
  const temporaryPath = `${blacklistPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(guildBlacklists, null, 2));
  await rename(temporaryPath, blacklistPath);
}

app.use((_request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (_request.method === 'OPTIONS') return response.sendStatus(204);
  next();
});

app.get('/health', (_request, response) => response.json({ ok: true }));

app.get('/api/blacklist', (_request, response) => {
  const entries = Object.entries(guildBlacklists).flatMap(([guildId, users]) => {
    const guild = client.guilds.cache.get(guildId);
    return Object.values(users).map((entry) => ({
      ...entry,
      guildId,
      guildName: guild?.name || `Server ${guildId}`,
    }));
  }).sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  response.json({ entries, updatedAt: new Date().toISOString() });
});

const blacklistCommand = new SlashCommandBuilder()
  .setName('blacklist')
  .setDescription('Manage this server blacklist')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) => subcommand
    .setName('add')
    .setDescription('Add a user to the blacklist')
    .addUserOption((option) => option.setName('user').setDescription('User to add').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for adding the user').setMaxLength(500)))
  .addSubcommand((subcommand) => subcommand
    .setName('remove')
    .setDescription('Remove a user from the blacklist')
    .addUserOption((option) => option.setName('user').setDescription('User to remove').setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('list')
    .setDescription('List this server blacklist'));

async function registerBlacklistCommand(guild) {
  const commands = await guild.commands.fetch();
  const existing = commands.find((command) => command.name === 'blacklist');
  if (existing) await guild.commands.edit(existing.id, blacklistCommand.toJSON());
  else await guild.commands.create(blacklistCommand.toJSON());
}

async function handleBlacklistCommand(interaction) {
  if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Manage Server permission is required.', ephemeral: true });
  }
  const guildId = interaction.guildId;
  const entries = guildBlacklists[guildId] || {};
  const action = interaction.options.getSubcommand();

  if (action === 'add') {
    const user = interaction.options.getUser('user');
    if (entries[user.id]) return interaction.reply({ content: `${user.username} is already blacklisted here.`, ephemeral: true });
    guildBlacklists[guildId] = {
      ...entries,
      [user.id]: {
        userId: user.id,
        username: user.globalName || user.username,
        reason: interaction.options.getString('reason')?.trim() || '',
        addedByName: interaction.user.globalName || interaction.user.username,
        addedAt: new Date().toISOString(),
      },
    };
    await saveBlacklists();
    return interaction.reply({ content: `${user.username} was added to this server's website blacklist.`, ephemeral: true });
  }

  if (action === 'remove') {
    const user = interaction.options.getUser('user');
    if (!entries[user.id]) return interaction.reply({ content: `${user.username} is not on this server's blacklist.`, ephemeral: true });
    delete entries[user.id];
    if (!Object.keys(entries).length) delete guildBlacklists[guildId];
    await saveBlacklists();
    return interaction.reply({ content: `${user.username} was removed from this server's blacklist.`, ephemeral: true });
  }

  const list = Object.values(entries);
  if (!list.length) return interaction.reply({ content: 'This server blacklist is empty.', ephemeral: true });
  const lines = list.slice(0, 10).map((entry) => `- <@${entry.userId}>${entry.reason ? `: ${entry.reason.slice(0, 100)}` : ''}`);
  if (list.length > lines.length) lines.push(`...and ${list.length - lines.length} more.`);
  return interaction.reply({ content: lines.join('\n'), allowedMentions: { parse: [] }, ephemeral: true });
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'blacklist') return;
  try {
    await handleBlacklistCommand(interaction);
  } catch (error) {
    console.error('Blacklist command failed:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Could not update the blacklist. Try again.', ephemeral: true });
    }
  }
});

async function registerGuildCommand(guild) {
  try {
    await registerBlacklistCommand(guild);
    console.log(`Registered /blacklist in ${guild.name}`);
  } catch (error) {
    console.error(`Could not register /blacklist in ${guild.id}:`, error.message);
  }
}

client.once('ready', () => {
  console.log(`Blacklist bot ready as ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) void registerGuildCommand(guild);
});
client.on('guildCreate', (guild) => void registerGuildCommand(guild));

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  response.status(500).json({ error: 'The blacklist API could not complete that request.' });
});

await client.login(process.env.DISCORD_BOT_TOKEN);
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Blacklist website API listening on port ${port}`));