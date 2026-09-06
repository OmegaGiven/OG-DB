const money=d=>d.priceUSD==null?'<span class="price">&mdash;</span>':
  `<span class="price">$${d.priceUSD}<small>${esc(d.priceNote||'')}</small></span>`;
const SHAPE={'ergo right-hand':['Ergo (right)','t-neutral'],'ambidextrous':['Ambidextrous','t-neutral'],
  'vertical':['Vertical','t-part'],'trackball':['Trackball','t-part'],'MMO ergo':['MMO ergo','t-part']};
const freeSpin=s=>/free-spin|smartshift|stepless/i.test(s||'');
const hasToggle=s=>/toggle|smartshift/i.test(s||'');
const multiHost=d=>d.multiDevice&&!/^none/i.test(d.multiDevice);

const COLUMNS=[
 {id:'name',hideable:false,label:'Mouse',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)}</span>`},
 {id:'price',label:'Price (USD)',sort:d=>d.priceUSD,cell:money},
 {id:'shape',label:'Shape',cell:d=>{const s=SHAPE[d.shape];return s?tag(s[0],s[1]):esc(d.shape);}},
 {id:'side',label:'Side buttons',sort:d=>d.sideButtons,cell:d=>`<span class="price">${d.sideButtons??'?'}</span><span class="sub">${d.buttonsTotal!=null?d.buttonsTotal+' total':''}</span>`},
 {id:'scroll',label:'Scroll wheel',sort:d=>freeSpin(d.scrollWheel)?(hasToggle(d.scrollWheel)?0:1):/ratchet only/i.test(d.scrollWheel||'')?2:3,cell:d=>{
   const t=freeSpin(d.scrollWheel)?tag(hasToggle(d.scrollWheel)?'Free-spin + toggle':'Free-spin','t-yes')
     :/ratchet only/i.test(d.scrollWheel||'')?tag('Ratchet only','t-neutral')
     :tag('No wheel','t-part');
   return t+`<span class="sub">${esc(d.scrollWheel||'')}</span>`;
 }},
 {id:'extra',label:'Tilt / thumb wheel',cell:d=>
   (d.tiltScroll===true?tag('Tilt scroll','t-yes'):tag('No tilt','t-no'))+
   (d.thumbWheel===true?tag('Thumb wheel','t-yes'):'')},
 {id:'conn',label:'Connection',cell:d=>(d.connection||[]).map(x=>tag(x,/wired/i.test(x)?'t-neutral':'t-yes')).join('')||
   (d.wireless===false?tag('Wired only','t-neutral'):'')},
 {id:'multi',label:'Multi-device',sort:d=>multiHost(d)?0:1,cell:d=>multiHost(d)
   ?tag('Multi-host','t-yes')+`<span class="sub">${esc(d.multiDevice)}</span>`
   :tag('Single host','t-neutral')},
 {id:'sensor',label:'Sensor',cell:d=>`<span style="font-size:12px">${esc(d.sensor||'?')}</span>`},
 {id:'dpi',label:'DPI / polling',sort:d=>d.maxDPI,cell:d=>`<span class="price">${d.maxDPI?d.maxDPI.toLocaleString():'?'}</span><span class="sub">${esc(d.pollingHz||'')} Hz</span>`},
 {id:'weight',label:'Weight',sort:d=>d.weightG,cell:d=>d.weightG!=null?`<span class="price">${d.weightG} g</span>`:'&mdash;'},
 {id:'onboard',label:'Onboard memory',cell:d=>yn(d.onboardMemory,'Yes','No')},
 {id:'software',label:'Software',cell:d=>`<span style="font-size:12px">${esc(d.software||'?')}</span>`},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'multi',label:'Multi-host switching',test:d=>multiHost(d)},
 {id:'free',label:'Free-spin / toggle wheel',test:d=>freeSpin(d.scrollWheel)},
 {id:'tog',label:'Ratchet↔free toggle',test:d=>hasToggle(d.scrollWheel)||/button toggle/i.test(d.scrollWheel||'')},
 {id:'side6',label:'6+ side buttons',test:d=>d.sideButtons!=null&&d.sideButtons>=6},
 {id:'tilt',label:'Tilt scroll',test:d=>d.tiltScroll===true},
 {id:'thumb',label:'Thumb wheel',test:d=>d.thumbWheel===true},
 {id:'bt',label:'Has Bluetooth',test:d=>(d.connection||[]).some(x=>/bluetooth/i.test(x))},
 {id:'wired',label:'Wired option',test:d=>(d.connection||[]).some(x=>/wired/i.test(x))},
 {id:'tb',label:'Trackball',test:d=>d.shape==='trackball'},
 {id:'vert',label:'Vertical',test:d=>d.shape==='vertical'},
 {id:'ob',label:'Onboard memory',test:d=>d.onboardMemory===true},
 {id:'light',label:'≤ 70 g',test:d=>d.weightG!=null&&d.weightG<=70}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSD??-1)-(a.priceUSD??-1)},
 {id:'wt',label:'Weight ↑',cmp:(a,b)=>(a.weightG??1e9)-(b.weightG??1e9)},
 {id:'side',label:'Side buttons ↓',cmp:(a,b)=>(b.sideButtons??-1)-(a.sideButtons??-1)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Price',html:d=>esc(d.priceNote)},
 {label:'Connectivity',html:d=>`<dl class="kv">
   <dt>Links</dt><dd>${esc((d.connection||[]).join(', '))}</dd>
   <dt>Multi-device</dt><dd>${esc(d.multiDevice||'single host')}</dd>
   <dt>Battery</dt><dd>${esc(d.battery||'n/a')}</dd>
 </dl>`},
 {label:'Spec',html:d=>`<dl class="kv">
   <dt>Scroll wheel</dt><dd>${esc(d.scrollWheel)}</dd>
   <dt>Tilt / thumb wheel</dt><dd>tilt: ${d.tiltScroll?'yes':'no'} &middot; thumb wheel: ${d.thumbWheel?'yes':'no'}</dd>
   <dt>Buttons</dt><dd>${d.buttonsTotal} total &middot; ${d.sideButtons} thumb-side</dd>
   <dt>Sensor</dt><dd>${esc(d.sensor)} &middot; ${d.maxDPI?d.maxDPI.toLocaleString():'?'} DPI &middot; ${esc(d.pollingHz)} Hz</dd>
   <dt>Weight</dt><dd>${d.weightG!=null?d.weightG+' g':'?'}</dd>
   <dt>Onboard memory</dt><dd>${d.onboardMemory?'yes':'no'}</dd>
   <dt>Software</dt><dd>${esc(d.software)}</dd>
   <dt>OS</dt><dd>${esc(d.os)}</dd>
 </dl>`}
];
