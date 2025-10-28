import React from 'react';

interface NewsItem {
  type?: string;
  title: string;
  summary?: string;
  date: string;
}

interface NewsRendererProps {
  news: NewsItem[];
}

const NewsRenderer: React.FC<NewsRendererProps> = ({ news }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-2">
        {news.map((newsItem, index) => (
          <div
            key={index}
            className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 capitalize flex-shrink-0">
                {newsItem.type || 'update'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-base-content/80 break-words">{newsItem.title}</div>
              </div>
            </div>
            {newsItem.summary && (
              <div className="text-xs text-base-content/70 mt-2 break-words">
                {newsItem.summary}
              </div>
            )}
            <div className="text-xs text-base-content/60 mt-2">
              {new Date(newsItem.date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsRenderer;
