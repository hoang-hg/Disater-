import { GoogleGenAI } from "@google/genai";
import { NewsItem, DisasterType } from '../types';
import { ALLOWED_DOMAINS, SOURCE_ENTRY_POINTS } from '../constants';

const firecrawlKey = process.env.FIRECRAWL_API_KEY || '';
const googleKey = process.env.API_KEY || '';

export const isFirecrawlAvailable = () => !!firecrawlKey && !!googleKey;

/**
 * QUY TRÌNH MỚI: MAP -> SCRAPE -> ANALYZE
 * 1. Chọn ngẫu nhiên 3 domain từ danh sách (để tối ưu hiệu năng frontend).
 * 2. Dùng /v1/map để quét các link con chứa từ khóa "thiên tai/bão/lũ" từ các trang chuyên mục.
 * 3. Lấy Top URL hợp lệ nhất.
 * 4. Dùng /v1/batch/scrape để lấy nội dung chi tiết.
 * 5. Gửi cho Gemini phân tích.
 */
export const fetchFirecrawlNews = async (): Promise<NewsItem[]> => {
  if (!firecrawlKey) {
    console.warn("Firecrawl API Key missing.");
    return [];
  }

  try {
    // 1. Chọn ngẫu nhiên 3 domain để quét (tránh request quá nhiều cùng lúc)
    const shuffledDomains = [...ALLOWED_DOMAINS].sort(() => 0.5 - Math.random()).slice(0, 3);
    const targetUrls = shuffledDomains.map(d => SOURCE_ENTRY_POINTS[d] || `https://${d}`);

    console.log("Đang quét Map các trang:", targetUrls);

    // 2. Chạy Map song song để tìm Link bài viết
    const mapPromises = targetUrls.map(url => mapSiteForLinks(url));
    const mapResults = await Promise.all(mapPromises);

    // Gom tất cả link tìm được vào một mảng duy nhất
    let foundLinks: string[] = [];
    mapResults.forEach(links => {
      // Lấy tối đa 2 link mỗi trang để Scrape
      foundLinks = [...foundLinks, ...links.slice(0, 2)];
    });

    // Lọc trùng
    foundLinks = [...new Set(foundLinks)];

    if (foundLinks.length === 0) {
      console.warn("Không tìm thấy link bài viết nào qua Map.");
      return [];
    }

    console.log("Tìm thấy các link bài viết:", foundLinks);

    // 3. Batch Scrape nội dung các link này
    const scrapedData = await batchScrapeUrls(foundLinks);

    if (scrapedData.length === 0) return [];

    // 4. Chuẩn bị context cho AI
    const articlesContext = scrapedData.map((item: any, index: number) => `
--- BÀI VIẾT ID: ${index} ---
URL Gốc: ${item.metadata?.sourceURL || item.url}
Tiêu đề: ${item.metadata?.title || 'Không rõ'}
Ngày: ${item.metadata?.date || 'Không rõ'}
Nội dung:
${item.markdown ? item.markdown.substring(0, 2000) : 'Không có nội dung'} 
`).join('\n\n');

    // 5. Gửi cho Gemini
    const ai = new GoogleGenAI({ apiKey: googleKey });
    const prompt = `
      Bạn là hệ thống trích xuất dữ liệu thiên tai.
      Dữ liệu đầu vào là nội dung Markdown từ các bài báo thật.
      
      Nhiệm vụ: Trích xuất thông tin thành JSON.
      
      QUAN TRỌNG:
      1. GIỮ NGUYÊN "id" (Index) để map ngược lại URL gốc.
      2. Trích xuất chính xác Loại thiên tai, Địa điểm, Thiệt hại.
      3. Nếu bài viết không liên quan đến thiên tai, bão lũ, sạt lở... hãy BỎ QUA.

      Output JSON Schema (Array):
      [
        {
          "id": Number,
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
      contents: prompt + "\n\n" + articlesContext,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = generatedContent.text;
    if (!text) return [];

    const parsedItems = JSON.parse(text);

    // 6. Map kết quả AI với URL gốc từ dữ liệu Scrape
    const mappedItems = parsedItems.map((aiItem: any) => {
      const originalArticle = scrapedData[aiItem.id];
      if (!originalArticle) return null;

      // URL chính xác từ kết quả scrape (hoặc map)
      const finalUrl = originalArticle.metadata?.sourceURL || originalArticle.url;

      return {
        id: `fc-map-${Date.now()}-${aiItem.id}`,
        title: aiItem.title || originalArticle.metadata?.title || 'Tin thiên tai',
        source: extractSourceFromUrl(finalUrl),
        sourceUrl: finalUrl, // URL CHÍNH XÁC 100%
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
    console.error("Lỗi quy trình Map -> Scrape:", error);
    return [];
  }
};

// --- HÀM HỖ TRỢ FIRECRAWL ---

// 1. Sử dụng /v1/map để tìm link con
const mapSiteForLinks = async (url: string): Promise<string[]> => {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        search: "thiên tai bão lũ sạt lở", // Chỉ tìm link có chứa từ khóa này
        limit: 10, // Chỉ lấy 10 link để lọc
        ignoreSitemap: true // Quét trực tiếp trang
      })
    });
    
    const data = await response.json();
    if (!data.success || !data.links) return [];

    // Lọc lại link một lần nữa để đảm bảo chất lượng
    return data.links.filter((link: string) => isValidArticleUrl(link));
  } catch (e) {
    console.error(`Lỗi map ${url}:`, e);
    return [];
  }
};

// 2. Sử dụng /v1/batch/scrape để lấy nội dung
const batchScrapeUrls = async (urls: string[]): Promise<any[]> => {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/batch/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: urls,
        formats: ["markdown"],
        onlyMainContent: true
      })
    });
    const data = await response.json();
    if (!data.success || !data.data) return [];
    return data.data;
  } catch (e) {
    console.error("Lỗi batch scrape:", e);
    return [];
  }
};

const isValidArticleUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    if (path === '/' || path === '') return false;
    
    // Loại bỏ trang chủ, tag, category
    const badPatterns = ['/tag', '/chuyen-de', '/category', '/tim-kiem', '/search', '/rss'];
    if (badPatterns.some(p => path.startsWith(p))) return false;

    // Phải có đuôi file hoặc số ID hoặc đường dẫn dài
    const hasExtension = path.endsWith('.html') || path.endsWith('.htm');
    const hasNumber = /\d{4,}/.test(path); 
    const isLong = path.length > 25;

    return hasExtension || hasNumber || isLong;
  } catch {
    return false;
  }
};

const extractSourceFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
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