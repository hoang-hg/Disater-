import { GoogleGenAI } from "@google/genai";
import { NewsItem, DisasterType } from '../types';

// Use a safe fallback if key is missing to prevent crash, though functionality will be limited
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const fetchLatestDisasterNews = async (): Promise<NewsItem[]> => {
  if (!apiKey) {
    console.warn("API Key not found. Returning mock data.");
    return [];
  }

  try {
    const model = 'gemini-2.5-flash';
    // Removed requirement for "pure JSON" to avoid confusion if model adds markdown, handled in code below.
    const prompt = `
      Hãy tìm kiếm các tin tức mới nhất về thiên tai (bão, lũ, sạt lở, động đất, hạn hán) tại Việt Nam trong 7 ngày qua.
      Ưu tiên các nguồn báo chính thống: VnExpress, Tuổi Trẻ, Thanh Niên, VTV, Tiền Phong, Dân Trí.
      
      Dựa trên kết quả tìm kiếm, hãy trích xuất và trả về một danh sách các sự kiện dưới dạng JSON Array.
      
      Cấu trúc JSON yêu cầu cho mỗi tin:
      [
        {
          "title": "Tiêu đề bài báo",
          "source": "Tên báo",
          "sourceUrl": "Link bài báo (lấy từ grounding)",
          "date": "YYYY-MM-DD",
          "type": "LOẠI_THIÊN_TAI (chỉ chọn một trong các mã: FLOOD, STORM, LANDSLIDE, EARTHQUAKE, DROUGHT, OTHER)",
          "location": "Địa điểm xảy ra",
          "damage": "Tóm tắt thiệt hại (ngắn gọn)",
          "summary": "Tóm tắt nội dung (dưới 30 từ)",
          "isVerified": true/false (dựa trên việc có trích dẫn cơ quan chức năng hay không),
          "agency": "Tên cơ quan xác nhận (nếu có)"
        }
      ]
      
      Quan trọng: Chỉ trả về JSON, không thêm lời dẫn, không giải thích.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType: "application/json" is NOT allowed with googleSearch tool
      }
    });

    let text = response.text;
    if (!text) return [];

    // Clean up markdown code blocks if present (Gemini might wrap JSON in ```json ... ```)
    // Also remove any leading/trailing whitespace
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '');
    }

    // Parse the JSON output
    try {
      const parsedData = JSON.parse(text);
      
      if (!Array.isArray(parsedData)) {
        console.warn("Gemini response is not an array:", parsedData);
        return [];
      }

      // Map to ensure types match our Enum
      return parsedData.map((item: any, index: number) => ({
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
    } catch (e) {
      console.error("Failed to parse Gemini JSON response", e);
      console.debug("Raw text was:", text);
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