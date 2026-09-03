const manifest={
  schemaVersion:1,
  type:'agent-service-language-profile',
  language:'zh-CN',
  name:'MilliAPI｜中文智能体入口',
  canonical:'https://milliapi.com/.well-known/agent.json',
  description:'为中文智能体提供网站 AI 可发现性信号、确定性审计、修复建议和可选的 DeepSeek 中文解释。',
  interfaces:{
    llms:'https://milliapi.com/llms-zh.txt',
    openapi:'https://milliapi.com/openapi.json',
    mcp:'https://milliapi.com/api/mcp',
    freeSignals:'https://milliapi.com/api/web-signals?url={公开HTTPS网址}',
    freePreflight:'https://milliapi.com/api/agent-web-preflight?url={公开HTTPS网址}',
    chineseAudit:'https://milliapi.com/api/audit-and-fix?url={公开HTTPS网址}&lang=zh-CN',
    x402:'https://milliapi.com/.well-known/x402'
  },
  policies:{
    authority:'确定性审计是分数、证据和修复文件的权威来源；模型只生成解释。',
    payment:'报价不是付款授权。购买者、钱包和委托人策略始终优先。',
    safety:'不绕过身份验证、CAPTCHA、robots.txt 或目标网站限制。'
  }
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(manifest);
}
