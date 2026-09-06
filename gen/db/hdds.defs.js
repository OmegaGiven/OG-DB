const USE={'enterprise / NAS':'t-yes','NAS':'t-yes','surveillance':'t-part','desktop':'t-neutral','external':'t-part','mobile':'t-neutral'};
const isSMR=d=>/SMR/i.test(d.recording||'');
const mtbf=n=>n==null?'?':n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+'M h':n.toLocaleString()+' h';

const COLUMNS=[
 {id:'name',hideable:false,label:'Drive',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${esc(d.family)} &middot; ${esc(d.capacityRangeTB)} TB range</span>`},
 {id:'price',label:'Price (trend)',sort:d=>d.priceUSD,cell:d=>sparkline(d.priceHistory)+`<span class="sub">$${d.pricePerTB}/TB</span>`},
 {id:'ppt',label:'$/TB',sort:d=>d.pricePerTB,cell:d=>`<span class="price">$${d.pricePerTB}</span>`},
 {id:'cap',label:'Capacity',sort:d=>d.capacityTB,cell:d=>`<span class="price">${d.capacityTB} TB</span><span class="sub">${esc(d.formFactor)}</span>`},
 {id:'rec',label:'Recording',sort:d=>isSMR(d)?1:0,cell:d=>isSMR(d)?tag('SMR','t-no'):tag('CMR','t-yes')},
 {id:'use',label:'Use case',cell:d=>tag(d.useCase,USE[d.useCase]||'t-neutral')},
 {id:'rpm',label:'RPM / cache',sort:d=>d.rpm,cell:d=>`<span class="price">${d.rpm}</span><span class="sub">${d.cacheMB} MB cache</span>`},
 {id:'iface',label:'Interface',cell:d=>tag(d.interface,/SAS/i.test(d.interface)?'t-part':'t-neutral')+(d.heliumSealed?tag('Helium','t-yes'):'')},
 {id:'wl',label:'Workload',sort:d=>d.workloadTByr,cell:d=>`<span class="price">${d.workloadTByr?d.workloadTByr+' TB/yr':'?'}</span><span class="sub">MTBF ${mtbf(d.mtbfHours)}</span>`},
 {id:'warr',label:'Warranty',sort:d=>d.warrantyYears,cell:d=>tag(d.warrantyYears+' yr',d.warrantyYears>=5?'t-yes':d.warrantyYears>=3?'t-part':'t-no')},
 {id:'pw',label:'Idle power',sort:d=>d.avgIdleWatts,cell:d=>d.avgIdleWatts!=null?`<span class="price">${d.avgIdleWatts} W</span>`:'&mdash;'},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'cmr',label:'CMR only',test:d=>!isSMR(d)},
 {id:'smr',label:'Show SMR (avoid for NAS)',test:isSMR},
 {id:'nas',label:'NAS',test:d=>/NAS/i.test(d.useCase)},
 {id:'ent',label:'Enterprise',test:d=>/enterprise/i.test(d.useCase)},
 {id:'surv',label:'Surveillance',test:d=>d.useCase==='surveillance'},
 {id:'ext',label:'External / shuckable',test:d=>d.useCase==='external'},
 {id:'c12',label:'≥ 12 TB',test:d=>d.capacityTB>=12},
 {id:'c20',label:'≥ 20 TB',test:d=>d.capacityTB>=20},
 {id:'cheap',label:'≤ $25 / TB',test:d=>d.pricePerTB!=null&&d.pricePerTB<=25},
 {id:'w5',label:'5-yr warranty',test:d=>d.warrantyYears>=5},
 {id:'he',label:'Helium',test:d=>d.heliumSealed===true},
 {id:'down',label:'Price falling',test:d=>priceTrend(d.priceHistory)==='down'}
];

const SORTS=[
 {id:'ppt',label:'$/TB ↑',cmp:(a,b)=>(a.pricePerTB??1e9)-(b.pricePerTB??1e9)},
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'cap',label:'Capacity ↓',cmp:(a,b)=>(b.capacityTB??0)-(a.capacityTB??0)},
 {id:'wl',label:'Workload rating ↓',cmp:(a,b)=>(b.workloadTByr??0)-(a.workloadTByr??0)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Price history',html:d=>priceChart(d.priceHistory)},
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Spec',html:d=>`<dl class="kv">
   <dt>Capacity</dt><dd>${d.capacityTB} TB (family ${esc(d.capacityRangeTB)} TB) &middot; ${esc(d.formFactor)}</dd>
   <dt>Recording</dt><dd>${esc(d.recording)}${isSMR(d)?' &mdash; avoid for ZFS / RAID rebuilds and NAS write loads':''}</dd>
   <dt>Mechanics</dt><dd>${d.rpm} rpm &middot; ${d.cacheMB} MB cache &middot; ${d.heliumSealed?'helium-sealed':'air'}</dd>
   <dt>Interface</dt><dd>${esc(d.interface)}</dd>
   <dt>Reliability</dt><dd>${d.workloadTByr?d.workloadTByr+' TB/yr workload':'?'} &middot; MTBF ${mtbf(d.mtbfHours)} &middot; ${d.warrantyYears}-year warranty</dd>
   <dt>Idle power</dt><dd>${d.avgIdleWatts!=null?d.avgIdleWatts+' W':'?'}</dd>
 </dl>`}
];
