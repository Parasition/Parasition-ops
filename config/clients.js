
import { Client, GatewayIntentBits } from 'discord.js';
import { WebClient } from '@slack/web-api';
import Airtable from 'airtable';
import 'dotenv/config';

// Discord client initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Initialize Airtable
Airtable.configure({
  apiKey: process.env.AIRTABLE_API_KEY,
  endpointUrl: 'https://api.airtable.com'
});
const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

// Initialize Slack
const slack = new WebClient(process.env.SLACK_TOKEN);

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export {
  client,
  base,
  slack,
  MAX_RETRIES,
  RETRY_DELAY
};
