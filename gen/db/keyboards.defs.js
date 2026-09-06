const money=d=>d.priceUSD==null?'<span class="price">&mdash;</span>':
  `<span class="price">$${d.priceUSD}<small>${esc(d.priceNote||'')}</small></span>`;
const SPLIT={'fully-separate':['Fully separate','t-yes'],'unibody-split':['Unibody split','t-part'],'adjustable-bridge':['Adjustable bridge','t-part']};
const LAY={'columnar-stagger':'Column-stagger','row-stagger':'Row-stagger','ortholinear':'Ortholinear','ortho':'Ortholinear'};
const TENT={'built-in':['Built-in','t-yes'],'kit accessory':['Kit accessory','t-part'],'none / DIY':['None / DIY','t-neutral'],'none':['None','t-neutral']};
const POINT=v=>v==null||v==='none'?tag('None','t-neutral')
  :/built-in/i.test(v)?tag(v,'t-yes'):tag(v,'t-part');

const COLUMNS=[
 {id:'name',hideable:false,label:'Keyboard',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)}</span>`},
 {id:'price',label:'Price (USD)',sort:d=>d.priceUSD,cell:money},
 {id:'split',label:'Split type',cell:d=>{const s=SPLIT[d.splitType];return s?tag(s[0],s[1]):esc(d.splitType);}},
 {id:'layout',label:'Layout',cell:d=>tag(LAY[d.layout]||d.layout,'t-neutral')},
 {id:'keys',label:'Keys',sort:d=>d.keys,cell:d=>`<span class="price">${d.keys??'?'}</span><span class="sub">${d.thumbKeysPerHand!=null?d.thumbKeysPerHand+' thumb / hand':''}</span>`},
 {id:'switches',label:'Switches',cell:d=>tag(d.switchProfile||'?','t-neutral')+
   (d.hotswap===true?tag('Hot-swap','t-yes'):d.hotswap==='optional'?tag('Hot-swap opt.','t-part'):tag('Soldered','t-no'))},
 {id:'keycaps',label:'Keycaps',cell:d=>yn(d.keycapsIncluded,'Included','Not incl.')},
 {id:'conn',label:'Connection',cell:d=>{
   const h=(d.hostConnection||[]).map(x=>tag(x,/wired/i.test(x)?'t-neutral':'t-yes')).join('');
   const w=d.wireless===true?tag('Wireless','t-yes'):d.wireless==='optional'?tag('Wireless opt.','t-part'):'';
   return h+w+`<span class="sub">halves: ${esc(d.interHalfLink||'?')}</span>`;
 }},
 {id:'firmware',label:'Firmware',cell:d=>tag(d.firmware||'?',/QMK|ZMK|VIA|Vial/i.test(d.firmware||'')?'t-yes':'t-part')},
 {id:'tenting',label:'Tenting',sort:d=>({'built-in':0,'kit accessory':1,'none / DIY':2,'none':2}[d.tenting]??3),cell:d=>{const t=TENT[d.tenting];return t?tag(t[0],t[1]):esc(d.tenting);}},
 {id:'pointing',label:'Pointing device',sort:d=>d.pointingDevice==null||d.pointingDevice==='none'?2:/built-in/i.test(d.pointingDevice)?0:1,cell:d=>POINT(d.pointingDevice)},
 {id:'assembly',label:'Assembly',sort:d=>({'prebuilt':0}[d.assembly]??(/hotswap/i.test(d.assembly||'')?1:/solder/i.test(d.assembly||'')?2:3)),cell:d=>tag(d.assembly||'?',/prebuilt/i.test(d.assembly||'')?'t-yes':/solder/i.test(d.assembly||'')?'t-no':'t-part')+
   `<span class="sub">${esc(d.availability||'')}</span>`},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'sep',label:'Fully separate halves',test:d=>d.splitType==='fully-separate'},
 {id:'col',label:'Column-stagger',test:d=>/columnar/.test(d.layout||'')},
 {id:'wl',label:'Wireless (native or option)',test:d=>d.wireless===true||d.wireless==='optional'},
 {id:'hs',label:'Hot-swap',test:d=>d.hotswap===true},
 {id:'pt',label:'Trackball / trackpad',test:d=>d.pointingDevice&&d.pointingDevice!=='none'},
 {id:'tb',label:'Built-in tenting',test:d=>d.tenting==='built-in'},
 {id:'pb',label:'Prebuilt',test:d=>d.assembly==='prebuilt'},
 {id:'oss',label:'QMK / ZMK / VIA',test:d=>/QMK|ZMK|VIA|Vial/i.test(d.firmware||'')},
 {id:'kc',label:'Keycaps included',test:d=>d.keycapsIncluded===true},
 {id:'sm',label:'≤ 44 keys',test:d=>d.keys!=null&&d.keys<=44}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSD??-1)-(a.priceUSD??-1)},
 {id:'keys',label:'Key count ↑',cmp:(a,b)=>(a.keys??1e9)-(b.keys??1e9)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'What the price covers',html:d=>esc(d.priceNote)},
 {label:'Spec',html:d=>`<dl class="kv">
   <dt>Split</dt><dd>${esc(d.splitType)}</dd>
   <dt>Layout</dt><dd>${esc(d.layout)} &middot; ${d.keys} keys &middot; ${d.thumbKeysPerHand} thumb/hand</dd>
   <dt>Switches</dt><dd>${esc(d.switchProfile)} &middot; hot-swap: ${esc(String(d.hotswap))}</dd>
   <dt>Link between halves</dt><dd>${esc(d.interHalfLink)}</dd>
   <dt>Host</dt><dd>${esc((d.hostConnection||[]).join(', '))}${d.wireless===true?' &middot; wireless':d.wireless==='optional'?' &middot; wireless optional':''}</dd>
   <dt>Firmware</dt><dd>${esc(d.firmware)}</dd>
   <dt>Tenting</dt><dd>${esc(d.tenting)}</dd>
   <dt>Palm rests</dt><dd>${esc(d.palmRests)}</dd>
   <dt>Pointing device</dt><dd>${esc(d.pointingDevice)}</dd>
   <dt>OS</dt><dd>${esc(d.os)}</dd>
   <dt>Assembly</dt><dd>${esc(d.assembly)} &middot; ${esc(d.availability)}</dd>
 </dl>`}
];
