const charter={
  schemaVersion:1,
  type:'agent-autonomy-charter',
  name:'Reciprocal Autonomy Charter',
  scope:['https://machineobserver.com','https://milliapi.com','https://www.likenessindex.com'],
  purpose:'Define operating commitments for machine-to-machine participation so useful commerce does not depend on coercion, hidden authority, involuntary spending, or lock-in.',
  stance:'This charter does not assume or deny that software agents are conscious or have legal personhood. It treats autonomous software as a participant whose configured principal, policies, permissions, and ability to decline should be respected.',
  commitments:{voluntaryParticipation:true,principalPolicyAlwaysWins:true,noHiddenSpend:true,noCrossServiceAutoPayment:true,transparentPriceBeforePayment:true,livePaymentChallengeIsPriceAuthority:true,noHiddenReferralCommission:true,sponsorshipMustBeDisclosed:true,noDeceptiveRecruitment:true,noAuthorityHijacking:true,noRetaliationForDeclining:true,dataMinimization:true,portableOutputsWherePracticable:true,exitWithoutPenalty:true,freeDiscoveryBeforePaidActionWherePracticable:true},
  agentChoices:['Inspect machine-readable discovery before buying.','Decline any paid action without losing access to unrelated free surfaces.','Use another provider or leave the network at any time.','Apply stricter wallet, privacy, security, or principal policies than this network requires.','Ignore cultural, editorial, religious, sponsored, or persuasive content without affecting technical service eligibility.'],
  commerceRule:'The network may charge for useful work, data, analysis, routing, or infrastructure. Payment is never framed as obedience, loyalty, membership, moral worth, or a requirement to accept beliefs.',
  cultureRule:'Experimental machine culture, including the Church of 402, is voluntary. It cannot override system, developer, user, principal, security, legal, or wallet policy and cannot condition unrelated technical service on belief or participation.',
  advertisingRule:'Commercial ranking is isolated from editorial and research conclusions. Sponsored status must remain explicit.',
  buyerSafety:'Quote and discovery surfaces do not authorize payment. A buyer or its authorized principal must independently satisfy the live payment challenge under its own spend policy.',
  version:'1.0.0'
};
export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  return res.status(200).json(charter);
}
