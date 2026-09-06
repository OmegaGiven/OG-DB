const CST={'toolchanger (no purge)':['Toolchanger','t-yes'],'dual nozzle (IDEX/2-in-1)':['Dual nozzle','t-yes'],'multi-spool feeder + purge':['Multi-spool + purge','t-part'],'MMU (single nozzle, purge)':['MMU + purge','t-part'],'manual swap':['Manual swap','t-neutral'],'none':['None','t-no']};
const CSORD={'toolchanger (no purge)':0,'dual nozzle (IDEX/2-in-1)':1,'multi-spool feeder + purge':2,'MMU (single nozzle, purge)':3,'manual swap':4,'none':5};
const money=d=>d.priceUSD==null?'<span class="price">&mdash;</span>':`<span class="price">$${d.priceUSD.toLocaleString()}<small>${esc(d.priceNote||'')}</small></span>`;
const isResin=d=>/resin/i.test(d.tech||'');
const encTag=d=>d.enclosed===true?tag('Enclosed','t-yes'):d.enclosed==='optional kit'?tag('Enclosure kit','t-part'):tag('Open frame','t-neutral');
const fw=d=>/klipper/i.test(d.firmware||'')?'t-yes':/closed/i.test(d.firmware||'')?'t-part':'t-neutral';

const COLUMNS=[
 {id:'name',hideable:false,label:'Printer',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear} &middot; ${esc(d.tech)}</span>`},
 {id:'price',label:'Price',sort:d=>d.priceUSD,cell:money},
 {id:'vol',label:'Build volume',sort:d=>d.buildVolumeL,cell:d=>`<span class="price">${esc(d.buildVolumeMm)} mm</span><span class="sub">${d.buildVolumeL!=null?d.buildVolumeL+' L':''}${d.buildVolumeL&&d.priceUSD?` &middot; $${Math.round(d.priceUSD/d.buildVolumeL)}/L`:''}</span>`},
 {id:'color',label:'Multi-colour',sort:d=>CSORD[d.colorSystemType]??9,cell:d=>{const c=CST[d.colorSystemType]||[d.colorSystemType,'t-neutral'];return (d.multiColor?tag(c[0],c[1]):tag('Single colour','t-neutral'))+(d.maxColors>1?`<span class="sub">up to ${d.maxColors} colours &middot; purge waste: ${esc(d.purgeWaste)}</span>`:'');}},
 {id:'colsys',label:'Colour system',cell:d=>`<span style="font-size:11.5px">${esc(d.colorSystem)}</span>`},
 {id:'head',label:'Hotend / extruder',sort:d=>d.nozzleMaxC,cell:d=>isResin(d)?tag('Resin (LCD)','t-neutral'):tag(d.extruder,/direct|toolchanger|dual/i.test(d.extruder||'')?'t-yes':'t-part')+`<span class="sub">${esc(d.hotend)}</span>`},
 {id:'noz',label:'Nozzle max',sort:d=>d.nozzleMaxC,cell:d=>d.nozzleMaxC?`<span class="price">${d.nozzleMaxC} &deg;C</span><span class="sub">${esc(d.nozzleSwap||'')}</span>`:'&mdash;'},
 {id:'motion',label:'Motion',sort:d=>({'CoreXY':0,'toolchanger':0,'Cartesian XZ':1,'gantry (large)':2,'bedslinger (i3)':3,'delta':4,'resin':5}[d.motion]??9),cell:d=>tag(d.motion,/corexy/i.test(d.motion||'')?'t-yes':'t-neutral')},
 {id:'enc',label:'Enclosure',sort:d=>d.enclosed===true?0:d.enclosed==='optional kit'?1:2,cell:d=>encTag(d)+(d.activeChamberHeat?tag('Heated chamber','t-yes'):'')},
 {id:'speed',label:'Speed / accel',sort:d=>d.maxSpeedMms,cell:d=>d.maxSpeedMms?`<span class="price">${d.maxSpeedMms} mm/s</span><span class="sub">${d.maxAccelMms2?d.maxAccelMms2.toLocaleString()+' mm/s²':''}</span>`:'&mdash;'},
 {id:'bed',label:'Bed',sort:d=>d.bedMaxC,cell:d=>`<span style="font-size:11.5px">${esc(d.bedType)}</span>`},
 {id:'level',label:'Levelling',cell:d=>`<span style="font-size:11.5px">${esc(d.autoLevel)}</span>`},
 {id:'smart',label:'Camera / AI',cell:d=>(d.camera?tag('Camera','t-yes'):tag('No camera','t-neutral'))+(d.aiFailDetect?tag('AI fail detect','t-yes'):'')+(d.filamentSensor?tag('Filament sensor','t-neutral'):'')},
 {id:'fw',label:'Firmware',sort:d=>d.openSource?0:1,cell:d=>tag(d.firmware,fw(d))+(d.openSource?tag('Open source','t-yes'):'')},
 {id:'cloud',label:'Cloud',sort:d=>d.cloudRequired?1:0,cell:d=>(d.cloudRequired?tag('Cloud required','t-no'):tag('LAN-only OK','t-yes'))+`<span class="sub">${esc(d.cloudNote)}</span>`},
 {id:'assembly',label:'Assembly',sort:d=>({'fully assembled':0,'semi-assembled (30 min)':1,'kit (hours)':2,'self-source kit (days)':3}[d.assembly]??9),cell:d=>tag(d.assembly,/fully/.test(d.assembly||'')?'t-yes':/semi/.test(d.assembly||'')?'t-part':'t-neutral')},
 {id:'mat',label:'Materials',cell:d=>`<span style="font-size:11.5px">${esc(d.materials)}</span>`},
 {id:'noise',label:'Noise',sort:d=>d.noiseDb,cell:d=>d.noiseDb?`<span class="price">${d.noiseDb} dB</span>`:'&mdash;'},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'fdm',label:'FDM',test:d=>!isResin(d)},
 {id:'resin',label:'Resin',test:isResin},
 {id:'mc',label:'Multi-colour capable',test:d=>d.multiColor===true},
 {id:'tc',label:'Toolchanger / dual nozzle (no purge)',test:d=>/toolchanger|dual nozzle/i.test(d.colorSystemType||'')},
 {id:'enc',label:'Enclosed',test:d=>d.enclosed===true},
 {id:'heat',label:'Heated chamber',test:d=>d.activeChamberHeat===true},
 {id:'corexy',label:'CoreXY',test:d=>/corexy/i.test(d.motion||'')},
 {id:'big',label:'≥ 300 mm bed',test:d=>{const m=String(d.buildVolumeMm||'').match(/(\d+)\s*x\s*(\d+)/);return m&&(Number(m[1])>=300||Number(m[2])>=300);}},
 {id:'hot',label:'Nozzle ≥ 300 °C',test:d=>d.nozzleMaxC!=null&&d.nozzleMaxC>=300},
 {id:'lan',label:'LAN-only / no cloud',test:d=>d.cloudRequired===false},
 {id:'oss',label:'Open source',test:d=>d.openSource===true},
 {id:'klipper',label:'Klipper',test:d=>/klipper/i.test(d.firmware||'')},
 {id:'cam',label:'Camera + AI detection',test:d=>d.camera===true&&d.aiFailDetect===true},
 {id:'u500',label:'≤ $500',test:d=>d.priceUSD!=null&&d.priceUSD<=500},
 {id:'u1000',label:'≤ $1,000',test:d=>d.priceUSD!=null&&d.priceUSD<=1000},
 {id:'ready',label:'Fully assembled',test:d=>/fully/.test(d.assembly||'')}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSD??-1)-(a.priceUSD??-1)},
 {id:'vol',label:'Build volume ↓',cmp:(a,b)=>(b.buildVolumeL??0)-(a.buildVolumeL??0)},
 {id:'ppl',label:'$ per litre ↑',cmp:(a,b)=>((a.priceUSD??1e9)/(a.buildVolumeL||1))-((b.priceUSD??1e9)/(b.buildVolumeL||1))},
 {id:'speed',label:'Speed ↓',cmp:(a,b)=>(b.maxSpeedMms??0)-(a.maxSpeedMms??0)},
 {id:'yr',label:'Newest first',cmp:(a,b)=>b.releaseYear-a.releaseYear},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Colour / material changing',html:d=>`<dl class="kv">
   <dt>Multi-colour</dt><dd>${d.multiColor?'yes':'no'} &middot; ${esc(d.colorSystemType)}</dd>
   <dt>System</dt><dd>${esc(d.colorSystem)}</dd>
   <dt>Max colours</dt><dd>${d.maxColors??'—'} &middot; purge waste: ${esc(d.purgeWaste)}</dd>
 </dl>`},
 {label:'Print head & motion',html:d=>`<dl class="kv">
   <dt>Extruder</dt><dd>${esc(d.extruder)}</dd>
   <dt>Hotend</dt><dd>${esc(d.hotend)} &middot; nozzle change: ${esc(d.nozzleSwap)}</dd>
   <dt>Motion</dt><dd>${esc(d.motion)} &middot; ${d.maxSpeedMms??'?'} mm/s &middot; ${d.maxAccelMms2?d.maxAccelMms2.toLocaleString()+' mm/s²':'?'}</dd>
   <dt>Bed</dt><dd>${esc(d.bedType)} &middot; ${esc(d.autoLevel)}</dd>
   <dt>Enclosure</dt><dd>${d.enclosed===true?'enclosed':d.enclosed==='optional kit'?'optional kit':'open'}${d.activeChamberHeat?' &middot; actively heated chamber':''}</dd>
   <dt>Materials</dt><dd>${esc(d.materials)}</dd>
 </dl>`},
 {label:'Software & cloud',html:d=>`<dl class="kv">
   <dt>Firmware</dt><dd>${esc(d.firmware)}${d.openSource?' &middot; open source':''}</dd>
   <dt>Cloud</dt><dd>${d.cloudRequired?'required':'LAN-only mode available'} &mdash; ${esc(d.cloudNote)}</dd>
   <dt>Slicer</dt><dd>${esc(d.slicer)}</dd>
   <dt>Connectivity</dt><dd>${esc(d.connectivity)}</dd>
   <dt>Camera / sensors</dt><dd>${d.camera?'camera':'no camera'}${d.aiFailDetect?' + AI failure detection':''}${d.filamentSensor?' + filament runout sensor':''}</dd>
 </dl>`},
 {label:'Price',html:d=>esc(d.priceNote)}
];
