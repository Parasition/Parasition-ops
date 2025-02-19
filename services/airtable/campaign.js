
import { base } from '../../config/clients.js';
import { sendDiscordError, sendSlackError } from '../../utils/errorHandlers.js';

async function findCampaign(campaignCode, messageData) {
  try {
    if (!campaignCode) {
      const error = 'Campaign code is required';
      await sendSlackError(error);
      return null;
    }

    const records = await base('Campaigns').select({
      filterByFormula: `{Short C Formular} = '${campaignCode}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      const error = `@${messageData.author}, Campaign ${campaignCode} isn't active naymore. Please Contact admins`;
      await sendDiscordError(messageData.channelId, error);
      await sendSlackError(error);
      return null;
    }

    return records[0];
  } catch (error) {
    console.error('Error finding campaign:', error);
    await sendDiscordError(messageData.channelId, `@${messageData.author}, Campaign ${campaignCode} isn't active naymore. Please Contact admins`);
    await sendSlackError(`Campaign search error: ${error.message}`);
    return null;
  }
}

export { findCampaign };
