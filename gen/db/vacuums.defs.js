const TIER={budget:'t-neutral',mid:'t-neutral',premium:'t-part',flagship:'t-yes'};
const RISK={low:['Low','t-yes'],medium:['Medium','t-part'],high:['High','t-no']};
const money=d=>d.priceUSD==null?'<span class="price">&mdash;</span>':`<span class="price">$${d.priceUSD.toLocaleString()}<small>${esc(d.priceNote||'')}</small></span>`;
const pct=v=>v==null?'<span style="color:var(--ink-soft)">n/a</span>':`<span class="price">${v}%</span>`;
const hasMop=d=>d.mopType&&d.mopType!=='none';
const isLocal=d=>d.cloudRequired===false;
const valetudo=d=>/valetudo/i.test(d.localControl||'')&&!/not supported|no valetudo/i.test(d.localControl||'');
const navShort=d=>(d.hasLidar?'LiDAR':'')+(d.hasLidar&&d.hasCamera?' + ':'')+(d.hasCamera?'camera':'')||'other';

const COLUMNS=[
 {id:'name',hideable:false,label:'Robot',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear}</span>`},
 {id:'price',label:'Price',sort:d=>d.priceUSD,cell:money},
 {id:'tier',label:'Tier',sort:d=>({budget:0,mid:1,premium:2,flagship:3}[d.tier]??9),cell:d=>tag(d.tier,TIER[d.tier]||'t-neutral')},
 {id:'privacy',label:'Privacy risk',sort:d=>({low:0,medium:1,high:2}[d.privacyRisk]??9),cell:d=>{const r=RISK[d.privacyRisk]||[d.privacyRisk,'t-neutral'];return tag(r[0],r[1])+(isLocal(d)?tag('Local-capable','t-yes'):tag('Cloud required','t-no'));}},
 {id:'nav',label:'Navigation',sort:d=>(d.hasLidar?0:2)+(d.hasCamera?0:1),cell:d=>(d.hasLidar?tag('LiDAR','t-yes'):'')+(d.hasCamera?tag('Camera','t-part'):tag('No camera','t-yes'))+`<span class="sub">${esc(d.navigation)}</span>`},
 {id:'obst',label:'Obstacle avoidance',sort:d=>/excellent/i.test(d.obstacleAvoidance||'')?0:/good/i.test(d.obstacleAvoidance||'')?1:/fair|basic/i.test(d.obstacleAvoidance||'')?2:3,cell:d=>`<span style="font-size:11.5px">${esc(d.obstacleAvoidance)}</span>`},
 {id:'suction',label:'Suction',sort:d=>d.suctionPa,cell:d=>d.suctionPa?`<span class="price">${d.suctionPa.toLocaleString()} Pa</span>`:'&mdash;'},
 {id:'pickup',label:'Pickup carpet / hard',sort:d=>d.carpetPickupPct,cell:d=>pct(d.carpetPickupPct)+`<span class="sub">hard floor ${d.hardFloorPickupPct??'n/a'}%</span>`},
 {id:'mop',label:'Mop',sort:d=>({'none':4,'static pad':3,'vibrating pad':2,'spinning pads':1,'roller':0,'wet/dry roller':0}[d.mopType]??5),cell:d=>hasMop(d)?tag(d.mopType,'t-yes')+`<span class="sub">${esc(d.mop)}</span>`:tag('No mop','t-neutral')},
 {id:'dock',label:'Dock',sort:d=>(d.selfEmptying?0:2)+(d.mopWashDry?0:1)+(d.waterRefill?0:1),cell:d=>(d.selfEmptying?tag('Auto-empty','t-yes'):'')+(d.mopWashDry?tag('Mop wash/dry','t-yes'):'')+(d.waterRefill?tag('Water refill','t-yes'):'')+(!d.selfEmptying&&!d.mopWashDry?tag('Basic dock','t-neutral'):'')+`<span class="sub">${esc(d.dock)}</span>`},
 {id:'hair',label:'Hair tangle',cell:d=>`<span style="font-size:11.5px">${esc(d.hairTangleResist)}</span>`},
 {id:'climb',label:'Threshold',sort:d=>d.climbThresholdMm,cell:d=>d.climbThresholdMm!=null?`<span class="price">${d.climbThresholdMm} mm</span>`:'&mdash;'},
 {id:'batt',label:'Battery',sort:d=>d.batteryMinutes,cell:d=>d.batteryMinutes?`<span class="price">${d.batteryMinutes} min</span>`:'&mdash;'},
 {id:'noise',label:'Noise',sort:d=>d.noiseDb,cell:d=>d.noiseDb?`<span class="price">${d.noiseDb} dB</span>`:'&mdash;'},
 {id:'local',label:'Local control',sort:d=>valetudo(d)?0:/home assistant \(official\)|matter/i.test(d.localControl||'')?1:2,cell:d=>(valetudo(d)?tag('Valetudo','t-yes'):'')+(d.matter?tag('Matter','t-yes'):'')+`<span class="sub">${esc(d.localControl)} &middot; HA: ${esc(d.homeAssistant)}</span>`},
 {id:'voice',label:'Voice',cell:d=>`<span style="font-size:11.5px">${esc(d.voiceAssistant)}</span>`},
 {id:'warr',label:'Warranty',sort:d=>d.warrantyYears,cell:d=>tag((d.warrantyYears??'?')+' yr',d.warrantyYears>=2?'t-yes':'t-neutral')},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'nocam',label:'No camera',test:d=>d.hasCamera===false},
 {id:'lidar',label:'LiDAR',test:d=>d.hasLidar===true},
 {id:'local',label:'Works without cloud',test:isLocal},
 {id:'val',label:'Valetudo-capable',test:valetudo},
 {id:'matter',label:'Matter',test:d=>d.matter===true},
 {id:'lowrisk',label:'Privacy risk: low',test:d=>d.privacyRisk==='low'},
 {id:'mop',label:'Has mop',test:hasMop},
 {id:'mopwash',label:'Dock washes + dries mop',test:d=>d.mopWashDry===true},
 {id:'empty',label:'Self-emptying',test:d=>d.selfEmptying===true},
 {id:'nomop',label:'Vacuum only',test:d=>!hasMop(d)},
 {id:'u400',label:'≤ $400',test:d=>d.priceUSD!=null&&d.priceUSD<=400},
 {id:'u800',label:'≤ $800',test:d=>d.priceUSD!=null&&d.priceUSD<=800},
 {id:'carpet',label:'Carpet pickup ≥ 80%',test:d=>d.carpetPickupPct!=null&&d.carpetPickupPct>=80},
 {id:'quiet',label:'≤ 65 dB',test:d=>d.noiseDb!=null&&d.noiseDb<=65},
 {id:'climb',label:'Climbs ≥ 20 mm',test:d=>d.climbThresholdMm!=null&&d.climbThresholdMm>=20}
];

const SORTS=[
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSD??1e9)-(b.priceUSD??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSD??-1)-(a.priceUSD??-1)},
 {id:'risk',label:'Privacy risk ↑',cmp:(a,b)=>(({low:0,medium:1,high:2})[a.privacyRisk]??9)-(({low:0,medium:1,high:2})[b.privacyRisk]??9)},
 {id:'carpet',label:'Carpet pickup ↓',cmp:(a,b)=>(b.carpetPickupPct??-1)-(a.carpetPickupPct??-1)},
 {id:'suction',label:'Suction ↓',cmp:(a,b)=>(b.suctionPa??0)-(a.suctionPa??0)},
 {id:'yr',label:'Newest first',cmp:(a,b)=>b.releaseYear-a.releaseYear},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Privacy & cloud',html:d=>`<dl class="kv">
   <dt>Risk</dt><dd>${esc(d.privacyRisk)} &mdash; ${esc(d.privacyNote)}</dd>
   <dt>Camera data</dt><dd>${esc(d.cameraPrivacy)}</dd>
   <dt>App required</dt><dd>${d.appRequired?'yes':'no'} &middot; cloud required for normal use: ${d.cloudRequired?'yes':'no'}</dd>
   <dt>Local control</dt><dd>${esc(d.localControl)}</dd>
   <dt>Home Assistant</dt><dd>${esc(d.homeAssistant)}${d.matter?' &middot; Matter':''}</dd>
 </dl>`},
 {label:'Cleaning',html:d=>`<dl class="kv">
   <dt>Suction</dt><dd>${d.suctionPa?d.suctionPa.toLocaleString()+' Pa':'?'}</dd>
   <dt>Pickup</dt><dd>carpet ${d.carpetPickupPct??'n/a'}% &middot; hard floor ${d.hardFloorPickupPct??'n/a'}%</dd>
   <dt>Mop</dt><dd>${esc(d.mop)}</dd>
   <dt>Dock</dt><dd>${esc(d.dock)}</dd>
   <dt>Hair</dt><dd>${esc(d.hairTangleResist)}</dd>
   <dt>Navigation</dt><dd>${esc(d.navigation)} &middot; obstacle avoidance: ${esc(d.obstacleAvoidance)}</dd>
   <dt>Threshold / battery / noise</dt><dd>${d.climbThresholdMm??'?'} mm &middot; ${d.batteryMinutes??'?'} min &middot; ${d.noiseDb??'?'} dB</dd>
 </dl>`},
 {label:'Price',html:d=>esc(d.priceNote)}
];
