
import { base } from '../../config/clients.js';
import { sendDiscordError, sendSlackError } from '../../utils/errorHandlers.js';

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
      await sendDiscordError(messageData.channelId, `@${messageData.author}: That tiktok username doesn't look familiar. Please Contact admins`);
      await sendSlackError(`Creator not found for: ${tiktokUsername}`);
      return null;
    }

    return records[0];
  } catch (error) {
    console.error('Error finding creator record:', error);
    await sendDiscordError(messageData.channelId, `@${messageData.author}: That tiktok username doesn't look familiar. Please Contact admins`);
    await sendSlackError(`Creator search error: ${error.message}`);
    return null;
  }
}

export { findCreatorRecord };
