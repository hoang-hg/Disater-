import { GoogleGenAI } from "@google/genai";
import { NewsItem, DisasterType } from '../types';

// Giả định biến môi trường đã được cấu hình.
// Trong thực tế, bạn cần thêm FIRECRAWL_API_KEY vào file .env
const firecrawlKey = process.env.FIRECRAWL_API_KEY || '';
const googleKey = process.env.API_KEY || '';

export const isFirecrawlAvailable = () => !!firecrawlKey && !!googleKey;

export const fetchFirecrawlNews = async (): Promise<NewsItem[]> => {
  if (!firecrawlKey) {
    console.warn("Firecrawl API Key missing.");
    return [];
  }

  try {
    // 1. Sử dụng Firecrawl để tìm kiếm và lấy nội dung bài viết (Scrape)
    // Endpoint /v1/search cho phép tìm và lấy luôn nội dung markdown
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "tin tức thiên tai bão lũ sạt lở động đất Việt Nam mới nhất hôm nay",
        limit: 8, // Lấy 8 bài mới nhất
        scrapeOptions: {
          formats: ["markdown"], // Chỉ cần lấy markdown để tiết kiệm token
          onlyMainContent: true
        }
      })
    });

    const firecrawlData = await firecrawlResponse.json();

    if (!firecrawlData.success || !firecrawlData.data || firecrawlData.data.length === 0) {
      console.error("Firecrawl không tìm thấy dữ liệu:", firecrawlData);
      return [];
    }

    // 2. Chuẩn bị dữ liệu thô để gửi cho Gemini
    // Chúng ta ghép nối các bài viết lại thành một context lớn
    const articlesContext = firecrawlData.data.map((item: any, index: number) => `
--- BÀI BÁO SỐ ${index + 1} ---
Tiêu đề: ${item.metadata?.title || 'Không rõ'}
Nguồn: ${item.metadata?.sourceURL || 'Không rõ'}
Ngày (metadata): ${item.metadata?.date || 'Không rõ'}
Nội dung tóm tắt:
${item.markdown ? item.markdown.substring(0, 3000) : 'Không có nội dung'}
`).join('\n\n');

    // 3. Sử dụng Gemini để trích xuất thông tin có cấu trúc (Structured Data Extraction)
    const ai = new GoogleGenAI({ apiKey: googleKey });
    const prompt = `
      Dưới đây là nội dung thô của các bài báo về thiên tai tại Việt Nam được thu thập từ Firecrawl.
      Nhiệm vụ của bạn là phân tích văn bản và trích xuất thành danh sách JSON các sự kiện thiên tai.

      Yêu cầu xử lý:
      1. Chỉ chọn các tin tức về thiên tai (bão, lũ, sạt lở, động đất, hạn hán) tại Việt Nam.
      2. Bỏ qua các tin dự báo thời tiết thông thường (trừ khi là cảnh báo bão khẩn cấp).
      3. Trích xuất chính xác số liệu thiệt hại nếu có.
      4. Định dạng ngày tháng chuẩn YYYY-MM-DD.
      
      Dữ liệu đầu vào:
      ${articlesContext}

      Output JSON Schema (Array):
      [
        {
          "title": "String",
          "source": "String (Tên báo)",
          "sourceUrl": "String",
          "date": "String (YYYY-MM-DD)",
          "type": "Enum (FLOOD, STORM, LANDSLIDE, EARTHQUAKE, DROUGHT, OTHER)",
          "location": "String",
          "damage": "String (Tóm tắt ngắn gọn)",
          "summary": "String (Tóm tắt < 30 từ)",
          "isVerified": Boolean (true nếu có trích dẫn cơ quan chức năng),
          "agency": "String (Tên cơ quan chức năng nếu có)"
        }
      ]
    `;

    const generatedContent = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = generatedContent.text;
    if (!text) return [];

    const parsedItems = JSON.parse(text);

    // Map dữ liệu về đúng format của App
    return parsedItems.map((item: any, index: number) => ({
      id: `fc-${Date.now()}-${index}`,
      title: item.title,
      source: item.source || extractSourceFromUrl(item.sourceUrl),
      sourceUrl: item.sourceUrl,
      date: item.date,
      type: mapType(item.type),
      location: item.location,
      damage: item.damage,
      summary: item.summary,
      isVerified: item.isVerified,
      agency: item.agency
    }));

  } catch (error) {
    console.error("Lỗi khi xử lý với Firecrawl + Gemini:", error);
    return [];
  }
};

// Helper function
const extractSourceFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'Nguồn Internet';
  }
};

const mapType = (typeStr: string): DisasterType => {
  switch (typeStr) {
    case 'FLOOD': return DisasterType.FLOOD;
    case 'STORM': return DisasterType.STORM;
    case 'LANDSLIDE': return DisasterType.LANDSLIDE;
    case 'EARTHQUAKE': return DisasterType.EARTHQUAKE;
    case 'DROUGHT': return DisasterType.DROUGHT;
    default: return DisasterType.OTHER;
  }
};
