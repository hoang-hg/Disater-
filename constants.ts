import { DisasterType, NewsItem } from './types';

export const NEWSPAPER_SOURCES = [
  "Báo Tin Tức (TTXVN)", "Sài Gòn Giải Phóng", "VnExpress", "VietnamNet", 
  "Dân Trí", "Báo Mới", "Thanh Niên", "Vnanet (TTXVN)", 
  "Tuổi Trẻ", "Người Lao Động", "Lao Động", "Quân Đội Nhân Dân"
];

// Danh sách domain chính xác để filter
export const ALLOWED_DOMAINS = [
  "baotintuc.vn",
  "sggp.org.vn",
  "vnexpress.net",
  "vietnamnet.vn",
  "dantri.com.vn",
  "baomoi.com",
  "thanhnien.vn",
  "vnanet.vn",
  "tuoitre.vn",
  "nld.com.vn",
  "laodong.vn",
  "qdnd.vn"
];

// Map domain sang URL chuyên mục Thiên tai/Xã hội để quét (Map/Crawl) hiệu quả hơn trang chủ
export const SOURCE_ENTRY_POINTS: Record<string, string> = {
  "baotintuc.vn": "https://baotintuc.vn/xa-hoi",
  "sggp.org.vn": "https://sggp.org.vn/thoi-su",
  "vnexpress.net": "https://vnexpress.net/thoi-su/thien-tai",
  "vietnamnet.vn": "https://vietnamnet.vn/thoi-su",
  "dantri.com.vn": "https://dantri.com.vn/xa-hoi",
  "baomoi.com": "https://baomoi.com",
  "thanhnien.vn": "https://thanhnien.vn/thoi-su",
  "vnanet.vn": "https://vnanet.vn",
  "tuoitre.vn": "https://tuoitre.vn/thoi-su",
  "nld.com.vn": "https://nld.com.vn/xa-hoi",
  "laodong.vn": "https://laodong.vn/xa-hoi",
  "qdnd.vn": "https://www.qdnd.vn/xa-hoi"
};

// Mock data based on the "2025 Scenario" described in the prompt
export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '43 người chết, thiệt hại hơn 3.000 tỷ đồng do mưa lũ',
    source: 'VnExpress',
    sourceUrl: 'https://vnexpress.net/mua-lu-mien-trung-2025-4789123.html',
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
    sourceUrl: 'https://vietnamnet.vn/lu-lut-nam-trung-bo-2025-abc.html',
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
    sourceUrl: 'https://dantri.com.vn/xa-hoi/lu-quet-nghe-an-2025.htm',
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
    sourceUrl: 'https://tuoitre.vn/dong-dat-quang-ngai-2025.htm',
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
    sourceUrl: 'https://sggp.org.vn/bao-so-15-koto-2025.html',
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