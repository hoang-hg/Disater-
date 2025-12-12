import { DisasterType, NewsItem } from './types';

export const NEWSPAPER_SOURCES = [
  "VnExpress", "Tuổi Trẻ", "Thanh Niên", "VietnamNet", 
  "Dân Trí", "Sài Gòn Giải Phóng", "Người Lao Động", 
  "Lao Động", "Báo Tin Tức (TTXVN)", "Báo Mới", 
  "Quân Đội Nhân Dân", "VietnamPlus"
];

// Mock data based on the "2025 Scenario" described in the prompt
export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '43 người chết, thiệt hại hơn 3.000 tỷ đồng do mưa lũ',
    source: 'VnExpress',
    sourceUrl: 'https://vnexpress.net',
    date: '2025-11-21',
    type: DisasterType.FLOOD,
    location: 'Nam Trung Bộ (Khánh Hòa, Gia Lai)',
    damage: '43 chết, 9 mất tích, 3000 tỷ đồng',
    summary: 'Mưa lũ lịch sử gây thiệt hại nghiêm trọng tại các tỉnh Nam Trung Bộ.',
    isVerified: true,
    agency: 'Cục QL Đê điều & PCTT'
  },
  {
    id: '2',
    title: 'Lũ dữ tàn phá Nam Trung Bộ, hàng triệu tấm lòng hướng về vùng tâm lũ',
    source: 'VietNamNet',
    sourceUrl: 'https://vietnamnet.vn',
    date: '2025-11-24',
    type: DisasterType.FLOOD,
    location: 'Nam Trung Bộ',
    damage: '91 chết, 11 mất tích, 13000 tỷ đồng',
    summary: 'Cập nhật tình hình lũ lụt và công tác cứu trợ tại các tỉnh bị ảnh hưởng.',
    isVerified: false,
    agency: 'Tổng hợp địa phương'
  },
  {
    id: '3',
    title: 'Lũ quét trôi luôn cả làng, nhưng không thiệt hại về người',
    source: 'Dân Trí',
    sourceUrl: 'https://dantri.com.vn',
    date: '2025-12-12',
    type: DisasterType.LANDSLIDE,
    location: 'Kỳ Sơn, Nghệ An',
    damage: '200 nhà trôi, 0 người chết',
    summary: 'Phép màu tại xã Mỹ Lý khi sơ tán kịp thời trước khi lũ quét ập đến.',
    isVerified: true,
    agency: 'Sở NN&MT Nghệ An'
  },
  {
    id: '4',
    title: 'Động đất mạnh 4,9 độ ở Quảng Ngãi lúc rạng sáng',
    source: 'Tuổi Trẻ',
    sourceUrl: 'https://tuoitre.vn',
    date: '2025-10-06',
    type: DisasterType.EARTHQUAKE,
    location: 'Kon Plông / Quảng Ngãi',
    damage: 'Chưa ghi nhận thiệt hại',
    summary: 'Rung chấn mạnh 4.9 độ richter, cảm nhận rõ tại các tỉnh lân cận.',
    isVerified: true,
    agency: 'Viện Vật lý Địa cầu'
  },
  {
    id: '5',
    title: 'Sau mưa lũ, người dân miền Trung khẩn trương ứng phó bão số 15',
    source: 'Sài Gòn Giải Phóng',
    sourceUrl: 'https://sggp.org.vn',
    date: '2025-11-26',
    type: DisasterType.STORM,
    location: 'Miền Trung',
    damage: 'Nguy cơ cao',
    summary: 'Vừa dứt lũ, miền Trung lại chuẩn bị đón bão Koto (bão số 15).',
    isVerified: true,
    agency: 'Trung tâm Dự báo KTTV'
  }
];

export const COLORS = {
  [DisasterType.FLOOD]: '#3b82f6', // blue-500
  [DisasterType.STORM]: '#eab308', // yellow-500
  [DisasterType.LANDSLIDE]: '#ef4444', // red-500
  [DisasterType.EARTHQUAKE]: '#a855f7', // purple-500
  [DisasterType.DROUGHT]: '#f97316', // orange-500
  [DisasterType.OTHER]: '#64748b', // slate-500
};