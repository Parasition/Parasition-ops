
import { base } from '../../config/clients.js';
import { sendDiscordError, sendSlackError, notifyError } from '../../utils/errorHandlers.js';

async function findCreatorRecord(tiktokUsername, messageData) {
  try {
    let records = await base('Creators Master').select({
      filterByFormula: `{TikTok Username} = '${tiktokUsername}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      records = await base('Creators Master').select({
        filterByFormula: `{TikTok Username 2} = '${tiktokUsername}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length === 0) {
        records = await base('Creators Master').select({
          filterByFormula: `{TikTok Username 3} = '${tiktokUsername}'`,
          maxRecords: 1
        }).firstPage();
      }
    }

    if (records.length === 0) {
      // Use the new notifyError function to notify both platforms
      await notifyError(
        messageData.channelId, 
        `Creator not found: ${tiktokUsername} submitted by ${messageData.author}`
      );
      await sendDiscordError(messageData.channelId, `@${messageData.author}: That tiktok username doesn't look familiar. Please Contact admins`);
      return null;
    }

    return records[0];
  } catch (error) {
    // Use the new notifyError function for the comprehensive notification
    await notifyError(
      messageData.channelId,
      `Error finding creator ${tiktokUsername} submitted by ${messageData.author}: ${error.message}`
    );
    await sendDiscordError(messageData.channelId, `@${messageData.author}: That tiktok username doesn't look familiar. Please Contact admins`);
    return null;
  }
}

export { findCreatorRecord };
