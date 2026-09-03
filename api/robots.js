import { publicHost } from './lib/public-host.js';

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  const {origin}=publicHost(req);
  const body=`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary','Host');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
