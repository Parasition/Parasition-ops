import 'dotenv/config';
import express from 'express';
import { client, MAX_RETRIES, RETRY_DELAY } from './config/clients.js';
import { sendDiscordError, sendSlackError, notifyError } from './utils/errorHandlers.js';
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
      
      // User-friendly error based on the specific reason
      let userMessage = "Your message format isn't quite right. ";
      
      if (data.reason.includes("URL")) {
        userMessage += "Please make sure you've included a valid TikTok URL.";
      } else if (data.reason.includes("boost") || data.reason.includes("code")) {
        userMessage += "Please include the correct campaign or boost code.";
      } else {
        userMessage += "Please check your message and try again.";
      }
      
      await notifyError(
        messageData.channelId, 
        `Invalid message format from ${messageData.author}: ${data.reason}`,
        userMessage
      );
      return false;
    }

    console.log(data);

    const miscRecordCreated = await createMiscRecord(data, messageData);
    if (!miscRecordCreated) {
      await notifyError(
        messageData.channelId,
        `Failed to create misc record for message from ${messageData.author}`
      );
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
      // Pass the channelId to getTikTokData for proper error reporting
      tiktokData = await getTikTokData(data.tiktok_url, messageData.channelId);
      console.log('TikTok data retrieved successfully:', tiktokData.itemInfo.itemStruct.author);
    } catch (error) {
      await notifyError(
        messageData.channelId,
        `TikTok data fetch failed for ${data.tiktok_url} from ${messageData.author}: ${error.message}`
      );
      return false;
    }

    const creatorRecord = await findCreatorRecord(tiktokData.itemInfo.itemStruct.author.uniqueId, messageData);
    if (!creatorRecord) {
      return false;
    }

    const weeklyKPI = await findCurrentWeekKPI();
    const monthlyKPI = await findCurrentMonthKPI();

    if (!weeklyKPI || !monthlyKPI) {
      await notifyError(
        messageData.channelId,
        `Could not find current KPI records for message from ${messageData.author}`
      );
      return false;
    }

    const parasitionRecord = await createParasitionGroupRecord(data, creatorRecord, campaign, tiktokData, messageData, weeklyKPI, monthlyKPI);
    if (!parasitionRecord) {
      await notifyError(
        messageData.channelId,
        `Failed to create parasition group record for message from ${messageData.author}`
      );
      return false;
    }

    console.log('Successfully processed message:', messageData.id);
    return true;
  } catch (error) {
    console.error(`Message processing attempt ${retryCount + 1} failed:`, error);

    // User-friendly error message that doesn't expose technical details
    const userMessage = "We couldn't process your message. Please try again or contact an admin if the issue persists.";
    
    // Detailed technical message for Slack
    const technicalMessage = `Failed to process message from ${messageData.author} (attempt ${retryCount + 1}): ${error.message}`;

    // Notify about the error to both platforms
    await notifyError(
      messageData.channelId,
      technicalMessage,
      userMessage
    );

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return processMessage(messageData, retryCount + 1);
    } else {
      console.error('Max retries reached. Giving up.');
      await notifyError(
        messageData.channelId,
        `Failed to process message from ${messageData.author} after ${MAX_RETRIES} attempts: ${error.message}`,
        "We've tried multiple times but couldn't process your message. Please contact an admin for assistance."
      );
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
    // Final notification is already sent in processMessage
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
