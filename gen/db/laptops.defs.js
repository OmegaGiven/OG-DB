const BUCKET={'under $500':['< $500','t-yes'],'under $1000':['< $1000','t-yes'],
  'under $1500':['< $1500','t-part'],'under $2000':['< $2000','t-part'],'$2000+':['$2000+','t-neutral']};
const CAT={'budget':'t-neutral','ultrabook':'t-part','mainstream':'t-neutral','gaming':'t-part','workstation':'t-part','2-in-1':'t-neutral'};
const linTag=v=>{v=v||'';return /excellent|^good/i.test(v)?tag(v,'t-yes'):/fair/i.test(v)?tag(v,'t-part'):tag(v,'t-no');};
const repTag=v=>{v=v||'';return /excellent/i.test(v)?tag(v,'t-yes'):/^good|fair/i.test(v)?tag(v,'t-part'):tag(v,'t-no');};
const money=d=>d.priceUSDStart==null?'<span class="price">&mdash;</span>':
  `<span class="price">$${d.priceUSDStart.toLocaleString()}<small>${esc(d.priceNote||'')}</small></span>`;

const COLUMNS=[
 {id:'name',hideable:false,label:'Laptop',cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear}</span>`},
 {id:'bucket',label:'Price band',cell:d=>{const b=BUCKET[d.priceBucket];return b?tag(b[0],b[1]):esc(d.priceBucket);}},
 {id:'price',label:'Start price',cell:money},
 {id:'cat',label:'Category',cell:d=>tag(d.category,CAT[d.category]||'t-neutral')},
 {id:'cpu',label:'CPU options',cell:d=>`<span style="font-size:11.5px">${esc(d.cpuOptions)}</span>`},
 {id:'gpu',label:'GPU options',cell:d=>`<span style="font-size:11.5px">${esc(d.gpuOptions)}</span>`},
 {id:'ram',label:'RAM',cell:d=>`<span style="font-size:12px">${esc(d.ram)}</span>`+(d.ramUpgradeable?tag('Upgradeable','t-yes'):tag('Soldered','t-no'))},
 {id:'storage',label:'Storage',cell:d=>`<span style="font-size:12px">${esc(d.storage)}</span>`+(d.storageUpgradeable?tag('Upgradeable','t-yes'):tag('Soldered','t-no'))},
 {id:'display',label:'Display',cell:d=>`<span class="price">${d.sizeInches}"</span><span class="sub">${esc(d.display)}</span>`},
 {id:'weight',label:'Weight',cell:d=>d.weightKg!=null?`<span class="price">${d.weightKg} kg</span>`:'&mdash;'},
 {id:'battery',label:'Battery',cell:d=>`<span class="price">${d.batteryWh?d.batteryWh+' Wh':'?'}</span><span class="sub">${esc(d.batteryLife||'')}</span>`},
 {id:'ports',label:'Ports',cell:d=>`<span style="font-size:11.5px">${esc(d.ports)}</span>`},
 {id:'charge',label:'Charge',cell:d=>d.chargeW?`<span class="price">${d.chargeW} W</span>`:'&mdash;'},
 {id:'os',label:'OS',cell:d=>`<span style="font-size:12px">${esc(d.os)}</span>`},
 {id:'linux',label:'Linux',cell:d=>linTag(d.linuxSupport)},
 {id:'repair',label:'Repairability',cell:d=>repTag(d.repairability)},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'b5',label:'Under $500',test:d=>d.priceBucket==='under $500'},
 {id:'b10',label:'Under $1000',test:d=>d.priceBucket==='under $500'||d.priceBucket==='under $1000'},
 {id:'b15',label:'Under $1500',test:d=>/under \$(500|1000|1500)/.test(d.priceBucket)},
 {id:'b20',label:'Under $2000',test:d=>d.priceBucket!=='$2000+'},
 {id:'ru',label:'RAM upgradeable',test:d=>d.ramUpgradeable===true},
 {id:'su',label:'Storage upgradeable',test:d=>d.storageUpgradeable===true},
 {id:'lin',label:'Good Linux support',test:d=>/excellent|^good/i.test(d.linuxSupport||'')},
 {id:'gam',label:'Gaming',test:d=>d.category==='gaming'},
 {id:'ult',label:'Ultrabook',test:d=>d.category==='ultrabook'},
 {id:'wrk',label:'Workstation',test:d=>d.category==='workstation'},
 {id:'lt',label:'≤ 1.4 kg',test:d=>d.weightKg!=null&&d.weightKg<=1.4},
 {id:'sm',label:'14" or smaller',test:d=>d.sizeInches!=null&&d.sizeInches<=14},
 {id:'mac',label:'MacBook',test:d=>d.brand==='Apple'},
 {id:'fw',label:'Framework',test:d=>d.brand==='Framework'}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSDStart??1e9)-(b.priceUSDStart??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSDStart??-1)-(a.priceUSDStart??-1)},
 {id:'wt',label:'Weight ↑',cmp:(a,b)=>(a.weightKg??99)-(b.weightKg??99)},
 {id:'size',label:'Screen size ↑',cmp:(a,b)=>(a.sizeInches??99)-(b.sizeInches??99)},
 {id:'yr',label:'Newest first',cmp:(a,b)=>b.releaseYear-a.releaseYear},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Price',html:d=>`${esc(d.priceBucket)} &mdash; ${esc(d.priceNote)}`},
 {label:'Configuration',html:d=>`<dl class="kv">
   <dt>CPU</dt><dd>${esc(d.cpuOptions)}</dd>
   <dt>GPU</dt><dd>${esc(d.gpuOptions)}</dd>
   <dt>RAM</dt><dd>${esc(d.ram)} &middot; ${d.ramUpgradeable?'upgradeable':'soldered'}</dd>
   <dt>Storage</dt><dd>${esc(d.storage)} &middot; ${d.storageUpgradeable?'upgradeable':'soldered'}</dd>
   <dt>Display</dt><dd>${esc(d.display)}</dd>
   <dt>Display options</dt><dd>${esc(d.displayOptions)}</dd>
 </dl>`},
 {label:'Physical & I/O',html:d=>`<dl class="kv">
   <dt>Size / weight</dt><dd>${d.sizeInches}" &middot; ${d.weightKg} kg</dd>
   <dt>Battery</dt><dd>${d.batteryWh?d.batteryWh+' Wh':'?'} &middot; ${esc(d.batteryLife)}</dd>
   <dt>Charging</dt><dd>${d.chargeW?d.chargeW+' W':'?'}</dd>
   <dt>Ports</dt><dd>${esc(d.ports)}</dd>
   <dt>Webcam</dt><dd>${esc(d.webcam)}</dd>
 </dl>`},
 {label:'OS & serviceability',html:d=>`<dl class="kv">
   <dt>OS</dt><dd>${esc(d.os)}</dd>
   <dt>Linux</dt><dd>${esc(d.linuxSupport)}</dd>
   <dt>Repairability</dt><dd>${esc(d.repairability)}</dd>
 </dl>`}
];
