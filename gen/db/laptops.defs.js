const BUCKET={'under $500':['< $500','t-yes'],'under $1000':['< $1000','t-yes'],
  'under $1500':['< $1500','t-part'],'under $2000':['< $2000','t-part'],'$2000+':['$2000+','t-neutral']};
const CAT={'budget':'t-neutral','ultrabook':'t-part','mainstream':'t-neutral','gaming':'t-part','workstation':'t-part','2-in-1':'t-neutral'};
const linTag=v=>{v=v||'';return /excellent|^good/i.test(v)?tag(v,'t-yes'):/fair/i.test(v)?tag(v,'t-part'):tag(v,'t-no');};
const repTag=v=>{v=v||'';return /excellent/i.test(v)?tag(v,'t-yes'):/^good|fair/i.test(v)?tag(v,'t-part'):tag(v,'t-no');};
const money=d=>d.priceUSDStart==null?'<span class="price">&mdash;</span>':
  `<span class="price">$${d.priceUSDStart.toLocaleString()}<small>${esc(d.priceNote||'')}</small></span>`;
const touch=d=>{
  if(d.category==='2-in-1') return 'yes';
  const t=`${d.display||''} ${d.displayOptions||''} ${d.notes||''}`;
  if(/touch/i.test(t)) return 'yes';
  if(d.brand==='Apple') return 'no';
  if(d.category==='gaming'||d.category==='workstation') return 'rare';
  return 'option';
};
const TOUCH={yes:['Touchscreen','t-yes'],no:['No touch','t-no'],rare:['Usually none','t-neutral'],option:['Optional on some','t-part']};
const BAND_ORDER=['under $500','under $1000','under $1500','under $2000','$2000+'];

// Chassis / build quality — heuristic from brand, line and class (not a per-SKU spec).
function chassis(d){
  const n=d.name, b=d.brand, cat=d.category, p=d.priceUSDStart||0;
  const m=(label)=>({label,metal:true}), h=(label)=>({label,metal:'part'}), pl=(label)=>({label,metal:false});
  if(b==='Apple') return m('CNC aluminium unibody');
  if(b==='Framework') return h('Aluminium + magnesium, fully repairable');
  if(b==='Razer') return m('CNC aluminium unibody');
  if(b==='Microsoft') return m('Magnesium-alloy unibody');
  if(b==='LG') return h('Magnesium-alloy (very light, some flex)');
  if(b==='Samsung') return m('Aluminium');
  if(b==='Dell'){
    if(/XPS/i.test(n)) return m('CNC aluminium + carbon-fibre / glass deck');
    if(/Alienware/i.test(n)) return h('Magnesium-alloy + aluminium (gaming)');
    if(/Latitude|Pro Max|Pro 1[46]/i.test(n)) return h('Aluminium / carbon-fibre');
    return pl('Aluminium lid + polymer base');
  }
  if(b==='Lenovo'){
    if(/X1|X9|Nano|Aura/i.test(n)) return m('Carbon-fibre + magnesium');
    if(/ThinkPad|ThinkBook/i.test(n)) return h('Magnesium-alloy + reinforced polymer');
    if(/Yoga (Pro )?9/i.test(n)) return m('Aluminium unibody');
    if(/Legion Pro 7|Legion 9/i.test(n)) return m('Aluminium (gaming)');
    if(/Legion|LOQ/i.test(n)) return pl('Aluminium lid + polymer base');
    return pl('Polymer with aluminium accents');
  }
  if(b==='HP'){
    if(/Spectre|OmniBook Ultra|EliteBook Ultra|Dragonfly|ZBook Ultra/i.test(n)) return m('CNC aluminium');
    if(/EliteBook|ZBook/i.test(n)) return h('Aluminium / magnesium');
    if(/Omen (Max|Transcend)/i.test(n)) return m('Aluminium (gaming)');
    return pl('Aluminium lid + polymer');
  }
  if(b==='ASUS'){
    if(/Zenbook|ProArt|ROG Zephyrus|ROG Flow/i.test(n)) return m('Aluminium / magnesium-alloy');
    if(/ROG Strix Scar/i.test(n)) return h('Aluminium lid + polymer base (gaming)');
    if(/TUF|Vivobook|ROG Strix G/i.test(n)) return pl('Aluminium lid + polymer base');
    return pl('Polymer');
  }
  if(b==='Acer'){
    if(/Swift (Edge|X|Go 14)/i.test(n)) return h('Aluminium / magnesium');
    if(/Predator/i.test(n)) return h('Aluminium lid + polymer base (gaming)');
    return pl('Polymer (plastic)');
  }
  if(b==='MSI'){
    if(/Titan|Stealth|Prestige/i.test(n)) return m('Aluminium (gaming/creator)');
    return pl('Aluminium lid + polymer base');
  }
  if(cat==='budget') return pl('Polymer (plastic)');
  if(cat==='ultrabook') return m('Aluminium');
  if(cat==='gaming') return p>=1800?h('Aluminium (premium gaming)'):pl('Aluminium lid + polymer base');
  return h('Mixed aluminium / polymer');
}
const CHASSIS_TAG={true:['Full metal','t-yes'],part:['Metal + polymer','t-part'],false:['Polymer','t-no']};

const COLUMNS=[
 {id:'name',hideable:false,label:'Laptop',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear}</span>`},
 {id:'bucket',label:'Price band',sort:d=>BAND_ORDER.indexOf(d.priceBucket),cell:d=>{const b=BUCKET[d.priceBucket];return b?tag(b[0],b[1]):esc(d.priceBucket);}},
 {id:'price',label:'Start price',sort:d=>d.priceUSDStart,cell:money},
 {id:'cat',label:'Category',cell:d=>tag(d.category,CAT[d.category]||'t-neutral')},
 {id:'build',label:'Build quality',sort:d=>({true:0,part:1,false:2}[chassis(d).metal]),cell:d=>{const c=chassis(d),t=CHASSIS_TAG[c.metal];return tag(t[0],t[1])+`<span class="sub">${esc(c.label)}</span>`;}},
 {id:'touch',label:'Touchscreen',sort:d=>({yes:0,option:1,rare:2,no:3}[touch(d)]),cell:d=>{const t=TOUCH[touch(d)];return tag(t[0],t[1]);}},
 {id:'cpu',label:'CPU options',cell:d=>`<span style="font-size:11.5px">${esc(d.cpuOptions)}</span>`},
 {id:'gpu',label:'GPU options',cell:d=>`<span style="font-size:11.5px">${esc(d.gpuOptions)}</span>`},
 {id:'ram',label:'RAM',cell:d=>`<span style="font-size:12px">${esc(d.ram)}</span>`+(d.ramUpgradeable?tag('Upgradeable','t-yes'):tag('Soldered','t-no'))},
 {id:'storage',label:'Storage',cell:d=>`<span style="font-size:12px">${esc(d.storage)}</span>`+(d.storageUpgradeable?tag('Upgradeable','t-yes'):tag('Soldered','t-no'))},
 {id:'display',label:'Display',sort:d=>d.sizeInches,cell:d=>`<span class="price">${d.sizeInches}"</span><span class="sub">${esc(d.display)}</span>`},
 {id:'weight',label:'Weight',sort:d=>d.weightKg,cell:d=>d.weightKg!=null?`<span class="price">${d.weightKg} kg</span>`:'&mdash;'},
 {id:'battery',label:'Battery',sort:d=>d.batteryWh,cell:d=>`<span class="price">${d.batteryWh?d.batteryWh+' Wh':'?'}</span><span class="sub">${esc(d.batteryLife||'')}</span>`},
 {id:'ports',label:'Ports',cell:d=>`<span style="font-size:11.5px">${esc(d.ports)}</span>`},
 {id:'charge',label:'Charge',sort:d=>d.chargeW,cell:d=>d.chargeW?`<span class="price">${d.chargeW} W</span>`:'&mdash;'},
 {id:'os',label:'OS',cell:d=>`<span style="font-size:12px">${esc(d.os)}</span>`},
 {id:'linux',label:'Linux',sort:d=>/excellent/i.test(d.linuxSupport||'')?0:/^good/i.test(d.linuxSupport||'')?1:/fair/i.test(d.linuxSupport||'')?2:3,cell:d=>linTag(d.linuxSupport)},
 {id:'repair',label:'Repairability',sort:d=>/excellent/i.test(d.repairability||'')?0:/^good/i.test(d.repairability||'')?1:/fair/i.test(d.repairability||'')?2:3,cell:d=>repTag(d.repairability)},
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
 {id:'tch',label:'Touchscreen',test:d=>touch(d)==='yes'},
 {id:'metal',label:'Full-metal chassis',test:d=>chassis(d).metal===true},
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
   <dt>Chassis</dt><dd>${esc(chassis(d).label)} <span style="opacity:.7">(heuristic by line, not per-SKU)</span></dd>
   <dt>Touchscreen</dt><dd>${({yes:'yes',no:'no (not offered)',rare:'rarely offered on this class',option:'optional on some configs'})[touch(d)]}</dd>
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
