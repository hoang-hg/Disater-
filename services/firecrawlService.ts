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
    // OPTIMIZATION: Giảm limit xuống 4 để tăng tốc độ phản hồi (tránh timeout khi scrape quá nhiều trang)
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "tin tức thiên tai bão lũ sạt lở động đất Việt Nam mới nhất hôm nay",
        limit: 4, 
        scrapeOptions: {
          formats: ["markdown"],
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
    const articlesContext = firecrawlData.data.map((item: any, index: number) => `
--- BÀI BÁO SỐ ${index + 1} ---
Tiêu đề: ${item.metadata?.title || 'Không rõ'}
Nguồn: ${item.metadata?.sourceURL || 'Không rõ'}
Ngày (metadata): ${item.metadata?.date || 'Không rõ'}
Nội dung tóm tắt:
${item.markdown ? item.markdown.substring(0, 2500) : 'Không có nội dung'} 
`).join('\n\n'); // Giới hạn ký tự mỗi bài để giảm token input cho Gemini

    // 3. Sử dụng Gemini để trích xuất thông tin có cấu trúc
    const ai = new GoogleGenAI({ apiKey: googleKey });
    const prompt = `
      Dưới đây là nội dung thô của các bài báo về thiên tai tại Việt Nam.
      Hãy phân tích và trích xuất danh sách JSON các sự kiện thiên tai.

      Yêu cầu:
      1. Chỉ chọn tin thiên tai (bão, lũ, sạt lở, động đất, hạn hán) tại Việt Nam.
      2. Trích xuất số liệu thiệt hại cụ thể.
      3. Ngày tháng định dạng YYYY-MM-DD.
      
      Dữ liệu:
      ${articlesContext}

      Output JSON Schema (Array):
      [
        {
          "title": "String",
          "source": "String",
          "sourceUrl": "String",
          "date": "String",
          "type": "Enum (FLOOD, STORM, LANDSLIDE, EARTHQUAKE, DROUGHT, OTHER)",
          "location": "String",
          "damage": "String",
          "summary": "String",
          "isVerified": Boolean,
          "agency": "String"
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