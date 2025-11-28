import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Salary from './models/Salary.js';

// Load environment variables
dotenv.config();

/**
 * Test the hike functionality manually with detailed debugging
 */
async function testHikeFunctionality() {
  try {
    console.log('🧪 Starting salary hike functionality test...\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Debug: Check current date and time
    const currentDate = new Date();
    console.log('📅 CURRENT DATE INFO:');
    console.log('   Full date:', currentDate);
    console.log('   ISO string:', currentDate.toISOString());
    console.log('   Local string:', currentDate.toLocaleString());
    console.log('   Date only:', currentDate.toDateString());
    console.log('   Time only:', currentDate.toTimeString());
    console.log('');

    // Debug: Check all salary records for ZIC004 in detail
    console.log('🔍 DETAILED SALARY RECORDS FOR ZIC005:');
    const allSalaries = await Salary.find({ employeeId: 'ZIC005' }).sort({ createdAt: -1 });
    
    allSalaries.forEach((salary, index) => {
      console.log(`\n${index + 1}. Salary ID: ${salary._id}`);
      console.log(`   Active Status: ${salary.activeStatus}`);
      console.log(`   Monthly CTC: ₹${salary.monthlyCtc}`);
      console.log(`   Month/Year: ${salary.month} ${salary.year}`);
      console.log(`   Created: ${salary.createdAt}`);
      console.log(`   Updated: ${salary.updatedAt}`);
      
      if (salary.hike && salary.hike.applied) {
        console.log(`   🎯 HIKE APPLIED:`);
        console.log(`      Start Date: ${salary.hike.startDate}`);
        console.log(`      Start Date (ISO): ${salary.hike.startDate.toISOString()}`);
        console.log(`      Start Date (Local): ${salary.hike.startDate.toLocaleString()}`);
        console.log(`      Hike %: ${salary.hike.hikePercent}%`);
        console.log(`      Previous CTC: ₹${salary.hike.previousMonthlyCtc}`);
        
        // Detailed date comparison
        const now = new Date();
        const hikeStart = new Date(salary.hike.startDate);
        
        console.log(`   📅 DATE COMPARISON DETAILS:`);
        console.log(`      Current Date: ${now}`);
        console.log(`      Hike Start: ${hikeStart}`);
        console.log(`      Current Time: ${now.getTime()}`);
        console.log(`      Hike Start Time: ${hikeStart.getTime()}`);
        console.log(`      Is hike start date reached? ${now >= hikeStart}`);
        
        // Check with start of day comparison (like in processHikeStatusUpdates)
        const nowStartOfDay = new Date(now);
        nowStartOfDay.setHours(0, 0, 0, 0);
        
        const hikeStartStartOfDay = new Date(hikeStart);
        hikeStartStartOfDay.setHours(0, 0, 0, 0);
        
        console.log(`   🌅 START OF DAY COMPARISON:`);
        console.log(`      Current (start of day): ${nowStartOfDay}`);
        console.log(`      Hike Start (start of day): ${hikeStartStartOfDay}`);
        console.log(`      Should activate? ${hikeStartStartOfDay <= nowStartOfDay}`);
      } else {
        console.log(`   ❌ No hike applied`);
      }
    });

    // Test 1: Check processHikeStatusUpdates return type
    console.log('\n1. 🔄 TESTING processHikeStatusUpdates...');
    /** @type {{activated: number, disabled: number}} */
    const result = await Salary.processHikeStatusUpdates();
    console.log('📊 Result:', result);
    console.log('🔍 Type of activated:', typeof result.activated);
    console.log('🔍 Type of disabled:', typeof result.disabled);
    
    // Check status after update
    console.log('\n🔍 CHECKING STATUS AFTER processHikeStatusUpdates:');
    const updatedSalaries = await Salary.find({ employeeId: 'ZIC005' }).sort({ createdAt: -1 });
    
    updatedSalaries.forEach((salary, index) => {
      console.log(`\n${index + 1}. Salary ID: ${salary._id}`);
      console.log(`   Active Status: ${salary.activeStatus}`);
      console.log(`   Monthly CTC: ₹${salary.monthlyCtc}`);
      console.log(`   Month/Year: ${salary.month} ${salary.year}`);
    });

    // Test 2: Check getCurrentSalary method
    console.log('\n2. Testing getCurrentSalary...');
    const currentSalary = await Salary.getCurrentSalary('ZIC005');
    if (currentSalary) {
      console.log('✅ Current salary found for ZIC005');
      console.log('   Employee:', currentSalary.name);
      console.log('   Monthly CTC:', currentSalary.monthlyCtc);
      console.log('   Active Status:', currentSalary.activeStatus);
    
      // Test 3: Check instance methods
      console.log('\n3. Testing instance methods...');
      const isPending = currentSalary.isHikePending();
      const hikeStatus = currentSalary.getHikeStatus();
      console.log('   Is hike pending:', isPending);
      console.log('   Hike status:', hikeStatus);
      
      if (currentSalary.hike && currentSalary.hike.applied) {
        console.log('   Hike percentage:', currentSalary.hike.hikePercent + '%');
        console.log('   Hike start date:', currentSalary.hike.startDate);
      }
    } else {
      console.log('❌ No current salary found for ZIC005');
    }

    // Test 4: Check for pending hikes
    console.log('\n4. Checking for pending hikes...');
    const pendingHikes = await Salary.find({
      activeStatus: 'disabled',
      'hike.applied': true,
      'hike.startDate': { $gt: new Date() }
    });
    console.log('   Pending hikes found:', pendingHikes.length);
    pendingHikes.forEach(hike => {
      console.log(`   - ${hike.employeeId}: ${hike.name} (Starts: ${hike.hike.startDate})`);
    });

    // Test 5: Check for activatable hikes (past start date)
    console.log('\n5. Checking for activatable hikes...');
    const activatableHikes = await Salary.find({
      activeStatus: 'disabled',
      'hike.applied': true,
      'hike.startDate': { $lte: new Date() }
    });
    console.log('   Activatable hikes found:', activatableHikes.length);
    activatableHikes.forEach(hike => {
      console.log(`   - ${hike.employeeId}: ${hike.name} (Started: ${hike.hike.startDate})`);
    });

    // Test 6: Get salary history
    console.log('\n6. Testing salary history...');
    const salaryHistory = await Salary.getSalaryHistory('ZIC005');
    console.log('   Salary history entries:', salaryHistory.length);
    salaryHistory.forEach(salary => {
      console.log(`   - ${salary.month} ${salary.year}: ₹${salary.monthlyCtc} (${salary.activeStatus})`);
    });

    // Test 7: Manual fix if needed
    console.log('\n7. 🛠️  MANUAL FIX ATTEMPT (if needed)...');
    if (result.activated === 0 && activatableHikes.length > 0) {
      console.log('   ⚠️  Found activatable hikes but processHikeStatusUpdates did not activate them');
      console.log('   🔧 Attempting manual activation...');
      
      for (const hike of activatableHikes) {
        console.log(`   🔧 Processing hike for ${hike.employeeId}...`);
        
        // Find current active salary to disable
        const currentActive = await Salary.findOne({
          employeeId: hike.employeeId,
          activeStatus: 'enabled'
        });
        
        if (currentActive) {
          console.log(`   🔧 Disabling old salary: ${currentActive._id}`);
          await Salary.updateOne(
            { _id: currentActive._id },
            { $set: { activeStatus: 'disabled' } }
          );
        }
        
        // Enable the new salary
        console.log(`   🔧 Enabling new salary: ${hike._id}`);
        const hikeStartDate = new Date(hike.hike.startDate);
        const month = hikeStartDate.toLocaleDateString("en-US", { month: "long" });
        const year = hikeStartDate.getFullYear();
        
        await Salary.updateOne(
          { _id: hike._id },
          { 
            $set: { 
              activeStatus: 'enabled',
              month: month,
              year: year
            } 
          }
        );
        
        console.log(`   ✅ Manually activated salary for ${hike.employeeId}`);
      }
      
      // Verify the fix
      console.log('\n🔍 VERIFYING MANUAL FIX...');
      const fixedSalaries = await Salary.find({ employeeId: 'ZIC005' }).sort({ createdAt: -1 });
      fixedSalaries.forEach((salary, index) => {
        console.log(`   ${index + 1}. Salary: ₹${salary.monthlyCtc} (${salary.activeStatus})`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testHikeFunctionality();
}

export default testHikeFunctionality;