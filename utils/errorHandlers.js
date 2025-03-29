
import { client, slack } from '../config/clients.js';

async function sendDiscordError(channelId, error) {
  try {
    if (!client || !client.channels) {
      console.error('Discord client not properly initialized');
      return;
    }

    if (!channelId) {
      console.error('No channel ID provided for Discord error message');
      return;
    }

    console.log(`Attempting to send error to Discord channel: ${channelId}`);
    
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      await channel.send(`❌ ${error}`);
      console.log(`Successfully sent error message to Discord channel: ${channelId}`);
    } else {
      console.error(`Could not find Discord channel with ID: ${channelId}`);
    }
  } catch (err) {
    console.error('Failed to send error message to Discord:', err);
  }
}

async function sendSlackError(error) {
  try {
    if (!process.env.SLACK_CHANNEL_ID) {
      console.error('SLACK_CHANNEL_ID not set in environment variables');
      return;
    }

    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `❌ ${error}`,
    });
  } catch (err) {
    console.error('Failed to send error message to Slack:', err);
  }
}

async function sendSlackSuccess(message) {
  try {
    if (!process.env.SLACK_CHANNEL_ID) {
      console.error('SLACK_CHANNEL_ID not set in environment variables');
      return;
    }

    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `✅ ${message}`,
    });
  } catch (err) {
    console.error('Failed to send success message to Slack:', err);
  }
}

async function sendSlackWarning(message) {
  try {
    if (!process.env.SLACK_CHANNEL_ID) {
      console.error('SLACK_CHANNEL_ID not set in environment variables');
      return;
    }

    await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `⚠️ ${message}`,
    });
  } catch (err) {
    console.error('Failed to send warning message to Slack:', err);
  }
}

async function notifyError(channelId, technicalError, userFriendlyMessage) {
  console.error(`❌ Error: ${technicalError}`);
  
  if (channelId) {
    const discordMessage = userFriendlyMessage || technicalError;
    console.log(`Sending to Discord channel ${channelId}: ${technicalError}`);
    await sendDiscordError(channelId, technicalError);
  } else {
    console.warn('No Discord channelId provided, skipping Discord notification');
  }
  
  await sendSlackError(technicalError);
}

export {
  sendDiscordError,
  sendSlackError,
  sendSlackSuccess,
  sendSlackWarning,
  notifyError
};
