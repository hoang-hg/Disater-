import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { NewsItem, DisasterType } from '../types';
import { ALLOWED_DOMAINS, SOURCE_ENTRY_POINTS } from '../constants';

const firecrawlKey = process.env.FIRECRAWL_API_KEY || '';
const googleKey = process.env.API_KEY || '';

export const isFirecrawlAvailable = () => !!firecrawlKey && !!googleKey;

/**
 * QUY TRÌNH MỚI: MAP -> SCRAPE -> ANALYZE
 */
export const fetchFirecrawlNews = async (): Promise<NewsItem[]> => {
  if (!firecrawlKey) {
    console.warn("Firecrawl API Key missing.");
    return [];
  }

  try {
    // 1. Chọn ngẫu nhiên 2-3 domain để quét
    const shuffledDomains = [...ALLOWED_DOMAINS].sort(() => 0.5 - Math.random()).slice(0, 3);
    const targetUrls = shuffledDomains.map(d => SOURCE_ENTRY_POINTS[d] || `https://${d}`);

    console.log("Đang quét Map các trang:", targetUrls);

    // 2. Chạy Map song song
    const mapPromises = targetUrls.map(url => mapSiteForLinks(url));
    const mapResults = await Promise.all(mapPromises);

    let foundLinks: string[] = [];
    mapResults.forEach(links => {
      foundLinks = [...foundLinks, ...links.slice(0, 3)]; // Lấy 3 link mỗi trang
    });

    foundLinks = [...new Set(foundLinks)];

    if (foundLinks.length === 0) {
      console.warn("Không tìm thấy link bài viết nào qua Map.");
      return [];
    }

    console.log("Tìm thấy các link bài viết:", foundLinks);

    // 3. Batch Scrape
    const scrapedData = await batchScrapeUrls(foundLinks);

    if (scrapedData.length === 0) return [];

    // 4. Chuẩn bị context
    const articlesContext = scrapedData.map((item: any, index: number) => `
--- BÀI VIẾT ID: ${index} ---
URL Gốc: ${item.metadata?.sourceURL || item.url}
Tiêu đề: ${item.metadata?.title || 'Không rõ'}
Ngày: ${item.metadata?.date || 'Không rõ'}
Nội dung:
${item.markdown ? item.markdown.substring(0, 3000) : 'Không có nội dung'} 
`).join('\n\n');

    // 5. Gửi cho Gemini
    const ai = new GoogleGenAI({ apiKey: googleKey });
    const prompt = `
      Bạn là hệ thống trích xuất dữ liệu thiên tai từ tin tức.
      
      NHIỆM VỤ:
      Phân tích nội dung Markdown và trích xuất thông tin thành JSON.
      
      YÊU CẦU QUAN TRỌNG:
      1. GIỮ NGUYÊN "id" (Index từ input) để map ngược lại URL gốc.
      2. Chỉ lấy tin về: Bão, Lũ lụt, Sạt lở, Động đất, Hạn hán, Thiên tai nghiêm trọng.
      3. Bỏ qua tin dự báo thời tiết hàng ngày bình thường hoặc tin không liên quan.
      4. NẾU KHÔNG CÓ TIN PHÙ HỢP, TRẢ VỀ MẢNG RỖNG []. 
      5. TUYỆT ĐỐI KHÔNG TRẢ LỜI BẰNG VĂN BẢN (như "Rất tiếc...", "Tôi không thể..."). CHỈ TRẢ VỀ JSON.

      Input Data:
      ${articlesContext}

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

    // Cấu hình safety để tránh chặn tin tức về thảm họa (thường có từ ngữ tiêu cực/bạo lực mô tả thiệt hại)
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const generatedContent = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        safetySettings: safetySettings,
      }
    });

    let text = generatedContent.text;
    if (!text) return [];

    // Clean JSON string (remove markdown fences if present)
    text = text.trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');

    let parsedItems;
    try {
      parsedItems = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", text);
      return []; // Trả về rỗng an toàn thay vì crash
    }

    if (!Array.isArray(parsedItems)) return [];

    // 6. Map kết quả
    const mappedItems = parsedItems.map((aiItem: any) => {
      const originalArticle = scrapedData[aiItem.id];
      if (!originalArticle) return null;

      const finalUrl = originalArticle.metadata?.sourceURL || originalArticle.url;

      return {
        id: `fc-map-${Date.now()}-${aiItem.id}`,
        title: aiItem.title || originalArticle.metadata?.title || 'Tin thiên tai',
        source: extractSourceFromUrl(finalUrl),
        sourceUrl: finalUrl,
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
    console.error("Lỗi quy trình Map -> Scrape -> Gemini:", error);
    return [];
  }
};

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
        search: "thiên tai bão lũ sạt lở thiệt hại", 
        limit: 10,
        ignoreSitemap: true 
      })
    });
    
    const data = await response.json();
    if (!data.success || !data.links) return [];
    return data.links.filter((link: string) => isValidArticleUrl(link));
  } catch (e) {
    console.warn(`Lỗi map ${url} (có thể bỏ qua):`, e);
    return [];
  }
};

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
    console.warn("Lỗi batch scrape:", e);
    return [];
  }
};

const isValidArticleUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    if (path === '/' || path === '') return false;
    
    const badPatterns = ['/tag', '/chuyen-de', '/category', '/tim-kiem', '/search', '/rss', '/video', '/media'];
    if (badPatterns.some(p => path.startsWith(p))) return false;

    // Filter logic: Must look like an article
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