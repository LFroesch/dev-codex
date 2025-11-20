/**
 * Manual cleanup script for soft-deleted social content
 *
 * Run with: npx tsx src/scripts/cleanupSoftDeleted.ts [--days=30] [--dry-run]
 *
 * This script permanently removes soft-deleted comments and posts older than X days.
 * Use --dry-run to see what would be deleted without actually deleting.
 */

import mongoose from 'mongoose';
import Comment from '../models/Comment';
import Post from '../models/Post';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devcodex';

interface CleanupOptions {
  daysOld: number;
  dryRun: boolean;
}

async function cleanupSoftDeleted(options: CleanupOptions) {
  const { daysOld, dryRun } = options;
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  console.log(`🔍 Finding soft-deleted items older than ${daysOld} days (before ${cutoffDate.toISOString()})`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will permanently delete)'}`);
  console.log('---');

  // Find soft-deleted comments
  const commentsToDelete = await Comment.find({
    isDeleted: true,
    deletedAt: { $lt: cutoffDate }
  }).countDocuments();

  // Find soft-deleted posts
  const postsToDelete = await Post.find({
    isDeleted: true,
    deletedAt: { $lt: cutoffDate }
  }).countDocuments();

  console.log(`📊 Found:`);
  console.log(`  - ${commentsToDelete} comments to delete`);
  console.log(`  - ${postsToDelete} posts to delete`);
  console.log('---');

  if (dryRun) {
    console.log('✅ Dry run complete. No changes made.');
    console.log('Run without --dry-run to actually delete these items.');
    return;
  }

  if (commentsToDelete === 0 && postsToDelete === 0) {
    console.log('✅ Nothing to delete.');
    return;
  }

  console.log('⚠️  Starting deletion in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete comments
  if (commentsToDelete > 0) {
    const commentResult = await Comment.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate }
    });
    console.log(`✅ Deleted ${commentResult.deletedCount} comments`);
  }

  // Delete posts
  if (postsToDelete > 0) {
    const postResult = await Post.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate }
    });
    console.log(`✅ Deleted ${postResult.deletedCount} posts`);
  }

  console.log('---');
  console.log('🎉 Cleanup complete!');
}

async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const dryRun = args.includes('--dry-run');

  const daysOld = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

  if (isNaN(daysOld) || daysOld < 1) {
    console.error('❌ Invalid --days value. Must be a positive number.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    await cleanupSoftDeleted({ daysOld, dryRun });

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
