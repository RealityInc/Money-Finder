function escapeHtml(value='') {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function artifact(id, recommendationId, title, { path, format, content, applyMode='candidate', confidence='high', notes=[] } = {}) {
  return { id, recommendationId, title, path, format, applyMode, confidence, content, notes };
}

export function buildRepairArtifacts(result) {
  const ids = new Set((result?.recommendations || []).map(item => item.id));
  const target = result?.target || '';
  let host = '';
  try { host = new URL(target).hostname; } catch {}
  const page = result?.page || {};
  const title = page.title || host || 'Website';
  const description = page.description || null;
  const artifacts = [];

  if (ids.has('add_canonical')) {
    artifacts.push(artifact('canonical_link','add_canonical','Canonical link element',{
      path:'<head>',format:'text/html',applyMode:'ready_to_apply',
      content:`<link rel="canonical" href="${escapeHtml(target)}">`,
      notes:['Uses the audited final URL as the preferred canonical candidate. Confirm if a different canonical is intentional.']
    }));
  }

  if (ids.has('publish_llms_txt')) {
    const lines = [`# ${title}`, '', `> Machine-readable navigation for ${title}.`, '', `- [Homepage](${target})`];
    if (description) lines.splice(2,1,`> ${description}`);
    artifacts.push(artifact('llms_txt_starter','publish_llms_txt','Starter llms.txt',{
      path:'/llms.txt',format:'text/markdown',applyMode:'ready_to_apply',
      content:lines.join('\n'),
      notes:['Starter file only; add the site’s highest-value canonical resources when available.']
    }));
  }

  if (ids.has('publish_robots_txt')) {
    artifacts.push(artifact('robots_txt_starter','publish_robots_txt','Explicit crawler-policy starter',{
      path:'/robots.txt',format:'text/plain',applyMode:'review_required',confidence:'medium',
      content:'User-agent: *\nAllow: /\n',
      notes:['Crawler policy is intent-sensitive. Review before publishing so this does not override a deliberate restriction.']
    }));
  }

  if (ids.has('allow_intended_ai_crawlers') || ids.has('review_partial_ai_blocks')) {
    const blocked = Object.entries(result?.aiCrawlerHomepageAccess || {}).filter(([,value]) => value && !value.allowed).map(([name]) => name);
    if (blocked.length) {
      artifacts.push(artifact('ai_crawler_allow_rules', ids.has('allow_intended_ai_crawlers')?'allow_intended_ai_crawlers':'review_partial_ai_blocks','Candidate AI crawler allow rules',{
        path:'/robots.txt',format:'text/plain',applyMode:'review_required',confidence:'medium',
        content:blocked.map(name => `User-agent: ${name}\nAllow: /`).join('\n\n') + '\n',
        notes:['Only apply for crawlers the site owner actually intends to permit. Existing more-specific robots rules can still affect behavior.']
      }));
    }
  }

  if (ids.has('add_structured_data')) {
    const jsonLd = {
      '@context':'https://schema.org',
      '@type':'WebSite',
      name:title,
      url:target
    };
    artifacts.push(artifact('website_json_ld','add_structured_data','Schema.org WebSite JSON-LD',{
      path:'<head> or <body>',format:'application/ld+json',applyMode:'ready_to_apply',
      content:`<script type="application/ld+json">\n${JSON.stringify(jsonLd,null,2)}\n</script>`,
      notes:['Uses only facts already observed from the page: title/name and final URL. Add richer schema types when the page entity is known.']
    }));
  }

  if (ids.has('complete_open_graph')) {
    const lines = [];
    if (!page?.openGraph?.title) lines.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
    if (!page?.openGraph?.description && description) lines.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
    lines.push(`<meta property="og:url" content="${escapeHtml(target)}">`);
    artifacts.push(artifact('open_graph_tags','complete_open_graph','Open Graph tag candidate',{
      path:'<head>',format:'text/html',applyMode:description?'ready_to_apply':'fill_required',confidence:description?'high':'medium',
      content:lines.join('\n') + (description?'':'\n<meta property="og:description" content="{{concise page description}}">'),
      notes:description?['Derived from the existing page title, meta description, and final URL.']:['A truthful page description was not present, so og:description remains a placeholder rather than fabricated copy.']
    }));
  }

  if (ids.has('add_meta_description')) {
    artifacts.push(artifact('meta_description','add_meta_description','Meta description template',{
      path:'<head>',format:'text/html',applyMode:'fill_required',confidence:'medium',
      content:'<meta name="description" content="{{concise factual description of this page}}">',
      notes:['MilliAPI does not invent page claims when no source description exists. Fill this placeholder with factual site copy.']
    }));
  }

  if (ids.has('add_h1')) {
    artifacts.push(artifact('primary_h1','add_h1','Primary heading candidate',{
      path:'<body>',format:'text/html',applyMode:'ready_to_apply',confidence:'medium',
      content:`<h1>${escapeHtml(title)}</h1>`,
      notes:['Uses the observed document title as the heading candidate; adjust if the page topic differs.']
    }));
  }

  if (ids.has('remove_noindex')) {
    artifacts.push(artifact('indexability_meta','remove_noindex','Indexability meta candidate',{
      path:'<head>',format:'text/html',applyMode:'review_required',confidence:'high',
      content:'<meta name="robots" content="index,follow">',
      notes:['Only apply if public indexing is actually intended. Removing noindex can expose a page that was deliberately excluded.']
    }));
  }

  return {
    generatedAt:new Date().toISOString(),
    count:artifacts.length,
    readyToApply:artifacts.filter(item => item.applyMode==='ready_to_apply').length,
    reviewRequired:artifacts.filter(item => item.applyMode==='review_required').length,
    fillRequired:artifacts.filter(item => item.applyMode==='fill_required').length,
    artifacts
  };
}
