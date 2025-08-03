import dotenv from 'dotenv';
import { getChemistryEventByIdWithTimeSlots } from './lib/calendar-utils-timeslots.ts';

dotenv.config();

async function testJsonParsing() {
  try {
    console.log('Testing JSON parsing fix...');
    
    const event = await getChemistryEventByIdWithTimeSlots('7057e857-16ea-4176-bac0-8542e2364665');
    
    if (event) {
      console.log('✅ Event retrieved successfully!');
      console.log('Event title:', event.title);
      console.log('TimeSlots count:', event.timeSlots?.length || 0);
      console.log('ActuelTimeSlots count:', event.actuelTimeSlots?.length || 0);
      console.log('Last state change:', event.lastStateChange ? 'Yes' : 'No');
    } else {
      console.log('❌ Event not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testJsonParsing();
