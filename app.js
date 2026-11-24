(() => {
"use strict";
const BASES=["https://data-api.binance.vision","https://api.binance.com","https://api1.binance.com","https://api2.binance.com"];
const TFS=[["15m","15m",.08],["1h","1h",.14],["4h","4h",.25],["1d","1d",.32],["1w","1w",.21]];
const STABLE=new Set(["USDC","FDUSD","TUSD","BUSD","USDP","DAI","USDE","EUR","TRY","BRL","GBP"]);
const $=id=>document.getElementById(id);
let results=[],controller=null,scanning=false,lastScan=0,installEvent=null,done=0,total=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function status(s){$("status").textContent=s}
function progress(){ $("progressText").textContent=`${done} / ${total}`;$("bar").style.width=total?`${done/total*100}%`:"0%" }
async function get(path,signal){
 let err;
 for(let i=0;i<3;i++){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),14000),abort=()=>c.abort();
  if(signal){if(signal.aborted)throw new DOMException("Durduruldu","AbortError");signal.addEventListener("abort",abort,{once:true})}
  try{
   const res=await fetch(BASES[i%BASES.length]+path,{mode:"cors",cache:"no-store",signal:c.signal,headers:{Accept:"application/json"}});
   if(!res.ok){if(res.status===418||res.status===429)await sleep(1800*(i+1));throw Error(`Binance HTTP ${res.status}`)}
   const data=await res.json();if(data?.code&&data?.msg)throw Error(data.msg);return data;
  }catch(e){err=e;if(e.name==="AbortError"&&signal?.aborted)throw e;if(i<2)await sleep(300*(i+1))}
  finally{clearTimeout(timer);if(signal)signal.removeEventListener("abort",abort)}
 }
 throw err||Error("API erişilemedi");
}
function ema(a,p){if(a.length<p)return null;let v=a.slice(0,p).reduce((x,y)=>x+y,0)/p,k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function emaSeries(a,p){if(a.length<p)return[];let k=2/(p+1),v=a.slice(0,p).reduce((x,y)=>x+y,0)/p,o=Array(a.length).fill(null);o[p-1]=v;for(let i=p;i<a.length;i++){v=a[i]*k+v*(1-k);o[i]=v}return o}
function rsi(a,p=14){if(a.length<p+2)return{v:null,prev:null};let g=0,l=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=p;l/=p;let s=[l===0?100:100-100/(1+g/l)];for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p;s.push(l===0?100:100-100/(1+g/l))}return{v:s.at(-1),prev:s.at(-2)}}
function macd(a){if(a.length<35)return null;let f=emaSeries(a,12),sl=emaSeries(a,26),line=a.map((_,i)=>f[i]==null||sl[i]==null?null:f[i]-sl[i]),v=line.filter(x=>x!=null),sig=emaSeries(v,9),off=line.length-v.length,h=[];for(let i=0;i<line.length;i++){let s=sig[i-off];h.push(line[i]==null||s==null?null:line[i]-s)}let z=h.filter(x=>x!=null);return z.length<2?null:{h:z.at(-1),p:z.at(-2),cross:z.at(-2)<=0&&z.at(-1)>0}}
const pct=(a,b)=>b?(a/b-1)*100:0;
function analyze(raw){
 let candles=raw.filter(x=>Number(x[6])<Date.now());if(candles.length<55)throw Error("Yetersiz kapanmış mum");
 let c=candles.map(x=>+x[4]),v=candles.map(x=>+x[5]),last=c.at(-1),r=rsi(c),m=macd(c),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),e20old=ema(c.slice(0,-3),20),avg=v.slice(-21,-1).reduce((a,b)=>a+b,0)/20,vr=avg?v.at(-1)/avg:1,roc5=pct(last,c.at(-6)),roc10=pct(last,c.at(-11)),rise=r.v!=null&&r.prev!=null&&r.v>r.prev,emaRise=e20!=null&&e20old!=null&&e20>e20old,dist=pct(last,e20);
 let rs=10;if(r.v!=null){if(r.v>=42&&r.v<=62&&rise)rs=25;else if(r.v>=35&&r.v<42&&rise)rs=22;else if(r.v>62&&r.v<=68&&rise)rs=18;else if(r.v<35&&rise)rs=16;else if(r.v>72)rs=4;else if(r.v>68)rs=9;else if(r.v>=42&&r.v<=62)rs=17;else rs=8}
 let ms=!m?8:m.cross?25:m.h>0&&m.h>m.p?23:m.h>0?17:m.h>m.p?16:5;
 let es=5;if(e20&&e50){if(last>e20&&e20>e50&&(e200==null||e50>e200))es=20;else if(last>e20&&emaRise)es=17;else if(last>e50&&e20>e50)es=16;else if(emaRise&&last>=e20*.97)es=13;else if(emaRise)es=10;else if(last<e20&&last<e50)es=4;else es=8}
 let mos=7;if(roc5>=1&&roc5<=7&&roc10>=0)mos=15;else if(roc5>0&&roc5<1)mos=12;else if(roc5<0&&roc10>roc5)mos=10;else if(roc5>7&&roc5<=12)mos=10;else if(roc5>12)mos=5;else if(roc10>0)mos=9;
 let vs=7;if(vr>=1.3&&vr<=2.5)vs=15;else if(vr>2.5&&vr<=4)vs=12;else if(vr>=1&&vr<1.3)vs=11;else if(vr<.7)vs=4;else vs=8;
 return{score:rs+ms+es+mos+vs,rsi:r.v,rsiRise:rise,macd:m?.h??null,macdPrev:m?.p??null,cross:m?.cross??false,emaRise,ema20:e20,ema50:e50,ema200:e200,roc5,roc10,vr,dist,closeTime:+candles.at(-1)[6],parts:{rsi:rs,macd:ms,ema:es,momentum:mos,volume:vs}};
}
function scoreCoin(t,an){
 let base=0,w=0;for(let [k,,weight] of TFS){if(an[k]){base+=an[k].score*weight;w+=weight}}base/=w||1;
 let d=an["1d"],h=an["4h"],chg=+t.priceChangePercent||0,ret=d?.roc5||0,dist=d?.dist||0,h4=h?.roc5||0,pen=0;
 if(chg>8)pen+=Math.min(12,(chg-8)*.8);if(ret>20)pen+=Math.min(14,(ret-20)*.35);if(dist>8)pen+=Math.min(10,(dist-8)*.8);if(h4>15)pen+=Math.min(6,(h4-15)*.25);pen=Math.min(25,pen);
 let early=chg>=-3&&chg<=5&&ret>=-8&&ret<=20&&d?.vr>=1.2&&h&&(h.cross||(h.macd>h.macdPrev&&h.macd<0)||d.rsiRise&&d.rsi<60)?4:0;
 return{symbol:t.symbol,base:t.symbol.replace(/USDT$/,""),price:+t.lastPrice,change:chg,volume:+t.quoteVolume,penalty:+pen.toFixed(1),bonus:early,pump:chg>=15||ret>=35||dist>=15,ret,score:Math.max(0,Math.min(100,Math.round(base-pen+early))),an};
}
function eligible(s){return s.quoteAsset==="USDT"&&s.status==="TRADING"&&s.isSpotTradingAllowed!==false&&!STABLE.has(s.baseAsset)&&!["UP","DOWN","BULL","BEAR"].some(x=>s.baseAsset.endsWith(x))}
async function universe(n,signal){status("Spot pariteleri ve 24 saatlik hacimler alınıyor…");let [info,ticks]=await Promise.all([get("/api/v3/exchangeInfo",signal),get("/api/v3/ticker/24hr",signal)]);let set=new Set(info.symbols.filter(eligible).map(x=>x.symbol));return ticks.filter(x=>set.has(x.symbol)&&+x.quoteVolume>0).sort((a,b)=>+b.quoteVolume-+a.quoteVolume).slice(0,n)}
async function analyzeCoin(t,signal){let an={};await Promise.all(TFS.map(async([k,interval])=>{an[k]=analyze(await get(`/api/v3/klines?symbol=${encodeURIComponent(t.symbol)}&interval=${interval}&limit=250`,signal))}));return scoreCoin(t,an)}
function fmtPrice(x){return x>=1000?x.toLocaleString("en-US",{maximumFractionDigits:2}):x>=1?x.toLocaleString("en-US",{maximumFractionDigits:4}):x>=.01?x.toLocaleString("en-US",{maximumFractionDigits:6}):x.toLocaleString("en-US",{maximumFractionDigits:8})}
function fmtVol(x){return x>=1e9?`$${(x/1e9).toFixed(2)}B`:x>=1e6?`$${(x/1e6).toFixed(1)}M`:x>=1e3?`$${(x/1e3).toFixed(0)}K`:`$${x.toFixed(0)}`}
function scoreText(r){return r.pump?"Aşırı hareket · temkin":r.score>=75?"Güçlü erken sinyal":r.score>=60?"İzlemeye değer":r.score>=45?"Karışık görünüm":"Zayıf teknik görünüm"}
function render(){
 let q=$("search").value.trim().toUpperCase(),min=+$("min").value,sort=$("sort").value,list=results.filter(x=>x.score>=min&&(!q||x.symbol.includes(q)));
 list.sort(sort==="volume"?(a,b)=>b.volume-a.volume:sort==="change"?(a,b)=>b.change-a.change:sort==="symbol"?(a,b)=>a.symbol.localeCompare(b.symbol):(a,b)=>b.score-a.score);
 $("cards").innerHTML="";$("empty").classList.toggle("hidden",list.length>0);
 if(!results.length){$("empty").innerHTML="<b>Henüz tarama yapılmadı</b>Başlamak için “Taramayı başlat” düğmesine dokun."}
 else if(!list.length){$("empty").innerHTML="<b>Filtreye uygun coin yok</b>Puan eşiğini düşür veya aramayı temizle."}
 for(let r of list){
  let tags=(r.bonus?`<span class="tag good">Birikim +${r.bonus}</span>`:"")+(r.penalty?`<span class="tag warn">Kesinti −${r.penalty}</span>`:`<span class="tag good">Aşırı yükseliş yok</span>`)+(r.pump?`<span class="tag warn">Hızlı yükselmiş</span>`:"");
  let chips=TFS.map(([k,label])=>{let a=r.an[k],s=!a?"—":a.cross?"MACD ↑":a.macd>0?"Pozitif":a.macd>a.macdPrev?"Toparlanma":"Negatif",cl=!a?"":a.macd>0||a.macd>a.macdPrev?"up":"down";return `<div><small>${label}</small><b class="${cl}">${s}</b></div>`}).join("");
  let el=document.createElement("article");el.className="card";el.innerHTML=`<div class="coinhead"><div class="coin"><div class="coinicon">${r.base.slice(0,5)}</div><div><strong>${r.base}/USDT</strong><small>${scoreText(r)}</small></div></div><div class="score ${r.score<60?"low":r.score<75?"mid":""}">${r.score}</div></div><div class="price"><b>${fmtPrice(r.price)} <small class="muted">USDT</small></b><strong class="${r.change>=0?"up":"down"}">${r.change>=0?"+":""}${r.change.toFixed(2)}%</strong></div><div class="tags">${tags}</div><div class="tf">${chips}</div><div class="foot"><span>24s hacim ${fmtVol(r.volume)}</span><span>Detay ↗</span></div>`;
  el.addEventListener("click",()=>details(r));$("cards").appendChild(el)
 }
 $("csv").disabled=!results.length;$("scanned").textContent=done||"—";$("candidates").textContent=results.filter(x=>x.score>=60).length;$("strong").textContent=results.filter(x=>x.score>=75).length;$("time").textContent=lastScan?new Date(lastScan).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"—";
}
function details(r){
 $("dtitle").textContent=r.base+"/USDT";let rows=TFS.map(([k,label])=>{let a=r.an[k];return `<tr><td>${label}</td><td>${a.score}/100</td><td>${a.rsi?.toFixed(1)??"—"} ${a.rsiRise?"↑":"↓"}</td><td>${a.cross?"Yukarı kesişim":a.macd>0?"Pozitif":a.macd>a.macdPrev?"Toparlanıyor":"Negatif"}</td><td>${a.vr.toFixed(2)}×</td></tr>`}).join("");
 let p=r.an["1d"].parts;$("dbody").innerHTML=`<div class="metrics"><div class="metric"><small>Teknik puan</small><b>${r.score}/100</b></div><div class="metric"><small>Son fiyat</small><b>${fmtPrice(r.price)} USDT</b></div><div class="metric"><small>24s değişim</small><b class="${r.change>=0?"up":"down"}">${r.change.toFixed(2)}%</b></div></div><div class="eyebrow">ZAMAN DİLİMİ GÖRÜNÜMÜ</div><table class="detailtable"><thead><tr><th>Dilim</th><th>Puan</th><th>RSI</th><th>MACD</th><th>Hacim</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Günlük puan dağılımı: RSI ${p.rsi}/25 · MACD ${p.macd}/25 · EMA ${p.ema}/20 · Momentum ${p.momentum}/15 · Hacim ${p.volume}/15. Aşırı yükseliş kesintisi: −${r.penalty}; birikim katkısı: +${r.bonus}. Günlük grafikteki getiri 5 kapanmış mum üzerinden hesaplanır.</p><p><a target="_blank" rel="noopener" href="https://www.binance.com/en/trade/${r.base}_USDT">Binance üzerinde aç ↗</a></p>`;
 $("detail").showModal()
}
async function start(){
 if(scanning)return;scanning=true;controller=new AbortController();results=[];done=0;total=0;lastScan=0;$("error").classList.add("hidden");$("scan").classList.add("hidden");$("stop").classList.remove("hidden");render();progress();
 try{
  let list=await universe(+$("universe").value,controller.signal);total=list.length;progress();status(`${total} USDT spot paritesi taranıyor…`);let idx=0,fail=0;
  async function worker(){while(true){if(controller.signal.aborted)throw new DOMException("Durduruldu","AbortError");let i=idx++;if(i>=list.length)return;try{results.push(await analyzeCoin(list[i],controller.signal))}catch(e){if(e.name==="AbortError")throw e;fail++}done++;progress();if(done%5===0||done===total){results.sort((a,b)=>b.score-a.score);status(`Analiz sürüyor · ${done}/${total}`);render()}}}
  await Promise.all(Array.from({length:3},worker));results.sort((a,b)=>b.score-a.score);lastScan=Date.now();render();progress();status(`Tamamlandı · ${results.length} parite analiz edildi${fail?` · ${fail} paritede veri alınamadı`:""}.`);if(fail)$("error").textContent=`${fail} paritede veri alınamadı; eksik pariteler puan listesine eklenmedi.`,$("error").classList.remove("hidden")
 }catch(e){lastScan=Date.now();if(e.name==="AbortError")status(`Tarama durduruldu · ${done}/${total}`);else status("Tarama tamamlanamadı.");$("error").textContent=`Binance verisine erişilemedi: ${e.message}. İnternet bağlantısını kontrol et; bazı bölgelerde API erişimi kısıtlanabilir.`;$("error").classList.remove("hidden");render()}
 finally{scanning=false;controller=null;$("scan").classList.remove("hidden");$("stop").classList.add("hidden")}
}
function csv(){
 let rows=[["Parite","Teknik_Puan","24s_Degisim_%","24s_Hacim_USDT","Kesinti","Birikim","RSI_1d","MACD_1d","Hacim_Orani_1d"],...results.sort((a,b)=>b.score-a.score).map(r=>[r.symbol,r.score,r.change,r.volume,r.penalty,r.bonus,r.an["1d"].rsi,r.an["1d"].cross?"Yukari_kesisim":r.an["1d"].macd>0?"Pozitif":"Negatif",r.an["1d"].vr])];
 let blob=new Blob(["\ufeff"+rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`binance-erken-sinyal-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
}
$("scan").addEventListener("click",start);$("stop").addEventListener("click",()=>controller?.abort());$("min").addEventListener("change",render);$("sort").addEventListener("change",render);$("search").addEventListener("input",render);$("csv").addEventListener("click",csv);$("close").addEventListener("click",()=>$("detail").close());$("detail").addEventListener("click",e=>{if(e.target===$("detail"))$("detail").close()});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;$("install").classList.remove("hidden")});$("install").addEventListener("click",async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;$("install").classList.add("hidden")}});
if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>status("Çevrimdışı önbellek etkinleştirilemedi.")));
render();progress();
})();