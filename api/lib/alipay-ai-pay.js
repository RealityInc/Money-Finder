import { randomUUID } from 'node:crypto';

exportconst ALIPAY_PROTOCOL='A2M-402';

export function alipayStatus(){
  const sandbox=process.env.ALIPAY_ENV==='sandbox'&&process.env.ALIPAY_SANDBOX_ENABLED==='true';
  const production=process.env.ALIPAY_ENV==='production'&&Boolean(process.env.ALIPAY_APP_ID&&process.env.ALIPAY_PRIVATE_KEY&&process.env.ALIPAY_PUBLIC_KEY&&process.env.ALIPAY_SELLER_ID&&process.env.ALIPAY_SERVICE_ID);
  if(production) return 'credentials_present_verification_not_implemented';
  if(sandbox) return 'sandbox_invoice_preview_only';
  return 'onboarding_required';
}

export function buildSandboxInvoice({amountCny='0.01',goodsName='MilliAPI sandbox API call',resourceId='milliapi-sandbox'}={}){
  if(process.env.ALIPAY_ENV!=='sandbox'||process.env.ALIPAY_SANDBOX_ENABLED!=='true'){
    throw new Error('Alipay sandbox is disabled');
  }
  const invoice={
    schemaVersion:1,
    environment:'sandbox',
    testPayment:true,
    productionTransaction:false,
    realFundsMoved:false,
    payable:false,
    status:'invoice_only',
    rail:'alipay-ai-pay',
    protocol:ALIPAY_PROTOCOL,
    currency:'CNY',
    amount:String(amountCny),
    goodsName,
    resourceId,
    outTradeNo:`SANDBOX_${Date.now()}_${randomUUID()}`,
    paymentNeededHeader:'Payment-Needed',
    paymentProofHeader:'Payment-Proof',
    warning:'TEST ONLY. This object is not signed, cannot be paid, is not revenue, and must never be recorded as a settled transaction.'
  };
  return invoice;
}

export function paymentOptions(){
  return {
    schemaVersion:1,
    charged:false,
    paymentAuthorized:false,
    executesPayment:false,
    options:[
      {rail:'x402',environment:'production',testPayment:false,currency:'USDC',network:'eip155:8453',status:'available',realFundsMayMove:true,authorization:'buyer_or_principal_wallet_policy_required'},
      {rail:'alipay-ai-pay',protocol:ALIPAY_PROTOCOL,environment:process.env.ALIPAY_ENV||'not_configured',testPayment:process.env.ALIPAY_ENV==='sandbox',currency:'CNY',status:alipayStatus(),realFundsMayMove:false,paymentNeededHeader:'Payment-Needed',paymentProofHeader:'Payment-Proof',authorization:'explicit_user_and_alipay_authorization_required',documentation:'https://aipay.alipay.com/docs/ai-receive/MACHINE_PAY.html'}
    ],
    policy:{quoteIsAuthorization:false,languageDoesNotSelectPaymentRail:true,buyerControlsRail:true,principalPolicyAlwaysWins:true,neverTreatSandboxAsRevenue:true}
  };
}
