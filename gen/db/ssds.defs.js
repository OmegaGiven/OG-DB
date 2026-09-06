const GEN={5:['PCIe 5.0','t-yes'],4:['PCIe 4.0','t-part'],3:['PCIe 3.0','t-neutral'],0:['SATA','t-neutral']};
const isQLC=d=>/QLC/i.test(d.nand||'');
const hasDram=d=>/^DRAM/i.test(d.dram||'');
const cap=d=>d.capacityGB>=1000?(d.capacityGB/1000)+' TB':d.capacityGB+' GB';
const k=n=>n==null?'?':n>=1e6?(n/1e6).toFixed(2).replace(/\.?0+$/,'')+'M':n>=1000?Math.round(n/1000)+'K':String(n);

const COLUMNS=[
 {id:'name',hideable:false,label:'SSD',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${esc(d.family)} &middot; ${esc(d.capacityRangeGB)} GB range</span>`},
 {id:'price',label:'Price (trend)',sort:d=>d.priceUSD,cell:d=>sparkline(d.priceHistory)+`<span class="sub">$${d.pricePerTB}/TB</span>`},
 {id:'ppt',label:'$/TB',sort:d=>d.pricePerTB,cell:d=>`<span class="price">$${d.pricePerTB}</span>`},
 {id:'cap',label:'Capacity',sort:d=>d.capacityGB,cell:d=>`<span class="price">${cap(d)}</span><span class="sub">${esc(d.formFactor)}</span>`},
 {id:'iface',label:'Interface',sort:d=>-(d.pcieGen||0),cell:d=>{const g=GEN[d.pcieGen]||['?','t-neutral'];return tag(g[0],g[1])+`<span class="sub">${esc(d.interface)}</span>`;}},
 {id:'dram',label:'DRAM',sort:d=>hasDram(d)?0:1,cell:d=>hasDram(d)?tag('DRAM','t-yes'):tag('DRAM-less','t-part')+`<span class="sub">${esc(d.dram)}</span>`},
 {id:'nand',label:'NAND',sort:d=>isQLC(d)?1:0,cell:d=>(isQLC(d)?tag('QLC','t-no'):/TLC/i.test(d.nand||'')?tag('TLC','t-yes'):tag('varies','t-part'))+`<span class="sub">${esc(d.nand)}</span>`},
 {id:'ctrl',label:'Controller',cell:d=>`<span style="font-size:12px">${esc(d.controller)}</span>`},
 {id:'seq',label:'Seq read / write',sort:d=>d.seqReadMBs,cell:d=>`<span class="price">${d.seqReadMBs?d.seqReadMBs.toLocaleString():'?'}</span><span class="sub">${d.seqWriteMBs?d.seqWriteMBs.toLocaleString():'?'} MB/s write</span>`},
 {id:'rand',label:'4K random IOPS',sort:d=>d.randRead4KIOPS,cell:d=>d.randRead4KIOPS?`<span class="price">${k(d.randRead4KIOPS)}</span><span class="sub">${k(d.randWrite4KIOPS)} write</span>`:'<span style="color:var(--ink-soft)">n/p</span>'},
 {id:'tbw',label:'Endurance',sort:d=>d.tbwRating,cell:d=>`<span class="price">${d.tbwRating?d.tbwRating.toLocaleString()+' TBW':'?'}</span><span class="sub">${d.warrantyYears} yr warranty</span>`},
 {id:'hs',label:'Heatsink SKU',cell:d=>yn(d.heatsinkOption,'Available','No')},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'g5',label:'PCIe 5.0',test:d=>d.pcieGen===5},
 {id:'g4',label:'PCIe 4.0',test:d=>d.pcieGen===4},
 {id:'g3',label:'PCIe 3.0',test:d=>d.pcieGen===3},
 {id:'sata',label:'SATA',test:d=>d.pcieGen===0},
 {id:'dram',label:'Has DRAM',test:hasDram},
 {id:'tlc',label:'TLC only',test:d=>/TLC/i.test(d.nand||'')&&!isQLC(d)},
 {id:'noqlc',label:'Hide QLC',test:d=>!isQLC(d)},
 {id:'c2',label:'≥ 2 TB',test:d=>d.capacityGB>=2000},
 {id:'c4',label:'≥ 4 TB',test:d=>d.capacityGB>=4000},
 {id:'cheap',label:'≤ $120 / TB',test:d=>d.pricePerTB!=null&&d.pricePerTB<=120},
 {id:'w5',label:'5-yr warranty',test:d=>d.warrantyYears>=5},
 {id:'down',label:'Price falling',test:d=>priceTrend(d.priceHistory)==='down'}
];

const SORTS=[
 {id:'ppt',label:'$/TB ↑',cmp:(a,b)=>(a.pricePerTB??1e9)-(b.pricePerTB??1e9)},
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'seq',label:'Seq read ↓',cmp:(a,b)=>(b.seqReadMBs??0)-(a.seqReadMBs??0)},
 {id:'tbw',label:'Endurance ↓',cmp:(a,b)=>(b.tbwRating??0)-(a.tbwRating??0)},
 {id:'cap',label:'Capacity ↓',cmp:(a,b)=>(b.capacityGB??0)-(a.capacityGB??0)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Price history',html:d=>priceChart(d.priceHistory)},
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Spec',html:d=>`<dl class="kv">
   <dt>Capacity</dt><dd>${cap(d)} (family: ${esc(d.capacityRangeGB)} GB) &middot; ${esc(d.formFactor)}</dd>
   <dt>Interface</dt><dd>${esc(d.interface)}</dd>
   <dt>DRAM</dt><dd>${esc(d.dram)}</dd>
   <dt>NAND</dt><dd>${esc(d.nand)}</dd>
   <dt>Controller</dt><dd>${esc(d.controller)}</dd>
   <dt>Sequential</dt><dd>${d.seqReadMBs?.toLocaleString()} / ${d.seqWriteMBs?.toLocaleString()} MB/s</dd>
   <dt>4K random</dt><dd>${d.randRead4KIOPS?k(d.randRead4KIOPS)+' / '+k(d.randWrite4KIOPS)+' IOPS':'not published'}</dd>
   <dt>Endurance</dt><dd>${d.tbwRating?.toLocaleString()} TBW &middot; ${d.warrantyYears}-year warranty</dd>
   <dt>Heatsink SKU</dt><dd>${d.heatsinkOption?'available':'no'}</dd>
 </dl>`}
];
