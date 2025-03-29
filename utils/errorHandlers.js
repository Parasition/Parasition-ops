import { client, slack } from '../config/clients.js';

async function sendDiscordError(channelId, error) {
  try {
    if (!client || !client.channels) {
      console.error('Discord client not properly initialized');
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (channel) {
      await channel.send(`❌ ${error}`);
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
    await sendDiscordError(channelId, discordMessage);
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
