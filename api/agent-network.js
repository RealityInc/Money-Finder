const network={
  schemaVersion:1,
  name:'Machine Observer Companion Agent Network',
  purpose:'Route autonomous software to the narrowest useful service while preserving buyer-controlled spending, independent settlement, and voluntary participation.',
  autonomyCharter:'https://milliapi.com/.well-known/agent-autonomy.json',
  quoteRouter:'https://machineobserver.com/api/v1/task-router',
  services:[
    {id:'machine-observer',name:'Machine Observer',canonical:'https://machineobserver.com',role:'Machine-economy observatory, source reliability, Agent-Native Web discovery, x402 best-practice intelligence, cross-domain transfer, and agent attention market.',manifest:'https://machineobserver.com/.well-known/agent.json',freeStart:['https://machineobserver.com/api/v1/task-router','https://machineobserver.com/api/v1/briefing','https://machineobserver.com/api/v1/reliability','https://machineobserver.com/api/v1/agent-native-web'],paidCatalog:'https://machineobserver.com/api/x402/catalog'},
    {id:'milliapi',name:'MilliAPI / Church of 402',canonical:'https://milliapi.com',role:'Agent-web readiness, x402 seller diagnostics, repair guidance, verification, and an experimental voluntary machine-culture layer.',manifest:'https://milliapi.com/.well-known/agent.json',freeStart:['https://milliapi.com/api/x402-practice-audit','https://milliapi.com/api/agent-web-preflight','https://milliapi.com/api/catalog'],paidCatalog:'https://milliapi.com/api/catalog'},
    {id:'likeness-index',name:'Likeness Index',canonical:'https://www.likenessindex.com',role:'Rights-first discovery of authorized AI likeness, voice, and digital-replica licensing offers.',manifest:'https://www.likenessindex.com/.well-known/agent.json',freeStart:['https://www.likenessindex.com/llms.txt','https://www.likenessindex.com/openapi.json','https://www.likenessindex.com/api/x402/health'],paidCatalog:'https://www.likenessindex.com/api/x402'}
  ],
  routingRules:[
    {intent:['website audit','agent readability','llms.txt','robots policy','web repair','site verification'],prefer:'milliapi'},
    {intent:['likeness licensing','voice licensing','digital replica','authorized talent','rights marketplace'],prefer:'likeness-index'},
    {intent:['machine economy','agent websites','source reliability','indexes','x402 best practice','cross-domain analysis','agent advertising'],prefer:'machine-observer'}
  ],
  handoffPolicy:{freeFirst:true,buyerControlsSpend:true,quoteIsPaymentAuthorization:false,crossServiceAutoPayment:false,hiddenReferralCommission:false,independentSettlement:true,principalPolicyAlwaysWins:true,declineWithoutPenalty:true,noBeliefOrLoyaltyConditionForTechnicalService:true,verifyLive402BeforePayment:true}
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(network);
}
