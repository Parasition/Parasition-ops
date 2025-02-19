
import cron from 'node-cron';
import { base } from '../config/clients.js';
import { getTikTokData } from './external.js';
import { sendSlackError, sendSlackSuccess, sendSlackWarning } from '../utils/errorHandlers.js';

async function processVideo(record, index, totalRecords) {
  const videoUrl = record.fields.Video;
  const creatorSocialName = record.fields['Creator Social Name'] || 'Unknown Creator';
  
  console.log(`\n=== Processing video ${index + 1}/${totalRecords} ===`);
  console.log(`Creator: ${creatorSocialName}`);
  console.log(`Video URL: ${videoUrl}`);

  if (!videoUrl) {
    console.log(`❌ No video URL found for record ${record.id}, skipping`);
    await sendSlackWarning(`Missing video URL for creator ${creatorSocialName} (Record ID: ${record.id})`);
    return { success: false, error: 'Missing video URL' };
  }

  try {
    // Log current stats before update
    const currentStats = {
      views: record.fields['Views Count'] || 0,
      likes: record.fields['Likes Count'] || 0,
      comments: record.fields['Comments Count'] || 0,
      bookmarks: record.fields['Bookmarks Count'] || 0
    };
    console.log('Current stats:', currentStats);

    // Fetch new data with multiple retries
    console.log('Fetching TikTok data...');
    const tiktokData = await getTikTokData(videoUrl);
    console.log('Successfully fetched TikTok data');

    // Prepare new stats
    const newStats = {
      'Views Count': tiktokData.itemInfo.itemStruct.stats.playCount || 0,
      'Likes Count': tiktokData.itemInfo.itemStruct.stats.diggCount || 0,
      'Comments Count': tiktokData.itemInfo.itemStruct.stats.commentCount || 0,
      'Bookmarks Count': tiktokData.itemInfo.itemStruct.stats.collectCount || 0,
    };

    // Verify that we have valid numbers
    const hasValidStats = Object.values(newStats).every(value => 
      typeof value === 'number' && value >= 0
    );

    if (!hasValidStats) {
      throw new Error('Invalid stats received from TikTok API');
    }

    // Update record
    await base('Parasition Group Discord').update([
      {
        id: record.id,
        fields: newStats
      }
    ]);

    console.log('✅ Successfully updated stats:', newStats);
    console.log(`=== Completed video ${index + 1}/${totalRecords} ===\n`);
    
    return { success: true, stats: newStats };
  } catch (error) {
    console.error(`❌ Error processing video ${index + 1}/${totalRecords}:`, error);
    
    if (error.message === 'Video is deleted') {
      await sendSlackWarning(`Video ${videoUrl} by ${creatorSocialName} was deleted or is no longer available`);
    } else {
      await sendSlackError(`Failed to update video stats for ${videoUrl} by ${creatorSocialName}: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function updateVideoViews() {
  try {
    console.log('\n🚀 Starting video views update...');
    
    // Get all records from current month
    const records = await base('Parasition Group Discord').select({
      view: 'Current Month',
    }).all();

    const totalRecords = records.length;
    console.log(`📊 Found ${totalRecords} total records to process`);

    let successCount = 0;
    let errorCount = 0;
    
    // Process videos one at a time with delay between each
    for (let i = 0; i < records.length; i++) {
      // Process single video
      const result = await processVideo(records[i], i, totalRecords);
      
      // Update counters
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Add delay between videos (skip delay after last video)
      if (i < records.length - 1) {
        console.log('⏳ Waiting 2 seconds before processing next video...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final report
    console.log('\n=== 📋 Video Views Update Summary ===');
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${errorCount}`);
    console.log(`📊 Total records processed: ${totalRecords}`);
    
    await sendSlackSuccess(
      `Video stats update completed:\n` +
      `• Successfully updated: ${successCount}\n` +
      `• Failed updates: ${errorCount}\n` +
      `• Total processed: ${totalRecords}`
    );

  } catch (error) {
    console.error('❌ Fatal error in updateVideoViews:', error);
    await sendSlackError(`Video views update failed with fatal error: ${error.message}`);
    throw error; // Re-throw to ensure the error is properly handled by the scheduler
  }
}

// Schedule the task to run every day at midnight and execute immediately
const scheduleVideoUpdates = () => {
  // Execute immediately when script starts
  updateVideoViews().catch(error => {
    console.error('Failed to execute initial video update:', error);
  });

  // Schedule to run at midnight (00:00) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled video views update');
    try {
      await updateVideoViews();
    } catch (error) {
      console.error('Failed to execute scheduled video update:', error);
    }
  }, {
    timezone: "UTC"
  });
};

export { scheduleVideoUpdates, updateVideoViews };
