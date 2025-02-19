
import { base } from '../../config/clients.js';
import { sendSlackError } from '../../utils/errorHandlers.js';

async function findCurrentWeekKPI() {
  try {
    console.log('Attempting to find current week KPI');
    const records = await base('KPIs Weekly').select({
      filterByFormula: `{Current Week?} = 'Yes'`,
      maxRecords: 1,
      view: 'KPI-Weekly'
    }).firstPage();

    if (!records || records.length === 0) {
      await sendSlackError(`No current week KPI found`);
      console.log('No current week KPI found');
      return null;
    }

    console.log('Found current week KPI:', records[0].id);
    return records[0];
  } catch (error) {
    console.error('Error finding weekly KPI:', error);
    if (error.statusCode === 403) {
      console.error('Authentication error - please check Airtable API key permissions');
    }
    throw error;
  }
}

async function findCurrentMonthKPI() {
  try {
    console.log('Attempting to find current month KPI');
    const records = await base('KPIs Monthly').select({
      filterByFormula: `{Current Month?} = 'Yes'`,
      maxRecords: 1,
      view: 'KPI-Monthly'
    }).firstPage();

    if (!records || records.length === 0) {
      console.log('No current month KPI found');
      await sendSlackError(`No current month KPI found`);
      return null;
    }

    console.log('Found current month KPI:', records[0].id);
    return records[0];
  } catch (error) {
    console.error('Error finding monthly KPI:', error);
    if (error.statusCode === 403) {
      console.error('Authentication error - please check Airtable API key permissions');
    }
    throw error;
  }
}

export { findCurrentWeekKPI, findCurrentMonthKPI };
