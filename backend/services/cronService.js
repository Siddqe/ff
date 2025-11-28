import cron from 'node-cron';
import Salary from '../models/Salary.js';

/**
 * Start the cron job for processing hike status updates
 * @returns {void}
 */
export const startHikeCronJob = () => {
  // Run every day at midnight to check for hike status updates
  cron.schedule('*/1 * * * *', async () => {
    try {
      console.log('🔄 Checking for salary hike status updates...');
      
      // This should now show proper types when hovering
      const result = await Salary.processHikeStatusUpdates();
      
      if (result.activated > 0 || result.disabled > 0) {
        console.log(`✅ Hike status update completed: ${result.activated} salary records activated, ${result.disabled} salary records disabled`);
      } else {
        console.log('✅ No hike status updates needed');
      }

      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // last day of current month
      const daysLeft = lastDay - today.getDate();

      if (daysLeft === 2) {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          .toLocaleString('default', { month: 'long' });

        // Update salary month field
        await Salary.updateMany({}, { $set: { month: nextMonth } });
        console.log(`🗓️ Salary month updated to ${nextMonth} (2 days before month end)`);
      }

    } catch (error) {
      console.error('❌ Error processing hike status updates:', error);
    }
  });

  console.log('✅ Hike status cron job started');
};

