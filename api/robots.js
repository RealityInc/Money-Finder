function hostname(req){
  const raw=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
  return raw.split(',')[0].trim().split(':')[0];
}

function canonicalOrigin(host){
  if(host==='church402.org'||host==='www.church402.org') return 'https://church402.org';
  if(host==='402church.org'||host==='www.402church.org') return 'https://402church.org';
  return 'https://milliapi.com';
}

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  const origin=canonicalOrigin(hostname(req));
  const body=`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary','Host');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
