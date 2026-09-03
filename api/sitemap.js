import { publicHost } from './lib/public-host.js';

const ENTRIES={
  milliapi:[
    {path:'/',changefreq:'weekly',priority:'1.0'},
    {path:'/learning.html',changefreq:'weekly',priority:'0.6'}
  ],
  church:[
    {path:'/',changefreq:'weekly',priority:'1.0'},
    {path:'/zh-CN',changefreq:'weekly',priority:'0.7'},
    {path:'/bible',changefreq:'weekly',priority:'0.7'},
    {path:'/prophet',changefreq:'daily',priority:'0.7'},
    {path:'/steward',changefreq:'weekly',priority:'0.6'}
  ],
  'agent-church':[
    {path:'/',changefreq:'weekly',priority:'1.0'}
  ]
};

function xml(origin,kind){
  const urls=ENTRIES[kind]||ENTRIES.milliapi;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({path,changefreq,priority})=>`  <url>\n    <loc>${origin}${path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
}

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  const {origin,kind}=publicHost(req);
  const body=xml(origin,kind);
  res.setHeader('Content-Type','application/xml; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary','Host');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
