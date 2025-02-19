
import { base } from '../../config/clients.js';
import { sendSlackError } from '../../utils/errorHandlers.js';

async function createParasitionGroupRecord(data, creatorRecord, campaign, tiktokData, messageData, weeklyKPI, monthlyKPI) {
  try {
    console.log('Creating parasition group record with data:', {
      creator: tiktokData.itemInfo.itemStruct.author.uniqueId,
      campaign: campaign.id
    });

    const record = await base('Parasition Group Discord').create([
      {
        fields: {
          'Creator': tiktokData.itemInfo.itemStruct.author.uniqueId,
          'Creator Social Name': messageData.author,
          'Campaign': campaign.fields['Name'],
          'Video': data.tiktok_url,
          'Views Count': tiktokData.itemInfo.itemStruct.stats.playCount || 0,
          'Likes Count': tiktokData.itemInfo.itemStruct.stats.diggCount || 0,
          'Comments Count': tiktokData.itemInfo.itemStruct.stats.commentCount || 0,
          'Bookmarks Count': tiktokData.itemInfo.itemStruct.stats.collectCount || 0,
          'Creators Master': [creatorRecord.id],
          'Boostkod': data.boost_code,
          'KPIs Weekly': weeklyKPI ? [weeklyKPI.id] : [],
          'KPIs Monthly': monthlyKPI ? [monthlyKPI.id] : [],
          'Campaign Name': [campaign.id]
        }
      }
    ]);

    console.log('Created parasition group record:', record[0].id);
    return record[0];
  } catch (error) {
    console.error('Error creating parasition group record:', error);
    await sendSlackError(`Failed to create parasition video record: ${error.message}`);
    return null;
  }
}

export { createParasitionGroupRecord };
