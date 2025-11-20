import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ActivityFeed from '../components/ActivityFeed';
import PostComposer from '../components/PostComposer';

const ActivityPage: React.FC = () => {
  const { user } = useOutletContext<any>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostCreated = () => {
    // Trigger a refresh of the activity feed
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
        <p className="text-base-content/60">Share updates and see what's happening</p>
      </div>

      {/* Post Composer */}
      <PostComposer
        postType="profile"
        onPostCreated={handlePostCreated}
      />

      {/* Activity Feed */}
      <ActivityFeed key={refreshKey} limit={100} />
    </div>
  );
};

export default ActivityPage;
