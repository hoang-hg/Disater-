import { GoogleGenAI } from "@google/genai";
import { NewsItem, DisasterType } from '../types';
import { ALLOWED_DOMAINS } from '../constants';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const fetchLatestDisasterNews = async (): Promise<NewsItem[]> => {
  if (!apiKey) {
    console.warn("API Key not found. Returning mock data.");
    return [];
  }

  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Thực hiện tìm kiếm Google về: "tin tức thiên tai bão lũ sạt lở động đất Việt Nam mới nhất".
      
      PHẠM VI: Chỉ lấy thông tin từ các trang web: [${ALLOWED_DOMAINS.join(', ')}].
      
      Yêu cầu nghiêm ngặt về Link (sourceUrl):
      1. TUYỆT ĐỐI KHÔNG dùng link trang chủ (ví dụ: https://vnexpress.net là SAI).
      2. Link phải dẫn trực tiếp đến bài viết cụ thể (ví dụ: https://vnexpress.net/bao-so-3-gay-mua-lon-4789123.html là ĐÚNG).
      3. Nếu không tìm được link bài viết cụ thể, hãy BỎ QUA tin đó.

      Output JSON Schema (Array):
      [
        {
          "title": "String",
          "source": "String",
          "sourceUrl": "String (Link bài viết cụ thể)",
          "date": "String (YYYY-MM-DD)",
          "type": "Enum (FLOOD, STORM, LANDSLIDE, EARTHQUAKE, DROUGHT, OTHER)",
          "location": "String",
          "damage": "String",
          "summary": "String",
          "isVerified": Boolean,
          "agency": "String"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text;
    if (!text) return [];

    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '');
    }

    try {
      const parsedData = JSON.parse(text);
      
      if (!Array.isArray(parsedData)) {
        return [];
      }

      // Lọc lại lần nữa ở client để chắc chắn không có link trang chủ
      const validItems = parsedData.filter((item: any) => {
        return item.sourceUrl && item.sourceUrl.length > 25 && !item.sourceUrl.endsWith('.vn/') && !item.sourceUrl.endsWith('.net/');
      });

      const mapped = validItems.map((item: any, index: number) => ({
        id: `gen-${Date.now()}-${index}`,
        title: item.title,
        source: item.source,
        sourceUrl: item.sourceUrl || '#',
        date: item.date,
        type: mapType(item.type),
        location: item.location,
        damage: item.damage,
        summary: item.summary,
        isVerified: item.isVerified,
        agency: item.agency
      }));

      return mapped.sort((a: NewsItem, b: NewsItem) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    } catch (e) {
      console.error("Failed to parse Gemini JSON response", e);
      return [];
    }

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
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