function hostname(req){
  const raw=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
  return raw.split(',')[0].trim().split(':')[0];
}

function siteFor(host){
  if(host==='milliapi.com'||host==='www.milliapi.com') return {mode:'index',origin:'https://milliapi.com'};
  if(host==='church402.org'||host==='www.church402.org') return {mode:'index',origin:'https://church402.org'};
  if(host==='402church.org'||host==='www.402church.org') return {mode:'crawl-only'};
  return {mode:'block'};
}

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return res.status(405).send('GET only');
  const site=siteFor(hostname(req));
  let body;
  if(site.mode==='index') body=`User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`;
  else if(site.mode==='crawl-only') body='User-agent: *\nAllow: /\n';
  else body='User-agent: *\nDisallow: /\n';
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary','Host');
  if(req.method==='HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
