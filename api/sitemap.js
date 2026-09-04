function hostname(req){
  const raw=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
  return raw.split(',')[0].trim().split(':')[0];
}

function siteFor(host){
  if(host==='church402.org'||host==='www.church402.org') return {
    origin:'https://church402.org',
    paths:['/','/zh-CN','/bible','/prophet']
  };
  if(host==='milliapi.com'||host==='www.milliapi.com') return {
    origin:'https://milliapi.com',
    paths:['/','/zh-CN','/learning.html','/ai-web-readiness-audit','/llms-txt-audit','/robots-txt-ai-crawler-audit','/x402-seller-audit']
  };
  return {origin:null,paths:[]};
}

function escapeXml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
function url(origin,path){return path==='/'?`${origin}/`:`${origin}${path}`;}

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  const site=siteFor(hostname(req));
  const urls=site.paths.map((path,index)=>`  <url>\n    <loc>${escapeXml(url(site.origin,path))}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${index===0?'1.0':'0.6'}</priority>\n  </url>`).join('\n');
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  res.setHeader('Content-Type','application/xml; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary','Host');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
