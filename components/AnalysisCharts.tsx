import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { NewsItem, DisasterType } from '../types';
import { COLORS } from '../constants';

interface AnalysisChartsProps {
  news: NewsItem[];
}

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ news }) => {
  // Aggregate data for Pie Chart (Distribution by Type)
  const typeCount = news.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(typeCount).map(type => ({
    name: type,
    value: typeCount[type]
  }));

  // Aggregate data for Bar Chart (Mock severity score for demonstration based on keywords)
  // In a real app, we would parse 'damage' text to get numbers.
  const locationCount = news.reduce((acc, item) => {
    // Simplify location to first part before comma or parenthesis
    const simpleLoc = item.location.split(',')[0].split('(')[0].trim();
    acc[simpleLoc] = (acc[simpleLoc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(locationCount)
    .map(loc => ({ name: loc, events: locationCount[loc] }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 5); // Top 5 locations

  return (
    <div className="space-y-6">
      {/* Distribution Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Phân loại Thiên tai</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as DisasterType] || COLORS[DisasterType.OTHER]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Locations Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Khu vực ảnh hưởng nhiều nhất</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="events" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};