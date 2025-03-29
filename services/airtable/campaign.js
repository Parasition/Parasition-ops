
import { base } from '../../config/clients.js';
import { sendDiscordError, sendSlackError, notifyError } from '../../utils/errorHandlers.js';

async function findCampaign(campaignCode, messageData) {
  try {
    if (!campaignCode) {
      const technicalError = 'Campaign code is required';
      const userMessage = 'Please include a campaign code in your message.';
      await notifyError(messageData.channelId, technicalError, userMessage);
      return null;
    }

    const records = await base('Campaigns').select({
      filterByFormula: `{Short C Formular} = '${campaignCode}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      const technicalError = `Campaign ${campaignCode} not found for ${messageData.author}`;
      const userMessage = `The campaign code "${campaignCode}" is not active. Please check the code or contact an admin for assistance.`;
      await notifyError(messageData.channelId, technicalError, userMessage);
      return null;
    }

    return records[0];
  } catch (error) {
    console.error('Error finding campaign:', error);
    const technicalError = `Campaign search error for ${campaignCode}: ${error.message}`;
    const userMessage = `We couldn't find the campaign "${campaignCode}". Please check the campaign code or contact an admin for help.`;
    await notifyError(messageData.channelId, technicalError, userMessage);
    return null;
  }
}

export { findCampaign };
