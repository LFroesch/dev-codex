import { connectDatabase } from '../config/database';
import RateLimit from '../models/RateLimit';

async function clearRateLimits() {
  try {
    await connectDatabase();
    console.log('Connected to database');
    
    const result = await RateLimit.deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} rate limit records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing rate limits:', error);
    process.exit(1);
  }
}

clearRateLimits();