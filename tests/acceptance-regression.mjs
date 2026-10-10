import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sales=read('app/pages/sales_page.html');
for(const path of ['index.html','app/pages/sales_page.html','app/pages/mypage.html','app/pages/halloflegends.html','app/pages/success.html','app/pages/terms.html']){
  for(const match of read(path).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(!/src=|application\/ld\+json/.test(match[1]))new vm.Script(match[2],{filename:path});
  }
}
const priceFn=sales.slice(sales.indexOf('function calculatePrice('),sales.indexOf('let GRID_COLS='));
const reserve=read('api/reserve.js');
const tiers=vm.runInNewContext(reserve.match(/const PRICE_TIERS = (\[[\s\S]*?\]);/)[1]);
const priceContext=vm.createContext({currentPriceTier:{currentTier:tiers[0]}});
vm.runInContext(priceFn,priceContext);
let priceCases=0;
for(const tier of tiers){
  priceContext.currentPriceTier.currentTier=tier;
  for(let n=1;n<=9216;n++){
    const discount=n>=1001?.3:n>=501?.2:n>=200?.1:0;
    const expected=n===9216?tier.monthlyFull:Math.max(1,Math.floor(tier.pricePerBlock*n*(1-discount)));
    const result=priceContext.calculatePrice(n);
    assert.equal(result.total,expected,`tier ${tier.pricePerBlock}, blocks ${n}`);
    assert.equal(result.totalDecimal,expected);
    assert.equal(result.annual,expected*10);
    assert.equal(result.disc,n===9216?0:discount);
    priceCases++;
  }
}
const hol=read('app/pages/halloflegends.html');
const helpers=hol.slice(hol.indexOf('function escapePartnerHtml'),hol.indexOf('// Founding Partners取得。'));
const links=vm.createContext({URL});vm.runInContext(helpers,links);
for(const value of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','not a url',undefined])assert.equal(links.partnerWebsite(value),'');
assert.ok(links.partnerWebsite('https://example.com/?q=" onmouseover="x').startsWith('https://example.com/'));
assert.equal(links.escapePartnerHtml('<img "x">&'), '&lt;img &quot;x&quot;&gt;&amp;');
const checkoutFn=sales.slice(sales.indexOf('async function proceedToCheckout(){'),sales.indexOf('function hsvToRgb('));
async function checkoutTest(logoOk,duplicate=false){
  const calls=[];const btn={disabled:false,textContent:''};let error='';
  const context=vm.createContext({
    document:{getElementById:id=>id==='ctaBtn'?btn:{value:''}},
    clearCheckoutError(){},showCheckoutError:m=>{error=m;},recordSalesGrowth(){},
    _spCurrentUser:{id:'test'},selectedArea:{x:1,y:2},STAGES_DATA:[{type:'standard'}],currentStage:1,plan:'monthly',chosenW:2,chosenH:2,deletedBlocks:[],
    _spAuthHeaders:async()=>({}),buildLogoDataUrl:()=> 'data:image/png;base64,test',_appliedCoupon:null,
    localStorage:{setItem(){}},window:{parent:null,location:{href:''}},
    fetch:async url=>{calls.push(url);return {ok:!url.endsWith('/api/logo')||logoOk,json:async()=>url.endsWith('/api/reserve')?{session_key:'test',block_count:4,monthly_total:1}:{url:'https://checkout.stripe.com/test'}};}
  });context.window.parent=context.window;
  vm.runInContext(checkoutFn,context);
  const first=context.proceedToCheckout();
  if(duplicate)await context.proceedToCheckout();
  await first;
  return {calls,error,btn};
}
const failed=await checkoutTest(false);
assert.equal(failed.calls.length,2);assert.ok(failed.error.includes('could not be saved'));assert.equal(failed.btn.disabled,false);
const success=await checkoutTest(true,true);assert.equal(success.calls.length,3);
const cancelSource=read('api/cancel-reservation.js').replace(/^import .*;\n/gm,'').replace('export default async function handler','async function handler');
async function cancellationTest(fail){
  const mutations=[];
  const sb={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>{
    const query={select(){return this;},eq(){return this;},update(value){mutations.push({table,value});return this;},
      maybeSingle:async()=>({data:{id:'contract',user_id:'owner',stripe_subscription_id:'sub_test',status:'active'}}),
      then(resolve,reject){return Promise.resolve({error:null}).then(resolve,reject);}};return query;
  }};
  class Stripe {constructor(){this.subscriptions={cancel:async()=>{if(fail)throw new Error('network');}};}}
  const context=vm.createContext({Stripe,createClient:()=>sb,process:{env:{}},console:{warn(){},error(){}},Date});
  vm.runInContext(cancelSource,context);
  const res={code:null,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;}};
  await context.handler({method:'POST',body:{contract_id:'contract'},headers:{authorization:'Bearer test'}},res);
  return {res,mutations};
}
const cancelFailed=await cancellationTest(true);assert.equal(cancelFailed.res.code,502);assert.equal(cancelFailed.mutations.length,0);
const cancelSuccess=await cancellationTest(false);assert.equal(cancelSuccess.res.code,200);assert.equal(cancelSuccess.mutations.length,3);
async function positionTest(x,y,conflictError=false){
  let mutations=0;
  const sb={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>({
    select(){return this;},eq(){return this;},neq(){return this;},gte(){return this;},lte(){return this;},
    limit:async()=>({data:[],error:conflictError?{message:'unavailable'}:null}),
    maybeSingle:async()=>({data:{user_id:'owner',status:'active',width:2,height:2,stage_id:1}}),
    delete(){mutations++;throw new Error('must not mutate');}
  })};
  const context=vm.createContext({Stripe:class{},createClient:()=>sb,process:{env:{}},console,Date});
  vm.runInContext(cancelSource,context);
  const res={code:null,status(c){this.code=c;return this;},json(){return this;},end(){return this;}};
  await context.handler({method:'POST',body:{contract_id:'contract',action:'update_position',new_anchor_x:x,new_anchor_y:y},headers:{authorization:'Bearer test'}},res);
  assert.equal(mutations,0);return res.code;
}
for(const [x,y] of [[-1,0],[127,0],[0,71],[.5,0],['1oops',0],['',0],[null,0],[0,undefined]])assert.equal(await positionTest(x,y),400);
assert.equal(await positionTest(0,0,true),503);
assert.ok(!sales.includes('window.history.back();\n    }else'));
assert.ok(sales.includes('href="#how-it-works"'));
assert.ok(read('app/pages/terms.html').includes('id="content-policy"'));
assert.ok(read('app/pages/success.html').includes('[ MANAGE YOUR PLACEMENT ]'));
const oauthScript=read('index.html').match(/<script>\s*(\(function showOAuthReturnError[\s\S]*?)<\/script>/)[1];
const oauthElements={oauthReturnMessage:{textContent:''},oauthReturnError:{style:{}},oauthReturnClose:{addEventListener(_event,fn){this.click=fn;}}};
let cleanedUrl='';
vm.runInNewContext(oauthScript,{URL,URLSearchParams,document:{getElementById:id=>oauthElements[id]},window:{location:{search:'?error=invalid_request&error_code=bad_oauth_state&error_description=%3Cimg%3E',href:'https://damnrun.com/?error=invalid_request&error_code=bad_oauth_state&error_description=%3Cimg%3E'},history:{replaceState(_state,_title,url){cleanedUrl=url;}}}});
assert.equal(oauthElements.oauthReturnError.style.display,'flex');
assert.ok(oauthElements.oauthReturnMessage.textContent.includes('expired'));
assert.ok(!oauthElements.oauthReturnMessage.textContent.includes('<img>'));
oauthElements.oauthReturnClose.click();assert.equal(cleanedUrl,'/');
console.log(`PASS: inline syntax; ${priceCases} price/annual cases; unsafe URLs; failed logo stops checkout; duplicate click; cancellation failure leaves all data intact; successful cancellation retains existing flow; invalid positions and failed availability checks do not mutate data.`);
