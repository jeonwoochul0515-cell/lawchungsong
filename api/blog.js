// 네이버 블로그 RSS를 서버에서 가져와 최신 글을 JSON으로 반환 (브라우저 CORS 우회 + 엣지 캐시)
const FEED = 'https://rss.blog.naver.com/lawchungsong.xml';

function decode(s) {
  return s
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>'));
  return m ? decode(m[1]) : '';
}

module.exports = async (req, res) => {
  try {
    const r = await fetch(FEED, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CheongsongSite/1.0)' } });
    const xml = await r.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const items = blocks.slice(0, 3).map((b) => ({
      title: tag(b, 'title'),
      link: tag(b, 'link').replace(/\?fromRss=true&trackingCode=rss/, ''),
      pubDate: tag(b, 'pubDate'),
      category: tag(b, 'category'),
    }));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ items });
  } catch (e) {
    res.status(200).json({ items: [], error: true });
  }
};
