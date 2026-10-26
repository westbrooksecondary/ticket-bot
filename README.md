# Blacklist Registry

A dark public website lists blacklist records from Discord servers connected to the bot. The website is read-only and has no Discord login. Moderators add, remove, and list records through Discord slash commands.

## Discord commands

The bot registers `/blacklist` in each server it joins. Members with **Manage Server** permission can use:

- `/blacklist add user reason` adds a user and optional reason.
- `/blacklist remove user` removes a user.
- `/blacklist list` lists entries for the current server.

Each record stores username, user ID, reason, moderator, and date added. The website combines records from connected servers and shows the server name. Entries are saved to `guild-blacklists.json` under `DATA_DIR`. This is a public record only; it does not ban, kick, or otherwise restrict the user in Discord. Do not put sensitive information in reasons.

## Run the bot/API

Requirements: Node.js 20 or newer and a Discord bot application.

1. Copy `.env.example` to `.env` and set `DISCORD_BOT_TOKEN` to your bot token. The example contains only this one setting.
2. Install and start the service:

```sh
npm install
npm start
```

The API serves the public feed at `GET /api/blacklist` and a health check at `GET /health`. It listens on port `3000` by default and stores data under `./data`. On a host, set `PORT` if required and `DATA_DIR` to a persistent disk path. Keep the bot online so it can register slash commands and serve the API.

Invite the bot with the `bot` and `applications.commands` scopes. It uses only the default Guilds intent; privileged intents are not required.

## GitHub Pages

This repository's website URL is `https://westbrooksecondary.github.io/ticket-bot/`.

1. Deploy the bot/API to an always-on Node.js host and note its public HTTPS origin.
2. Set `apiUrl` in `public/config.js` to that API origin, without a trailing slash.
3. In repository **Settings > Pages**, choose **GitHub Actions** as the source.
4. Commit and push this project to `main`. The workflow deploys `public/` on pushes and can also be run manually from **Actions**.

GitHub Pages hosts only the website. The bot/API must run separately; the page reads its public, read-only feed and refreshes it automatically.

## Local preview

Set `apiUrl` in `public/config.js` to `http://localhost:3000`, start the bot/API, then serve `public/` on port `8000` and open `http://localhost:8000`.