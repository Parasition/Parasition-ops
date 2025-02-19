
import { base } from '../../config/clients.js';
import { sendSlackError } from '../../utils/errorHandlers.js';

async function createMiscRecord(data, messageData) {
  try {
    if (!data || !messageData) {
      const error = 'Invalid data provided to createMiscRecord';
      await sendSlackError(error);
      return false;
    }

    console.log('Creating Airtable record with data:', {
      content: messageData.content,
      author: messageData.author
    });

    const records = await base('Misc1').create([
      {
        fields: {
          'Name': messageData.content || '',
          'Discord Username': messageData.author || ''
        }
      }
    ]);

    if (!records || records.length === 0) {
      const error = 'No record was created';
      await sendSlackError(error);
      return false;
    }

    console.log('Created Airtable record:', records[0].id);
    return records[0];
  } catch (error) {
    console.error('Error creating Airtable record:', error);
    const errorMessage = `Failed to create Airtable record: ${error.message || 'Unknown error'}`;
    await sendSlackError(errorMessage);
    return false;
  }
}

export { createMiscRecord };
