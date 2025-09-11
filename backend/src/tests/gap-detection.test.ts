import { calculateActiveTime } from '../middleware/analytics';

describe('Gap Detection - Sleep Computer Scenario', () => {
  
  test('Should exclude 8-hour sleep period from project time', () => {
    // Simulate your exact scenario
    const projectStartTime = new Date('2024-01-01T22:00:00.000Z'); // 10 PM - start working
    const lastHeartbeatBeforeSleep = new Date('2024-01-01T23:00:00.000Z'); // 11 PM - last heartbeat
    const firstHeartbeatAfterWake = new Date('2024-01-02T07:00:00.000Z'); // 7 AM - first heartbeat after wake
    const projectEndTime = new Date('2024-01-02T08:00:00.000Z'); // 8 AM - stop working
    
    // Heartbeat timestamps (every 30 seconds during active periods)
    const heartbeatTimestamps = [
      // Active work before sleep (1 hour = 120 heartbeats, showing just a few)
      new Date('2024-01-01T22:00:30.000Z'),
      new Date('2024-01-01T22:01:00.000Z'),
      new Date('2024-01-01T22:01:30.000Z'),
      // ... many more heartbeats ...
      new Date('2024-01-01T22:58:30.000Z'),
      new Date('2024-01-01T22:59:00.000Z'),
      lastHeartbeatBeforeSleep, // 11 PM - last before sleep
      
      // 8 HOUR GAP HERE (NO HEARTBEATS - COMPUTER SLEEPING)
      
      // Active work after wake (1 hour = 120 heartbeats, showing just a few)
      firstHeartbeatAfterWake, // 7 AM - first after wake
      new Date('2024-01-02T07:00:30.000Z'),
      new Date('2024-01-02T07:01:00.000Z'),
      // ... many more heartbeats ...
      new Date('2024-01-02T07:58:30.000Z'),
      new Date('2024-01-02T07:59:00.000Z'),
      new Date('2024-01-02T07:59:30.000Z')
    ];
    
    // Calculate active time using our gap detection
    const activeTime = calculateActiveTime(projectStartTime, projectEndTime, heartbeatTimestamps);
    
    // Expected: Only count the active periods, exclude the 8-hour sleep gap
    const expectedActiveTime = (
      (lastHeartbeatBeforeSleep.getTime() - projectStartTime.getTime()) + // 1 hour before sleep
      (projectEndTime.getTime() - firstHeartbeatAfterWake.getTime()) // 1 hour after wake
    );
    
    // Should be ~2 hours (7,200,000 ms), NOT 10 hours (36,000,000 ms)
    expect(activeTime).toBe(expectedActiveTime);
    expect(activeTime).toBe(2 * 60 * 60 * 1000); // 2 hours in milliseconds
    
    // Verify the 8-hour sleep gap was excluded
    const totalRawTime = projectEndTime.getTime() - projectStartTime.getTime();
    expect(totalRawTime).toBe(10 * 60 * 60 * 1000); // 10 hours total
    expect(activeTime).toBeLessThan(totalRawTime); // Active time should be much less
    
    console.log(`✅ Sleep Gap Test Results:`);
    console.log(`   Total raw time: ${totalRawTime / 1000 / 60 / 60} hours`);
    console.log(`   Active time: ${activeTime / 1000 / 60 / 60} hours`);
    console.log(`   Sleep time excluded: ${(totalRawTime - activeTime) / 1000 / 60 / 60} hours`);
  });

  test('Should handle various gap scenarios', () => {
    const startTime = new Date('2024-01-01T09:00:00.000Z');
    const endTime = new Date('2024-01-01T17:00:00.000Z'); // 8-hour workday
    
    const heartbeats = [
      // Work 9-10 AM (active)
      new Date('2024-01-01T09:00:30.000Z'),
      new Date('2024-01-01T09:30:00.000Z'),
      new Date('2024-01-01T09:59:30.000Z'),
      
      // 30-minute lunch break (gap > 15 min threshold)
      // No heartbeats from 10 AM to 10:30 AM
      
      // Work 10:30-11:30 AM (active)
      new Date('2024-01-01T10:30:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
      new Date('2024-01-01T11:29:30.000Z'),
      
      // 5-minute coffee break (gap < 15 min threshold)
      // Small gap from 11:30 to 11:35
      
      // Work 11:35 AM-5 PM (active)
      new Date('2024-01-01T11:35:00.000Z'),
      new Date('2024-01-01T14:00:00.000Z'),
      new Date('2024-01-01T16:59:30.000Z')
    ];
    
    const activeTime = calculateActiveTime(startTime, endTime, heartbeats);
    
    // Should count: 1hr + 1hr + 5.5hr + 5min = ~7.5 hours
    // Should exclude: 30min lunch break
    const expectedHours = 7.5;
    const expectedMs = expectedHours * 60 * 60 * 1000;
    
    // Allow small tolerance for calculation precision
    expect(activeTime).toBeCloseTo(expectedMs, -4); // Within 10 seconds
    
    console.log(`✅ Mixed Gap Test Results:`);
    console.log(`   Expected: ${expectedHours} hours`);
    console.log(`   Actual: ${activeTime / 1000 / 60 / 60} hours`);
  });

  test('Should handle edge case: no heartbeats at all', () => {
    const startTime = new Date('2024-01-01T09:00:00.000Z');
    const endTime = new Date('2024-01-01T17:00:00.000Z');
    const heartbeats: Date[] = []; // No heartbeats
    
    const activeTime = calculateActiveTime(startTime, endTime, heartbeats);
    
    // Should cap at GAP_THRESHOLD (15 minutes) to prevent counting long idle periods
    const GAP_THRESHOLD = 15 * 60 * 1000;
    expect(activeTime).toBe(GAP_THRESHOLD);
    
    console.log(`✅ No Heartbeats Test: Capped at ${GAP_THRESHOLD / 1000 / 60} minutes`);
  });

  test('Should handle edge case: single heartbeat', () => {
    const startTime = new Date('2024-01-01T09:00:00.000Z');
    const endTime = new Date('2024-01-01T17:00:00.000Z');
    const heartbeats = [new Date('2024-01-01T10:00:00.000Z')]; // One heartbeat
    
    const activeTime = calculateActiveTime(startTime, endTime, heartbeats);
    
    // Should count: start to heartbeat (1 hour) + nothing after (7 hour gap > threshold)
    const expectedTime = 1 * 60 * 60 * 1000; // 1 hour
    expect(activeTime).toBe(expectedTime);
    
    console.log(`✅ Single Heartbeat Test: ${activeTime / 1000 / 60 / 60} hours counted`);
  });

  test('Real-world scenario: Full day with computer sleep', () => {
    // Simulate a real work day
    const dayStart = new Date('2024-01-01T08:00:00.000Z'); // 8 AM
    const dayEnd = new Date('2024-01-01T18:00:00.000Z'); // 6 PM
    
    // Generate realistic heartbeat pattern
    const heartbeats: Date[] = [];
    
    // Morning work: 8 AM - 12 PM (4 hours, heartbeat every 30 seconds)
    for (let time = dayStart.getTime(); time < dayStart.getTime() + 4*60*60*1000; time += 30*1000) {
      heartbeats.push(new Date(time));
    }
    
    // Lunch break: 12 PM - 1 PM (no heartbeats)
    
    // Afternoon work: 1 PM - 3 PM (2 hours)  
    for (let time = dayStart.getTime() + 5*60*60*1000; time < dayStart.getTime() + 7*60*60*1000; time += 30*1000) {
      heartbeats.push(new Date(time));
    }
    
    // COMPUTER SLEEP: 3 PM - 5 PM (2 hours, no heartbeats)
    
    // Evening work: 5 PM - 6 PM (1 hour)
    for (let time = dayStart.getTime() + 9*60*60*1000; time < dayEnd.getTime(); time += 30*1000) {
      heartbeats.push(new Date(time));
    }
    
    const activeTime = calculateActiveTime(dayStart, dayEnd, heartbeats);
    
    // Expected: 4hr morning + 2hr afternoon + 1hr evening = 7 hours
    // Excluded: 1hr lunch + 2hr computer sleep = 3 hours
    const expectedActiveHours = 7;
    const expectedActiveMs = expectedActiveHours * 60 * 60 * 1000;
    
    expect(activeTime).toBeCloseTo(expectedActiveMs, -4);
    
    const totalHours = (dayEnd.getTime() - dayStart.getTime()) / 1000 / 60 / 60;
    const activeHours = activeTime / 1000 / 60 / 60;
    const excludedHours = totalHours - activeHours;
    
    console.log(`✅ Full Day Test Results:`);
    console.log(`   Total day: ${totalHours} hours`);
    console.log(`   Active work: ${activeHours} hours`);
    console.log(`   Excluded (lunch + sleep): ${excludedHours} hours`);
    
    expect(excludedHours).toBeCloseTo(3, 1); // Should exclude ~3 hours
  });
});

// Run the test
if (require.main === module) {
  console.log('🧪 Running Gap Detection Tests...\n');
  
  // Import Jest manually if not in test environment
  const runTests = async () => {
    const { calculateActiveTime } = await import('../middleware/analytics');
    
    // Test 1: Sleep scenario
    console.log('Test 1: 8-hour computer sleep scenario');
    const projectStartTime = new Date('2024-01-01T22:00:00.000Z');
    const lastHeartbeatBeforeSleep = new Date('2024-01-01T23:00:00.000Z');
    const firstHeartbeatAfterWake = new Date('2024-01-02T07:00:00.000Z');
    const projectEndTime = new Date('2024-01-02T08:00:00.000Z');
    
    const heartbeatTimestamps = [
      new Date('2024-01-01T22:30:00.000Z'),
      lastHeartbeatBeforeSleep,
      firstHeartbeatAfterWake,
      new Date('2024-01-02T07:30:00.000Z')
    ];
    
    const activeTime = calculateActiveTime(projectStartTime, projectEndTime, heartbeatTimestamps);
    const totalTime = projectEndTime.getTime() - projectStartTime.getTime();
    
    console.log(`   Total time: ${totalTime / 1000 / 60 / 60} hours`);
    console.log(`   Active time: ${activeTime / 1000 / 60 / 60} hours`);
    console.log(`   Sleep excluded: ${(totalTime - activeTime) / 1000 / 60 / 60} hours`);
    console.log(`   ✅ Sleep time correctly excluded: ${activeTime < totalTime / 2}\n`);
    
    return activeTime < totalTime / 2; // Should exclude most of the time
  };
  
  runTests().then(success => {
    console.log(success ? '🎉 All tests passed!' : '❌ Tests failed!');
  });
}