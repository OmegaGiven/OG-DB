const CAT={'camera AI glasses':'t-neutral','audio glasses':'t-neutral','HUD glasses (mono)':'t-part','HUD glasses (colour)':'t-part','AR display glasses':'t-yes','enterprise AR':'t-yes'};
const RISK={low:['Low','t-yes'],medium:['Medium','t-part'],high:['High','t-no']};
const money=d=>d.priceUSD==null?'<span class="price">&mdash;</span>':`<span class="price">$${d.priceUSD.toLocaleString()}<small>${esc(d.priceNote||'')}</small></span>`;
const dispKind=d=>{const x=(d.display||'none').toLowerCase();if(x==='none')return['No display','t-no'];const col=/colour|color/.test(x);const bi=/binocular/.test(x);return[(bi?'Binocular ':'Monocular ')+(col?'colour':'mono'),col?'t-yes':'t-part'];};
const audKind=d=>{const a=(d.audio||'none').toLowerCase();if(a==='none')return['No audio','t-no'];if(/bone/.test(a))return['Bone conduction','t-part'];return['Open-ear speakers','t-yes'];};

const COLUMNS=[
 {id:'name',hideable:false,label:'Glasses',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear}</span>`},
 {id:'price',label:'Price',sort:d=>d.priceUSD,cell:money},
 {id:'cat',label:'Category',sort:d=>({'audio glasses':0,'camera AI glasses':1,'HUD glasses (mono)':2,'HUD glasses (colour)':3,'AR display glasses':4,'enterprise AR':5}[d.category]??9),cell:d=>tag(d.category,CAT[d.category]||'t-neutral')},
 {id:'disp',label:'Display',sort:d=>{const x=(d.display||'none').toLowerCase();return x==='none'?9:(/binocular/.test(x)?0:2)+(/colour|color/.test(x)?0:1);},cell:d=>{const k=dispKind(d);return tag(k[0],k[1])+(d.display!=='none'?`<span class="sub">${esc(d.displayTech)}${d.fovDeg?` &middot; ${d.fovDeg}° FOV`:''}${d.brightnessNits?` &middot; ${d.brightnessNits} nits`:''}</span>`:'');}},
 {id:'ui',label:'Graphic UI',sort:d=>d.graphicInterface?0:1,cell:d=>yn(d.graphicInterface,'App UI / nav','Audio + capture only')},
 {id:'audio',label:'Audio',sort:d=>{const a=(d.audio||'none').toLowerCase();return a==='none'?2:/bone/.test(a)?1:0;},cell:d=>{const k=audKind(d);return tag(k[0],k[1])+(d.audioNote?`<span class="sub">${esc(d.audioNote)}</span>`:'');}},
 {id:'cam',label:'Camera',sort:d=>d.cameraMP??-1,cell:d=>{if(!d.camera||d.camera==='none')return tag('No camera','t-yes');return tag((d.cameraMP?d.cameraMP+' MP':'camera'),'t-part')+`<span class="sub">${esc(d.videoMax||'')}${d.micArray?` &middot; ${esc(d.micArray)} mic`:''}</span>`;}},
 {id:'sub',label:'Subscription',sort:d=>d.subscriptionRequired?1:0,cell:d=>(d.subscriptionRequired?tag('Required','t-no'):tag('Not required','t-yes'))+(d.subscriptionNote?`<span class="sub">${esc(d.subscriptionNote)}</span>`:'')},
 {id:'batt',label:'Power',sort:d=>({'built-in':0,'built-in + charging case':1,'external puck/pod':2,'tethered to phone (USB-C)':3}[d.batteryType]??9),cell:d=>tag(d.batteryType||'?',/built-in/.test(d.batteryType||'')?'t-yes':'t-part')+`<span class="sub">${esc(d.battery||'')}</span>`},
 {id:'oss',label:'Open source',sort:d=>d.openSource?0:1,cell:d=>yn(d.openSource,'Open','Closed')},
 {id:'privacy',label:'Privacy risk',sort:d=>({low:0,medium:1,high:2}[d.privacyRisk]??9),cell:d=>{const r=RISK[d.privacyRisk]||[d.privacyRisk,'t-neutral'];return tag(r[0],r[1])+`<span class="sub">${esc(d.privacyNote)}</span>`;}},
 {id:'data',label:'Where data goes',cell:d=>`<span style="font-size:11.5px">${esc(d.dataStorage)}</span>`},
 {id:'plat',label:'Platform',cell:d=>`<span style="font-size:11.5px">${esc(d.platform)}</span>`},
 {id:'weight',label:'Weight',sort:d=>d.weightG,cell:d=>d.weightG!=null?`<span class="price">${d.weightG} g</span>`:'&mdash;'},
 {id:'rx',label:'Prescription',cell:d=>`<span style="font-size:11.5px">${esc(d.prescriptionSupport)}</span>`},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'disp',label:'Has a graphic display',test:d=>d.graphicInterface===true},
 {id:'colour',label:'Colour display',test:d=>/colour|color/i.test(d.display||'')},
 {id:'mono',label:'Monochrome HUD',test:d=>/none/i.test(d.display||'')?false:!/colour|color/i.test(d.display||'')},
 {id:'binoc',label:'Binocular display',test:d=>/binocular/i.test(d.display||'')},
 {id:'nocam',label:'No camera',test:d=>!d.camera||d.camera==='none'},
 {id:'cam',label:'Has camera',test:d=>d.camera&&d.camera!=='none'},
 {id:'audio',label:'Has audio',test:d=>d.audio&&d.audio!=='none'},
 {id:'bone',label:'Bone conduction',test:d=>/bone/i.test(d.audio||'')},
 {id:'nosub',label:'No subscription',test:d=>d.subscriptionRequired===false},
 {id:'builtin',label:'Built-in battery (no puck)',test:d=>/built-in/i.test(d.batteryType||'')},
 {id:'untethered',label:'Standalone (not phone-tethered)',test:d=>!/tethered/i.test(d.batteryType||'')},
 {id:'oss',label:'Open source',test:d=>d.openSource===true},
 {id:'lowrisk',label:'Privacy risk: low',test:d=>d.privacyRisk==='low'},
 {id:'local',label:'On-device / local data',test:d=>/on-device|local|no upload|no cloud/i.test(d.dataStorage||'')},
 {id:'rx',label:'Prescription support',test:d=>/yes/i.test(d.prescriptionSupport||'')},
 {id:'u400',label:'≤ $400',test:d=>d.priceUSD!=null&&d.priceUSD<=400}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSD??-1)-(a.priceUSD??-1)},
 {id:'risk',label:'Privacy risk ↑',cmp:(a,b)=>(({low:0,medium:1,high:2})[a.privacyRisk]??9)-(({low:0,medium:1,high:2})[b.privacyRisk]??9)},
 {id:'cam',label:'Camera MP ↓',cmp:(a,b)=>(b.cameraMP??-1)-(a.cameraMP??-1)},
 {id:'fov',label:'Display FOV ↓',cmp:(a,b)=>(b.fovDeg??-1)-(a.fovDeg??-1)},
 {id:'wt',label:'Weight ↑',cmp:(a,b)=>(a.weightG??999)-(b.weightG??999)},
 {id:'yr',label:'Newest first',cmp:(a,b)=>b.releaseYear-a.releaseYear},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Standout',html:d=>esc(d.standout)},
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Display & audio',html:d=>`<dl class="kv">
   <dt>Display</dt><dd>${esc(d.display)}${d.display!=='none'?` &middot; ${esc(d.displayTech)}${d.fovDeg?` &middot; ${d.fovDeg}° FOV`:''}${d.brightnessNits?` &middot; ${d.brightnessNits} nits`:''}`:''}</dd>
   <dt>Graphic interface</dt><dd>${d.graphicInterface?'yes — shows app UI / notifications / navigation':'no — audio + capture only'}</dd>
   <dt>Audio</dt><dd>${esc(d.audio)}${d.audioNote?' — '+esc(d.audioNote):''}</dd>
   <dt>Camera</dt><dd>${esc(d.camera)}${d.micArray?' &middot; '+esc(d.micArray)+' mic array':''}</dd>
 </dl>`},
 {label:'Power & platform',html:d=>`<dl class="kv">
   <dt>Battery</dt><dd>${esc(d.batteryType)} &mdash; ${esc(d.battery)}</dd>
   <dt>Platform</dt><dd>${esc(d.platform)}</dd>
   <dt>Open source</dt><dd>${d.openSource?'yes':'no'}</dd>
   <dt>Prescription</dt><dd>${esc(d.prescriptionSupport)}</dd>
   <dt>Weight</dt><dd>${d.weightG!=null?d.weightG+' g':'?'}</dd>
 </dl>`},
 {label:'Privacy & data',html:d=>`<dl class="kv">
   <dt>Risk</dt><dd>${esc(d.privacyRisk)} &mdash; ${esc(d.privacyNote)}</dd>
   <dt>Where captured data goes</dt><dd>${esc(d.dataStorage)}</dd>
   <dt>Subscription</dt><dd>${d.subscriptionRequired?'required':'not required'}${d.subscriptionNote?' &mdash; '+esc(d.subscriptionNote):''}</dd>
 </dl>`},
 {label:'Price',html:d=>esc(d.priceNote)}
];
