
import fetch from 'node-fetch';
import { sendSlackError, sendSlackWarning } from '../utils/errorHandlers.js';

const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function getTikTokData(videoUrl) {
  console.log('Processing TikTok URL:', videoUrl);
  
  // Check cache first
  const cachedData = cache.get(videoUrl);
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
    console.log('Returning cached TikTok data');
    return cachedData.data;
  }

  try {
    const response = await fetch(`https://api.tikapi.io/public/video?id=${videoUrl}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.TIKAPI_KEY,
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('TikTok API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });

      if (response.status === 403 || errorData.includes('Video not found')) {
        throw new Error('Video is deleted');
      }

      await sendSlackError(`TikTok API error: ${response.status} - ${errorData}`);
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data = await response.json();
    // Cache the successful response
    cache.set(videoUrl, {
      data,
      timestamp: Date.now()
    });
    
    console.log('TikTok API Response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching TikTok data:', error);
    if (error.message === 'Video is deleted') {
      throw error;
    }
    await sendSlackError(`TikTok API fetch error: ${error.message}`);
    throw error;
  }
}

async function sendToAIMessage(messageData, retryCount = 0) {
  try {
    const response = await fetch(process.env.AI_MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageData.content,
        authKey: process.env.AUTH_KEY || '29ItN4jHRC35bB6e9aMD'
      })
    });

    if (!response.ok) {
      const res = await response.json();
      const error = `HTTP error! status: ${response.status}`;
      await sendSlackError(error);
      throw new Error(error);
    }

    return await response.json();
  } catch (error) {
    await sendSlackError(`AI Message error: ${error.message}`);
    throw error;
  }
}

export {
  getTikTokData,
  sendToAIMessage
};
