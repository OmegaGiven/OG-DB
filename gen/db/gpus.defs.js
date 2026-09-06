const TIER={S:['S','t-yes'],A:['A','t-yes'],B:['B','t-part'],C:['C','t-neutral'],D:['D','t-no']};
const tierTag=v=>{if(!v||v==='n/a')return '<span style="color:var(--ink-soft)">n/a</span>';const t=TIER[v]||[v,'t-neutral'];return tag(t[0],t[1]);};
const TORD={S:0,A:1,B:2,C:3,D:4};
const RES={'4K + RT':['4K + RT','t-yes'],'4K':['4K','t-yes'],'1440p / entry 4K':['1440p / entry 4K','t-part'],'1440p':['1440p','t-part'],'1080p':['1080p','t-neutral'],'1080p (RT needs upscaling)':['1080p (RT w/ upscale)','t-neutral'],'n/a':['n/a','t-neutral']};
const RORD={'4K + RT':0,'4K':1,'1440p / entry 4K':2,'1440p':3,'1080p':4,'1080p (RT needs upscaling)':5,'n/a':9};
const SEG={consumer:'t-neutral',prosumer:'t-part',workstation:'t-part',datacenter:'t-part',integrated:'t-neutral'};
const hasTensor=d=>!/^none/i.test(d.tensorCores||'');
// first "N fps native" figure in a "Cyberpunk 2077 ... ~N fps native; ..." string
const nativeFps=s=>{const m=String(s||'').match(/(\d+)\s*fps?\s*native/i);return m?+m[1]:0;};

const COLUMNS=[
 {id:'name',hideable:false,label:'GPU',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${esc(d.architecture)} &middot; ${d.releaseYear}</span>`},
 {id:'price',label:'Price (trend)',sort:d=>d.priceUSD,cell:d=>sparkline(d.priceHistory)+`<span class="sub">MSRP $${d.msrpUSD??'?'}</span>`},
 {id:'seg',label:'Segment',cell:d=>tag(d.segment,SEG[d.segment]||'t-neutral')},
 {id:'vram',label:'VRAM',sort:d=>d.vramGB,cell:d=>`<span class="price">${d.vramGB} GB</span><span class="sub">${esc(d.vramType)} &middot; ${d.memBandwidthGBs?d.memBandwidthGBs+' GB/s':''}</span>`},
 {id:'ai',label:'Max model @ Q4',sort:d=>d.aiMaxModelQ4B,cell:d=>`<span class="price">~${d.aiMaxModelQ4B}B</span><span class="sub">~${d.aiMaxModelFP16B}B at FP16</span>`},
 {id:'tensor',label:'AI compute',sort:d=>d.fp16TFLOPS,cell:d=>`<span class="price">${d.fp16TFLOPS??'?'} TF</span><span class="sub">FP16${d.int8TOPS?` &middot; ${d.int8TOPS} INT8 TOPS`:''}</span>`+(hasTensor(d)?tag(d.tensorCores,'t-yes'):tag('no tensor cores','t-no'))},
 {id:'power',label:'Power',sort:d=>d.tdpW,cell:d=>`<span class="price">${d.tdpW} W</span><span class="sub">${esc(d.powerConnector)} &middot; PSU ${d.recommendedPSUW||'?'} W</span>`},
 {id:'res',label:'Res target',sort:d=>RORD[d.resTarget]??9,cell:d=>{const r=RES[d.resTarget]||[d.resTarget,'t-neutral'];return tag(r[0],r[1]);}},
 {id:'raster',label:'Raster',sort:d=>TORD[d.gamingTierRaster]??9,cell:d=>tierTag(d.gamingTierRaster)},
 {id:'rt',label:'Ray tracing',sort:d=>TORD[d.gamingTierRT]??9,cell:d=>tierTag(d.gamingTierRT)},
 {id:'g1080',label:'1080p',cell:d=>`<span style="font-size:11.5px">${esc(d.game1080p)}</span>`},
 {id:'g1440',label:'1440p',cell:d=>`<span style="font-size:11.5px">${esc(d.game1440p)}</span>`},
 {id:'g4k',label:'4K',cell:d=>`<span style="font-size:11.5px">${esc(d.game4k)}</span>`},
 {id:'g4krt',label:'4K + RT',cell:d=>`<span style="font-size:11.5px">${esc(d.game4kRT)}</span>`},
 {id:'ups',label:'Upscaling',cell:d=>`<span style="font-size:11.5px">${esc(d.upscaling)}</span>`},
 {id:'phys',label:'Size',sort:d=>d.lengthMm,cell:d=>`<span class="price">${d.slots?d.slots+'-slot':'?'}</span><span class="sub">${d.lengthMm?d.lengthMm+' mm':''}</span>`},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'v16',label:'≥ 16 GB VRAM',test:d=>d.vramGB>=16},
 {id:'v24',label:'≥ 24 GB VRAM',test:d=>d.vramGB>=24},
 {id:'v48',label:'≥ 48 GB VRAM',test:d=>d.vramGB>=48},
 {id:'m30',label:'Runs 30B+ at Q4',test:d=>d.aiMaxModelQ4B>=30},
 {id:'m70',label:'Runs 70B+ at Q4',test:d=>d.aiMaxModelQ4B>=70},
 {id:'ten',label:'Tensor / matrix cores',test:hasTensor},
 {id:'p60_1080',label:'1080p 60fps native',test:d=>nativeFps(d.game1080p)>=55},
 {id:'p60_1440',label:'1440p 60fps native',test:d=>nativeFps(d.game1440p)>=55},
 {id:'k60n',label:'4K 60fps native',test:d=>nativeFps(d.game4k)>=55},
 {id:'k60u',label:'4K 60fps with upscaling',test:d=>{const ns=(d.game4k||'').match(/\d+/g)||[];return /^4K/.test(d.resTarget||'')||ns.some(n=>+n>=58);}},
 {id:'r4k',label:'4K capable (res target)',test:d=>/^4K/.test(d.resTarget||'')},
 {id:'r1440',label:'1440p or better',test:d=>/4K|1440p/.test(d.resTarget||'')},
 {id:'rt',label:'RT tier A / S',test:d=>d.gamingTierRT==='S'||d.gamingTierRT==='A'},
 {id:'p250',label:'≤ 250 W',test:d=>d.tdpW!=null&&d.tdpW<=250},
 {id:'p8',label:'8-pin only (no 12VHPWR)',test:d=>!/12VHPWR|16-pin|12V-2x6/i.test(d.powerConnector||'')},
 {id:'nv',label:'NVIDIA',test:d=>d.brand==='NVIDIA'},
 {id:'amd',label:'AMD',test:d=>d.brand==='AMD'},
 {id:'intel',label:'Intel',test:d=>d.brand==='Intel'},
 {id:'cons',label:'Consumer cards',test:d=>d.segment==='consumer'},
 {id:'under',label:'≤ $600',test:d=>d.priceUSD!=null&&d.priceUSD<=600},
 {id:'down',label:'Price falling',test:d=>priceTrend(d.priceHistory)==='down'}
];

const SORTS=[
 {id:'vram',label:'VRAM ↓',cmp:(a,b)=>(b.vramGB??0)-(a.vramGB??0)||(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'pgb',label:'$ per GB VRAM ↑',cmp:(a,b)=>((a.priceUSD??1e9)/(a.vramGB||1))-((b.priceUSD??1e9)/(b.vramGB||1))},
 {id:'ai',label:'AI compute ↓',cmp:(a,b)=>(b.fp16TFLOPS??0)-(a.fp16TFLOPS??0)},
 {id:'raster',label:'Raster tier',cmp:(a,b)=>(TORD[a.gamingTierRaster]??9)-(TORD[b.gamingTierRaster]??9)},
 {id:'tdp',label:'Power ↑',cmp:(a,b)=>(a.tdpW??1e9)-(b.tdpW??1e9)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Price history',html:d=>priceChart(d.priceHistory)+`<div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px">${esc(d.priceNote)}</div>`},
 {label:'Local AI',html:d=>`<dl class="kv">
   <dt>VRAM</dt><dd>${d.vramGB} GB ${esc(d.vramType)} &middot; ${d.memBandwidthGBs} GB/s</dd>
   <dt>Model fit</dt><dd>~${d.aiMaxModelQ4B}B dense at Q4_K_M &middot; ~${d.aiMaxModelFP16B}B at FP16 (assumes ~4k context, ~2 GB headroom)</dd>
   <dt>Compute</dt><dd>${d.fp16TFLOPS??'?'} TFLOPS FP16${d.int8TOPS?` &middot; ${d.int8TOPS} TOPS INT8`:''} &middot; ${esc(d.tensorCores)}</dd>
   <dt>Notes</dt><dd>${esc(d.aiNote)}</dd>
 </dl>`},
 {label:'Gaming by resolution',html:d=>`<dl class="kv">
   <dt>Comfortable target</dt><dd>${esc(d.resTarget)} &middot; raster tier ${esc(d.gamingTierRaster)} &middot; RT tier ${esc(d.gamingTierRT)}</dd>
   <dt>1080p</dt><dd>${esc(d.game1080p)}</dd>
   <dt>1440p</dt><dd>${esc(d.game1440p)}</dd>
   <dt>4K</dt><dd>${esc(d.game4k)}</dd>
   <dt>4K + RT</dt><dd>${esc(d.game4kRT)}</dd>
   <dt>Upscaling</dt><dd>${esc(d.upscaling)}</dd>
 </dl>`},
 {label:'Power & fit',html:d=>`<dl class="kv">
   <dt>TDP</dt><dd>${d.tdpW} W &middot; recommended PSU ${d.recommendedPSUW||'?'} W</dd>
   <dt>Connector</dt><dd>${esc(d.powerConnector)}</dd>
   <dt>Physical</dt><dd>${d.slots?d.slots+'-slot':'?'} &middot; ${d.lengthMm?d.lengthMm+' mm':'?'}</dd>
 </dl>`},
 {label:'Notes',html:d=>esc(d.notes)}
];
