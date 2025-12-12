import React from 'react';
import { NewsItem, DisasterType } from '../types';
import { COLORS } from '../constants';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white p-4 rounded-xl border border-slate-200">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-20 bg-slate-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
          Chưa có tin tức nào được ghi nhận.
        </div>
      ) : (
        news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))
      )}
    </div>
  );
};

const NewsCard: React.FC<{ item: NewsItem }> = ({ item }) => {
  const typeColor = COLORS[item.type];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <span 
              className="px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: typeColor }}
            >
              {item.type}
            </span>
            <span className="text-xs text-slate-500 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {item.date}
            </span>
          </div>
          {item.isVerified && (
            <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Đã xác thực
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors">
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>

        <div className="text-sm text-slate-600 mb-3 line-clamp-3">
          {item.summary}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1 border border-slate-100">
          <div className="flex">
            <span className="font-semibold w-20 text-slate-500">Địa điểm:</span>
            <span className="text-slate-800">{item.location}</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-20 text-slate-500">Thiệt hại:</span>
            <span className="text-red-600 font-medium">{item.damage}</span>
          </div>
          {item.agency && (
            <div className="flex">
              <span className="font-semibold w-20 text-slate-500">Nguồn tin:</span>
              <span className="text-slate-800">{item.agency} (theo {item.source})</span>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
         <span className="text-xs font-medium text-slate-400 uppercase">{item.source}</span>
         <a 
           href={item.sourceUrl} 
           target="_blank" 
           rel="noopener noreferrer"
           className="text-xs font-semibold text-blue-600 hover:underline flex items-center"
         >
           Đọc chi tiết
           <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
           </svg>
         </a>
      </div>
    </div>
  );
};