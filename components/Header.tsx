import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-red-500/50 shadow-md animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">VnDisasterWatch</h1>
            <p className="text-xs text-slate-400">Hệ thống giám sát thiên tai thời gian thực</p>
          </div>
        </div>
        <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-300">
          <a href="#" className="hover:text-white transition-colors">Trang chủ</a>
          <a href="#" className="hover:text-white transition-colors">Bản đồ</a>
          <a href="#" className="hover:text-white transition-colors">Thống kê</a>
          <a href="#" className="hover:text-white transition-colors">Cảnh báo</a>
        </nav>
      </div>
    </header>
  );
};