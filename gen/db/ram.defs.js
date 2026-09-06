const PROF={'EXPO':['EXPO','t-yes'],'XMP 3.0':['XMP 3.0','t-part'],'XMP 2.0':['XMP 2.0','t-part'],'EXPO + XMP 3.0':['EXPO + XMP','t-yes'],'JEDEC only':['JEDEC only','t-neutral']};

const COLUMNS=[
 {id:'name',hideable:false,label:'Kit',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${esc(d.family)}</span>`},
 {id:'price',label:'Price (trend)',sort:d=>d.priceUSD,cell:d=>sparkline(d.priceHistory)+`<span class="sub">$${d.pricePerGB}/GB</span>`},
 {id:'ppg',label:'$/GB',sort:d=>d.pricePerGB,cell:d=>`<span class="price">$${d.pricePerGB}</span>`},
 {id:'gen',label:'Type',sort:d=>d.ddrGen==='DDR5'?0:1,cell:d=>tag(d.ddrGen,d.ddrGen==='DDR5'?'t-yes':'t-neutral')},
 {id:'kit',label:'Kit',sort:d=>d.totalGB,cell:d=>`<span class="price">${d.totalGB} GB</span><span class="sub">${esc(d.kitLayout)}</span>`},
 {id:'speed',label:'Speed',sort:d=>d.speedMTs,cell:d=>`<span class="price">${d.speedMTs}</span><span class="sub">MT/s</span>`},
 {id:'cl',label:'Latency',sort:d=>d.casLatency,cell:d=>`<span class="price">CL${d.casLatency}</span><span class="sub">${esc(d.timings)} &middot; ${d.voltage} V</span>`},
 {id:'prof',label:'Profile',sort:d=>({'EXPO + XMP 3.0':0,'EXPO':1,'XMP 3.0':2,'XMP 2.0':3,'JEDEC only':4}[d.profile]??5),cell:d=>{const p=PROF[d.profile]||[d.profile,'t-neutral'];return tag(p[0],p[1]);}},
 {id:'rank',label:'Rank',cell:d=>tag(d.rankPerModule+'-rank','t-neutral')},
 {id:'die',label:'IC / die',sort:d=>d.icDie==='unknown'?1:0,cell:d=>d.icDie&&d.icDie!=='unknown'?`<span style="font-size:12px">${esc(d.icDie)}</span>`:'<span style="color:var(--ink-soft)">unknown</span>'},
 {id:'rgb',label:'RGB',cell:d=>yn(d.rgb,'RGB','No RGB')},
 {id:'h',label:'Height',sort:d=>d.heightMm,cell:d=>d.heightMm?`<span class="price">${d.heightMm} mm</span>`:'&mdash;'},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'d5',label:'DDR5',test:d=>d.ddrGen==='DDR5'},
 {id:'d4',label:'DDR4',test:d=>d.ddrGen==='DDR4'},
 {id:'expo',label:'EXPO (AMD)',test:d=>/EXPO/.test(d.profile||'')},
 {id:'xmp',label:'XMP (Intel)',test:d=>/XMP/.test(d.profile||'')},
 {id:'g32',label:'32 GB',test:d=>d.totalGB===32},
 {id:'g64',label:'64 GB +',test:d=>d.totalGB>=64},
 {id:'s6k',label:'6000+ MT/s',test:d=>d.speedMTs>=6000},
 {id:'s72',label:'7200+ MT/s',test:d=>d.speedMTs>=7200},
 {id:'cl30',label:'CL30 or tighter',test:d=>d.ddrGen==='DDR5'&&d.casLatency<=30},
 {id:'lp',label:'Low profile (≤ 35 mm)',test:d=>d.heightMm!=null&&d.heightMm<=35},
 {id:'norgb',label:'No RGB',test:d=>d.rgb===false},
 {id:'die',label:'Known IC die',test:d=>d.icDie&&d.icDie!=='unknown'},
 {id:'down',label:'Price falling',test:d=>priceTrend(d.priceHistory)==='down'}
];

const SORTS=[
 {id:'ppg',label:'$/GB ↑',cmp:(a,b)=>(a.pricePerGB??1e9)-(b.pricePerGB??1e9)},
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'speed',label:'Speed ↓',cmp:(a,b)=>(b.speedMTs??0)-(a.speedMTs??0)||(a.casLatency??99)-(b.casLatency??99)},
 {id:'cl',label:'Latency ↑',cmp:(a,b)=>(a.casLatency??99)-(b.casLatency??99)},
 {id:'cap',label:'Capacity ↓',cmp:(a,b)=>(b.totalGB??0)-(a.totalGB??0)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Price history',html:d=>priceChart(d.priceHistory)},
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Spec',html:d=>`<dl class="kv">
   <dt>Kit</dt><dd>${esc(d.kitLayout)} = ${d.totalGB} GB ${esc(d.ddrGen)}</dd>
   <dt>Speed / timings</dt><dd>${d.speedMTs} MT/s &middot; ${esc(d.timings)} &middot; ${d.voltage} V</dd>
   <dt>Profile</dt><dd>${esc(d.profile)}</dd>
   <dt>Rank</dt><dd>${esc(d.rankPerModule)}-rank per module</dd>
   <dt>IC / die</dt><dd>${esc(d.icDie)}</dd>
   <dt>Physical</dt><dd>${d.heightMm?d.heightMm+' mm tall':'?'} &middot; ${d.rgb?'RGB':'no RGB'}</dd>
 </dl>`}
];
