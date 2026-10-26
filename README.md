# Relay Ticket Bot

Relay is a Discord ticket bot with a static management dashboard. The dashboard is hosted on GitHub Pages; the bot and OAuth/API service run together on an always-on Node.js host.

## What it does

- Discord sign-in and a list of servers where you have Manage Server permission.
- Per-server ticket panel channel, event log channel, and support role.
- Up to 10 ticket types, each routed to its own Discord category.
- A published Discord select-menu panel that creates private ticket channels.
- Ticket opening/closing logs and a close action for the ticket owner or support staff.
- JSON configuration persisted under `DATA_DIR`.
- A per-server blacklist managed with Discord slash commands and reflected in the dashboard.

## Blacklist commands

After restarting the bot, it registers `/blacklist` in each server. Members with Manage Server permission can use:

- `/blacklist add user reason` to stop a member from opening new tickets.
- `/blacklist remove user` to restore their ability to open tickets.
- `/blacklist list` to view the server's blacklist in Discord.

The dashboard shows blacklist entries and lets server managers remove them. Slash-command changes appear automatically within about 12 seconds. Blacklisting only blocks new support tickets; it does not ban members, remove them from the server, or close their existing tickets. Entries are saved in `guild-blacklists.json` under `DATA_DIR`.

GitHub Pages only serves the dashboard files. It cannot run a bot, keep OAuth secrets, or provide an API, so the Node service must be deployed separately.

## Run locally

Requirements: Node.js 20 or newer and a Discord application with a bot user.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the Discord application values described below.
3. Set `FRONTEND_URL=http://localhost:8000/` and include `http://localhost:8000` in `FRONTEND_ORIGINS`.
4. Set the public dashboard values in `public/config.js` to `http://localhost:3000` and your Discord application ID.
5. Start the bot/API with `npm start`.
6. In a second terminal, serve the static dashboard from `public/`, for example with `npx http-server public -p 8000`.
7. Open `http://localhost:8000`.

`npm run check` checks the backend JavaScript syntax. The dashboard script can be checked with `node --check public/app.js`.

## Discord application setup

In the Discord Developer Portal:

1. Create an application and add a bot user. Copy the application ID, OAuth client secret, and bot token into the matching environment variables. Treat the client secret and bot token as passwords; never commit `.env`.
2. Under OAuth2, add the exact value of `DISCORD_REDIRECT_URI` to **Redirects**. The API callback uses the `identify` and `guilds` OAuth scopes.
3. Make sure the application supports **Guild Install**. Invite the bot using the dashboard's **Add bot to server** button, or an OAuth URL with the `bot` scope and permissions `268553232`.
4. The bot uses the default Guilds intent only. It needs Manage Channels, Manage Roles, View Channels, Send Messages, Embed Links, Attach Files, and Read Message History in the server to create private channels and manage their permission overwrites. Keep the bot's role above the support role in the server role list.

When testing locally, the redirect URI can be `http://localhost:3000/auth/callback`. Discord OAuth redirects must exactly match the configured URI.

## Deploy the dashboard to GitHub Pages

1. Edit `public/config.js`: set `apiUrl` to the deployed API's HTTPS origin (no trailing slash) and `discordClientId` to the public Discord application ID.
2. Push this repository to GitHub. In repository **Settings > Pages**, select **GitHub Actions** as the build and deployment source.
3. The workflow deploys the `public/` directory on each push to `main`. Set `FRONTEND_URL` to the resulting full Pages URL, including the repository path and trailing slash, for example `https://OWNER.github.io/ticket-bot/`.
4. Set `FRONTEND_ORIGINS` to the Pages origin only, for example `https://OWNER.github.io` (no repository path).

## Deploy the bot and API

Deploy this repository as a Node.js service on a host that can keep a process running and provides persistent storage. Use `npm install` as the build command and `npm start` as the start command. Attach a persistent disk and set `DATA_DIR` to a directory on that disk; otherwise server settings may be lost when the host restarts or redeploys.

Configure these environment variables on the API host:

| Variable | Purpose |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord application's public ID |
| `DISCORD_CLIENT_SECRET` | OAuth secret, kept on the API host only |
| `DISCORD_BOT_TOKEN` | Bot token, kept on the API host only |
| `DISCORD_REDIRECT_URI` | Public API URL ending in `/auth/callback` |
| `FRONTEND_URL` | Full GitHub Pages URL, ending in `/` |
| `FRONTEND_ORIGINS` | Comma-separated allowed browser origins |
| `PORT` | Port supplied by the hosting provider, if applicable |
| `DATA_DIR` | Persistent directory for server configuration |

Add the deployed callback URL to the Discord application's OAuth2 redirects. Then update `public/config.js` with the same API URL and application ID, and push the change to publish the dashboard.

## Notes

- The API keeps OAuth sessions in memory for 12 hours. Users sign in again after an API restart; server configuration is stored separately in `DATA_DIR`.
- The bot and dashboard are an early baseline, not a hosted SaaS service. Anyone deploying it is responsible for keeping bot credentials private, using HTTPS, and providing persistent storage.
- Ticket channels are private to the opener, the configured support role, and the bot. Closing a ticket locks the opener's ability to send messages; closed channels remain for staff review.# blacklist-bot
# blacklist-bot
