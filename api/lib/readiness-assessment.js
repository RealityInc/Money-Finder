function recommendation(id, priority, issue, action, evidence) {
  return { id, priority, issue, action, evidence };
}

function evidence(id, status, observed) {
  return { id, status, observed };
}

export function buildReadinessAssessment({
  score,
  page,
  robotsPresent,
  robotsStatus,
  llmsPresent,
  llmsStatus,
  crawlerAccess,
}) {
  const crawlerEntries = Object.entries(crawlerAccess || {});
  const allowedCrawlers = crawlerEntries.filter(([, result]) => result?.allowed).map(([name]) => name);
  const blockedCrawlers = crawlerEntries.filter(([, result]) => result && !result.allowed).map(([name]) => name);
  const allTrackedCrawlersBlocked = crawlerEntries.length > 0 && allowedCrawlers.length === 0;

  const blockers = [];
  const recommendations = [];
  const evidenceItems = [];

  if (page?.noindex) {
    blockers.push({
      id: 'page_noindex',
      severity: 'critical',
      finding: 'The page declares noindex.',
      impact: 'Search and answer engines may intentionally exclude this page from indexing.'
    });
    recommendations.push(recommendation(
      'remove_noindex',
      'critical',
      'The page declares noindex.',
      'Remove noindex if this page is intended to be discoverable by search or answer engines.',
      page?.metaRobots || 'noindex detected'
    ));
  }

  if (allTrackedCrawlersBlocked) {
    blockers.push({
      id: 'all_ai_crawlers_blocked',
      severity: 'critical',
      finding: 'All tracked AI crawlers are blocked from the homepage by robots.txt rules.',
      impact: 'Major AI crawlers may be unable to retrieve the site through their normal crawling path.'
    });
    recommendations.push(recommendation(
      'allow_intended_ai_crawlers',
      'critical',
      'All tracked AI crawlers are blocked.',
      'Review robots.txt and explicitly allow the AI crawlers you want to serve.',
      blockedCrawlers.join(', ')
    ));
  } else if (blockedCrawlers.length > 0) {
    recommendations.push(recommendation(
      'review_partial_ai_blocks',
      'medium',
      'Some tracked AI crawlers are blocked.',
      'Confirm each crawler block is intentional; allow any crawler you want to reach the site.',
      blockedCrawlers.join(', ')
    ));
  }

  if (!robotsPresent) {
    recommendations.push(recommendation(
      'publish_robots_txt',
      'medium',
      'No readable robots.txt was found.',
      'Publish an explicit robots.txt so crawler policy is machine-readable and intentional.',
      `HTTP ${robotsStatus ?? 'unknown'}`
    ));
  }

  if (!llmsPresent) {
    recommendations.push(recommendation(
      'publish_llms_txt',
      'medium',
      'No readable llms.txt was found.',
      'Publish /llms.txt with concise site purpose, canonical resources, and agent-facing navigation.',
      `HTTP ${llmsStatus ?? 'unknown'}`
    ));
  }

  if (!page?.canonical) {
    recommendations.push(recommendation(
      'add_canonical',
      'high',
      'No canonical URL was detected.',
      'Add a canonical link element that identifies the preferred URL for this page.',
      'canonical missing'
    ));
  }

  if (!page?.description) {
    recommendations.push(recommendation(
      'add_meta_description',
      'medium',
      'No meta description was detected.',
      'Add a concise meta description that summarizes the page for search and answer systems.',
      'meta description missing'
    ));
  }

  if (!page?.openGraph?.title || !page?.openGraph?.description) {
    recommendations.push(recommendation(
      'complete_open_graph',
      'medium',
      'Open Graph title and description are incomplete.',
      'Add og:title and og:description; add og:image where social or agent previews matter.',
      JSON.stringify(page?.openGraph || {})
    ));
  }

  if (!(page?.jsonLdBlocks > 0)) {
    recommendations.push(recommendation(
      'add_structured_data',
      'medium',
      'No JSON-LD structured-data block was detected.',
      'Add relevant schema.org JSON-LD so machines can identify page entities and relationships explicitly.',
      '0 JSON-LD blocks'
    ));
  }

  if (!(page?.h1Count > 0)) {
    recommendations.push(recommendation(
      'add_h1',
      'low',
      'No H1 heading was detected.',
      'Add a clear primary heading that states the page topic.',
      '0 H1 elements'
    ));
  }

  evidenceItems.push(
    evidence('page_indexable', page?.noindex ? 'fail' : 'pass', { noindex: Boolean(page?.noindex), metaRobots: page?.metaRobots || null }),
    evidence('robots_txt', robotsPresent ? 'pass' : 'warn', { present: Boolean(robotsPresent), status: robotsStatus ?? null }),
    evidence('llms_txt', llmsPresent ? 'pass' : 'warn', { present: Boolean(llmsPresent), status: llmsStatus ?? null }),
    evidence('canonical', page?.canonical ? 'pass' : 'warn', { canonical: page?.canonical || null }),
    evidence('structured_data', page?.jsonLdBlocks > 0 ? 'pass' : 'warn', { jsonLdBlocks: page?.jsonLdBlocks || 0 }),
    evidence('open_graph', page?.openGraph?.title && page?.openGraph?.description ? 'pass' : 'warn', page?.openGraph || {}),
    evidence('crawler_access', allTrackedCrawlersBlocked ? 'fail' : blockedCrawlers.length ? 'warn' : 'pass', {
      allowed: allowedCrawlers,
      blocked: blockedCrawlers
    })
  );

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  let verdict;
  let agentRecommendation;
  if (blockers.length > 0) {
    verdict = 'blocked';
    agentRecommendation = 'fix_before_relying_on_discovery';
  } else if (score >= 85) {
    verdict = 'ready';
    agentRecommendation = 'ready_for_agent_discovery';
  } else if (score >= 70) {
    verdict = 'mostly_ready';
    agentRecommendation = 'usable_with_improvements';
  } else {
    verdict = 'needs_work';
    agentRecommendation = 'improve_before_prioritizing_discovery';
  }

  const summary = blockers.length
    ? `${blockers.length} blocking issue${blockers.length === 1 ? '' : 's'} detected; address these before relying on AI/search discovery.`
    : recommendations.length
      ? `No blocking issue detected. ${recommendations.length} improvement${recommendations.length === 1 ? '' : 's'} are prioritized below.`
      : 'No material readiness issues detected by this audit.';

  return {
    verdict,
    agentRecommendation,
    summary,
    blockers,
    recommendations,
    evidence: evidenceItems,
    checksBundled: [
      'page_metadata',
      'canonical_and_indexability',
      'open_graph',
      'json_ld_presence',
      'heading_structure',
      'robots_txt',
      'llms_txt',
      'major_ai_crawler_homepage_access'
    ]
  };
}
