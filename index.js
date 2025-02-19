
import 'dotenv/config';
import express from 'express';
import { client, MAX_RETRIES, RETRY_DELAY } from './config/clients.js';
import { sendDiscordError, sendSlackError } from './utils/errorHandlers.js';
import { createMiscRecord, findCampaign, findCreatorRecord, findCurrentWeekKPI, findCurrentMonthKPI, createParasitionGroupRecord } from './services/airtable/index.js';
import { getTikTokData, sendToAIMessage } from './services/external.js';
import { scheduleVideoUpdates } from './services/scheduler.js';

// Verify required environment variables
const requiredEnvVars = ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'SLACK_TOKEN', 'DISCORD_CHANNEL_ID', 'SLACK_CHANNEL_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  await sendSlackError(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
app.use(express.json());

async function processMessage(messageData, retryCount = 0) {
  try {
    const data = await sendToAIMessage(messageData);
    
    if (!data.valid) {
      console.log(data);
      console.log('Invalid Message, Please check again');
      await sendDiscordError(messageData.channelId, `@${messageData.author} ${data.reason}`);
      await sendSlackError(`Invalid message format: ${data.reason}`);
      return false;
    }

    console.log(data);

    const miscRecordCreated = await createMiscRecord(data, messageData);
    if (!miscRecordCreated) {
      await sendSlackError('Could not create misc record');
      return false;
    }

    console.log(miscRecordCreated.fields);

    const campaignCode = miscRecordCreated.fields.Campaign;
    const campaign = await findCampaign(campaignCode, messageData);
    if (!campaign) {
      return false;
    }

    let tiktokData;
    try {
      tiktokData = await getTikTokData(data.tiktok_url);
      console.log('TikTok data retrieved successfully:', tiktokData.itemInfo.itemStruct.author);
    } catch (error) {
      await sendSlackError(`TikTok data fetch failed: ${error.message}`);
      return false;
    }

    const creatorRecord = await findCreatorRecord(tiktokData.itemInfo.itemStruct.author.uniqueId, messageData);
    if (!creatorRecord) {
      return false;
    }

    const weeklyKPI = await findCurrentWeekKPI();
    const monthlyKPI = await findCurrentMonthKPI();

    if (!weeklyKPI || !monthlyKPI) {
      await sendSlackError('Could not find current KPI records');
      return false;
    }

    const parasitionRecord = await createParasitionGroupRecord(data, creatorRecord, campaign, tiktokData, messageData, weeklyKPI, monthlyKPI);
    if (!parasitionRecord) {
      await sendSlackError('Failed to create parasition group record');
      return false;
    }

    console.log('Successfully processed message:', messageData.id);
    return true;
  } catch (error) {
    console.error(`Message processing attempt ${retryCount + 1} failed:`, error);

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return processMessage(messageData, retryCount + 1);
    } else {
      console.error('Max retries reached. Giving up.');
      await sendSlackError(`Failed to process message after ${MAX_RETRIES} attempts: ${error.message}`);
      return false;
    }
  }
}

// Discord bot events
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Check if message is from the specified channel
  const targetChannelId = process.env.DISCORD_CHANNEL_ID;
  if (message.channelId !== targetChannelId) {
    return;
  }

  // Ignore bot messages and specifically CorrectionBot
  if (message.author.bot || message.author.username === "CorrectionBot") return;

  const messageData = {
    id: message.id,
    content: message.content.replace(/\n/g, ' ').trim(),
    author: message.author.username,
    timestamp: new Date(message.createdTimestamp),
    channelId: message.channelId,
    type: "new"
  };

  console.log(messageData);

  const success = await processMessage(messageData);
  if (!success) {
    console.error(`Failed to process message ${messageData.id} after all retries`);
  }
});

// Express routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start scheduler
scheduleVideoUpdates();
console.log('Video views update scheduler initialized');

// Start both servers
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

// Connect to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
