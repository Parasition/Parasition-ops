
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
      // Use the new notifyError function with a user-friendly message
      await notifyError(
        messageData.channelId, 
        `Creator not found: ${tiktokUsername} submitted by ${messageData.author}`,
        `We couldn't find the TikTok username "${tiktokUsername}" in our database. Please check the spelling or contact an admin for help.`
      );
      return null;
    }

    return records[0];
  } catch (error) {
    // Use the new notifyError function with a user-friendly message
    await notifyError(
      messageData.channelId,
      `Error finding creator ${tiktokUsername} submitted by ${messageData.author}: ${error.message}`,
      `We encountered an issue with the TikTok username "${tiktokUsername}". Please try again or contact an admin for help.`
    );
    return null;
  }
}

export { findCreatorRecord };
