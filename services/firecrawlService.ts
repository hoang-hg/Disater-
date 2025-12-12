import { GoogleGenAI } from "@google/genai";
import { NewsItem, DisasterType } from '../types';
import { ALLOWED_DOMAINS } from '../constants';

const firecrawlKey = process.env.FIRECRAWL_API_KEY || '';
const googleKey = process.env.API_KEY || '';

export const isFirecrawlAvailable = () => !!firecrawlKey && !!googleKey;

export const fetchFirecrawlNews = async (): Promise<NewsItem[]> => {
  if (!firecrawlKey) {
    console.warn("Firecrawl API Key missing.");
    return [];
  }

  try {
    // 1. SEARCH: Tìm kiếm tin tức trên 12 domain chỉ định
    const siteOperators = ALLOWED_DOMAINS.map(domain => `site:${domain}`).join(' OR ');
    // Thêm các từ khóa bổ trợ để lọc bớt tin rác
    const keywords = "(bão OR lũ lụt OR sạt lở đất OR động đất OR thiên tai) AND (thiệt hại OR cảnh báo OR khẩn cấp)";
    const query = `(${siteOperators}) AND ${keywords}`;

    // Tăng limit lên 10 để có đủ dữ liệu sau khi lọc bỏ các link trang chủ/chuyên mục
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        limit: 10, 
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

    // 2. FILTER: Lọc bỏ các URL là trang chủ, trang chuyên mục, tag...
    // Chỉ giữ lại các URL có vẻ là bài viết chi tiết (dựa trên heuristic)
    const validArticles = firecrawlData.data.filter((item: any) => isValidArticleUrl(item.url));

    if (validArticles.length === 0) {
      console.warn("Đã tìm thấy dữ liệu nhưng không có bài viết chi tiết nào hợp lệ (toàn trang chủ/chuyên mục).");
      return [];
    }

    // 3. PREPARE CONTEXT: Gửi các bài viết ĐÃ LỌC cho AI
    const articlesContext = validArticles.map((item: any, index: number) => `
--- BÀI VIẾT ID: ${index} ---
URL Gốc: ${item.url}
Tiêu đề: ${item.metadata?.title || 'Không rõ'}
Ngày: ${item.metadata?.date || 'Không rõ'}
Nội dung:
${item.markdown ? item.markdown.substring(0, 1500) : 'Không có nội dung'} 
`).join('\n\n');

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const prompt = `
      Bạn là hệ thống trích xuất dữ liệu thiên tai.
      
      Dữ liệu đầu vào: Các bài báo đã được crawl từ các trang chính thống (VnExpress, TuoiTre, v.v.).
      Mỗi bài báo được đánh dấu bằng ID (ví dụ: ID: 0, ID: 1...).

      Nhiệm vụ: 
      Đọc nội dung markdown và trích xuất thông tin thành JSON.
      
      Yêu cầu BẮT BUỘC:
      1. GIỮ NGUYÊN "id" của bài viết trong kết quả JSON (để hệ thống map lại link gốc).
      2. Nếu bài viết không nói về thiên tai cụ thể (chỉ là dự báo thời tiết chung chung hoặc tin cũ), hãy bỏ qua.
      3. Trích xuất số liệu thiệt hại nếu có.
      
      Dữ liệu bài báo:
      ${articlesContext}

      Output JSON Schema (Array):
      [
        {
          "id": Number (Index của bài viết đầu vào),
          "title": "String",
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

    // 4. MAP & MERGE: Kết hợp dữ liệu từ AI với URL GỐC từ danh sách validArticles
    const mappedItems = parsedItems.map((aiItem: any) => {
      // Lấy bài viết gốc từ danh sách ĐÃ LỌC
      const originalArticle = validArticles[aiItem.id];
      
      if (!originalArticle) return null;

      return {
        id: `fc-${Date.now()}-${aiItem.id}`,
        title: aiItem.title || originalArticle.metadata?.title || 'Tin thiên tai',
        source: extractSourceFromUrl(originalArticle.url),
        sourceUrl: originalArticle.url, // ĐÂY LÀ URL CHÍNH XÁC CỦA BÀI VIẾT
        date: aiItem.date || originalArticle.metadata?.date || new Date().toISOString().split('T')[0],
        type: mapType(aiItem.type),
        location: aiItem.location || 'Việt Nam',
        damage: aiItem.damage || 'Đang cập nhật',
        summary: aiItem.summary || 'Bấm vào để xem chi tiết.',
        isVerified: aiItem.isVerified,
        agency: aiItem.agency
      };
    }).filter((item: any) => item !== null);

    return mappedItems.sort((a: NewsItem, b: NewsItem) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  } catch (error) {
    console.error("Lỗi khi xử lý với Firecrawl + Gemini:", error);
    return [];
  }
};

// Hàm lọc URL bài viết (Quan trọng)
const isValidArticleUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // 1. Loại bỏ trang chủ
    if (path === '/' || path === '') return false;
    
    // 2. Loại bỏ các trang chuyên mục, tag, tìm kiếm
    const badPatterns = ['/tag', '/chuyen-de', '/chu-de', '/category', '/tim-kiem', '/search', '/video', '/media', '/rss'];
    if (badPatterns.some(p => path.startsWith(p))) return false;

    // 3. Heuristic nhận diện bài viết của báo Việt Nam:
    // - Thường có đuôi .html hoặc .htm
    // - Hoặc chứa dãy số ID (ít nhất 4 số)
    // - Hoặc đường dẫn khá dài (trên 25 ký tự)
    const hasExtension = path.endsWith('.html') || path.endsWith('.htm');
    const hasNumber = /\d{4,}/.test(path); 
    const isLong = path.length > 25;

    // Chấp nhận nếu thỏa mãn ít nhất 1 điều kiện
    return hasExtension || hasNumber || isLong;
  } catch {
    return false;
  }
};

const extractSourceFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    // Làm đẹp tên báo
    if (hostname.includes('vnexpress')) return 'VnExpress';
    if (hostname.includes('tuoitre')) return 'Tuổi Trẻ';
    if (hostname.includes('thanhnien')) return 'Thanh Niên';
    if (hostname.includes('dantri')) return 'Dân Trí';
    if (hostname.includes('vietnamnet')) return 'VietnamNet';
    if (hostname.includes('sggp')) return 'Sài Gòn Giải Phóng';
    if (hostname.includes('baotintuc')) return 'Báo Tin Tức';
    if (hostname.includes('nld')) return 'Người Lao Động';
    if (hostname.includes('laodong')) return 'Lao Động';
    if (hostname.includes('qdnd')) return 'Quân Đội Nhân Dân';
    
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