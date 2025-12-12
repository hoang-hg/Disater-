import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AnalysisCharts } from './components/AnalysisCharts';
import { NewsItem, DisasterType } from './types';
import { MOCK_NEWS, NEWSPAPER_SOURCES } from './constants';
import { fetchLatestDisasterNews } from './services/geminiService';

const App: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString('vi-VN'));
  const [dataSource, setDataSource] = useState<'mock' | 'live'>('mock');

  const handleRefresh = async () => {
    setIsLoading(true);
    setDataSource('live');
    
    // Call Gemini Service
    const fetchedNews = await fetchLatestDisasterNews();
    
    if (fetchedNews.length > 0) {
      setNews(fetchedNews);
    } else {
      // Fallback or alert if empty (using alert strictly for demo purposes)
      alert("Không tìm thấy tin tức mới hoặc chưa cấu hình API Key. Hiển thị dữ liệu mẫu.");
      setNews(MOCK_NEWS);
      setDataSource('mock');
    }
    
    setLastUpdated(new Date().toLocaleString('vi-VN'));
    setIsLoading(false);
  };

  const handleReset = () => {
    setNews(MOCK_NEWS);
    setDataSource('mock');
    setLastUpdated(new Date().toLocaleString('vi-VN'));
  };

  // Calculate Quick Stats
  const stats = {
    events: news.length,
    deaths: news.reduce((acc, item) => {
      // Very basic regex to extract deaths for demo. In production, use robust NLP.
      const match = item.damage.match(/(\d+)\s+(người\s)?chết/);
      return acc + (match ? parseInt(match[1]) : 0);
    }, 0),
    loss: news.reduce((acc, item) => {
      const match = item.damage.match(/(\d+)\s+tỷ/);
      return acc + (match ? parseInt(match[1]) : 0);
    }, 0)
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        
        {/* Dashboard Controls & Stats */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Tổng quan tình hình</h2>
              <p className="text-sm text-slate-500">
                Cập nhật lúc: <span className="font-mono font-medium text-slate-700">{lastUpdated}</span> 
                {dataSource === 'mock' && <span className="ml-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">(Dữ liệu mô phỏng 2025)</span>}
                {dataSource === 'live' && <span className="ml-2 text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold">(Dữ liệu thực tế từ AI)</span>}
              </p>
            </div>
            <div className="flex space-x-2">
               <button 
                onClick={handleReset}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                Xem kịch bản 2025
              </button>
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang quét tin...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Cập nhật thời gian thực
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Sự kiện ghi nhận" value={stats.events} color="blue" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <StatCard label="Thiệt hại về người" value={stats.deaths} unit="người" color="red" icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            <StatCard label="Thiệt hại kinh tế (ước tính)" value={stats.loss > 0 ? stats.loss : '--'} unit="tỷ VNĐ" color="amber" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Nguồn tin theo dõi" value={NEWSPAPER_SOURCES.length} color="slate" icon="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: News Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-bold text-slate-800 flex items-center">
                 <span className="w-2 h-6 bg-red-600 rounded-full mr-2"></span>
                 Tin tức mới nhất
               </h3>
               <div className="flex space-x-2 text-xs">
                 <span className="px-2 py-1 bg-white border rounded text-slate-600">Tất cả</span>
                 <span className="px-2 py-1 bg-white border rounded text-slate-600 hover:bg-slate-50 cursor-pointer">Bão lũ</span>
                 <span className="px-2 py-1 bg-white border rounded text-slate-600 hover:bg-slate-50 cursor-pointer">Sạt lở</span>
               </div>
            </div>
            <NewsFeed news={news} isLoading={isLoading} />
          </div>

          {/* Right Column: Analysis & Map Placeholder */}
          <div className="space-y-6">
            <AnalysisCharts news={news} />
            
            {/* Sources List */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Nguồn dữ liệu ({NEWSPAPER_SOURCES.length})</h3>
               <div className="flex flex-wrap gap-2">
                 {NEWSPAPER_SOURCES.map((source, idx) => (
                   <span key={idx} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors cursor-default">
                     {source}
                   </span>
                 ))}
               </div>
            </div>
          </div>

        </div>
      </main>
      
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2025 VnDisasterWatch. Dự án tổng hợp tin tức thiên tai phi lợi nhuận.</p>
          <p className="mt-2 text-xs">Dữ liệu được thu thập tự động từ các báo điện tử Việt Nam và Google Search.</p>
        </div>
      </footer>
    </div>
  );
};

// Helper Component for Stats
const StatCard: React.FC<{ label: string, value: number | string, unit?: string, color: string, icon: string }> = ({ label, value, unit, color, icon }) => {
  const colorClasses: {[key: string]: string} = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600'
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-slate-900">{value}</span>
          {unit && <span className="ml-1 text-sm text-slate-500 font-medium">{unit}</span>}
        </div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
    </div>
  );
};

export default App;