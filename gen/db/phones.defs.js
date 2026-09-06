const money=d=>d.priceUSDLaunch==null?'<span class="price">&mdash;</span>':
  `<span class="price">$${d.priceUSDLaunch}<small>${esc(d.priceNote||'')}</small></span>`;
const usbTag=v=>{v=v||'';return /lightning/i.test(v)?tag(v,'t-no')
  :/3\.|displayport|dp\b/i.test(v)?tag(v,'t-yes'):tag(v,'t-neutral');};
const unlockTag=v=>{v=v||'';return /^no$/i.test(v)?tag('No','t-no')
  :/^yes/i.test(v)?tag(v,'t-yes'):tag(v,'t-part');};

const COLUMNS=[
 {id:'name',hideable:false,label:'Phone',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.brand)} &middot; ${d.releaseYear}</span>`},
 {id:'price',label:'Launch price',sort:d=>d.priceUSDLaunch,cell:money},
 {id:'os',label:'OS & support',sort:d=>d.osUpdateYears,cell:d=>`<span style="font-size:12px">${esc(d.os)}</span><span class="sub">${d.osUpdateYears}y OS &middot; ${d.securityYears}y security</span>`},
 {id:'soc',label:'SoC',cell:d=>`<span style="font-size:12px">${esc(d.soc)}</span>`},
 {id:'mem',label:'RAM / storage',cell:d=>`<span style="font-size:12px">${esc(d.ram)}</span><span class="sub">${esc(d.storage)}</span>`},
 {id:'display',label:'Display',sort:d=>d.displayIn,cell:d=>`<span class="price">${d.displayIn}"</span><span class="sub">${esc(d.displayType)} &middot; ${d.refreshHz}Hz &middot; ${d.peakNits?d.peakNits+' nits':''}</span>`},
 {id:'battery',label:'Battery / charge',sort:d=>d.batteryMah,cell:d=>`<span class="price">${d.batteryMah?d.batteryMah.toLocaleString():'?'} mAh</span><span class="sub">${d.chargeWiredW||'?'}W wired${d.chargeWirelessW?` &middot; ${d.chargeWirelessW}W Qi`:' &middot; no Qi'}</span>`},
 {id:'usb',label:'USB',cell:d=>usbTag(d.usb)},
 {id:'jack',label:'Headphone jack',cell:d=>yn(d.headphoneJack)},
 {id:'sd',label:'microSD',cell:d=>yn(d.microSD)},
 {id:'sim',label:'SIM',cell:d=>`<span style="font-size:11.5px">${esc(d.sim)}</span>`},
 {id:'ir',label:'IR blaster',cell:d=>yn(d.irBlaster)},
 {id:'ip',label:'IP rating',cell:d=>d.ipRating&&d.ipRating!=='unknown'?tag(d.ipRating,'t-yes'):tag('none','t-no')},
 {id:'cam',label:'Cameras',cell:d=>`<span style="font-size:12px">${esc(d.camMain)}</span><span class="sub">UW ${esc(d.camUltrawide)} &middot; tele ${esc(d.camTele)} &middot; front ${esc(d.camFront)}</span>`},
 {id:'unlock',label:'Bootloader / ROM',sort:d=>/^no$/i.test(d.bootloaderUnlock||'')?2:/^yes/i.test(d.bootloaderUnlock||'')?0:1,cell:d=>unlockTag(d.bootloaderUnlock)+`<span class="sub">${esc(d.customRom)}</span>`},
 {id:'weight',label:'Weight',sort:d=>d.weightG,cell:d=>d.weightG!=null?`<span class="price">${d.weightG} g</span>`:'&mdash;'},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const FILTERS=[
 {id:'jack',label:'Headphone jack',test:d=>d.headphoneJack===true},
 {id:'sd',label:'microSD',test:d=>d.microSD===true},
 {id:'ir',label:'IR blaster',test:d=>d.irBlaster===true},
 {id:'upd',label:'5+ yrs OS updates',test:d=>d.osUpdateYears!=null&&d.osUpdateYears>=5},
 {id:'unl',label:'Bootloader unlockable',test:d=>/^yes/i.test(d.bootloaderUnlock||'')},
 {id:'rom',label:'Custom ROM support',test:d=>d.customRom&&d.customRom!=='none'},
 {id:'graphene',label:'GrapheneOS',test:d=>/graphene/i.test(d.customRom||'')},
 {id:'compact',label:'Compact (< 6.2")',test:d=>d.displayIn!=null&&d.displayIn<6.2},
 {id:'usb3',label:'USB 3.x / video out',test:d=>/3\.|displayport|dp\b/i.test(d.usb||'')},
 {id:'qi',label:'Wireless charging',test:d=>d.chargeWirelessW!=null&&d.chargeWirelessW>0},
 {id:'hz',label:'120Hz+',test:d=>d.refreshHz!=null&&d.refreshHz>=120},
 {id:'tele',label:'Has telephoto',test:d=>d.camTele&&!/^none/i.test(d.camTele)}
];

const SORTS=[
 {id:'yr',label:'Newest first',cmp:(a,b)=>b.releaseYear-a.releaseYear||(b.priceUSDLaunch??0)-(a.priceUSDLaunch??0)},
 {id:'price',label:'Price ↑',cmp:(a,b)=>(a.priceUSDLaunch??1e9)-(b.priceUSDLaunch??1e9)},
 {id:'priced',label:'Price ↓',cmp:(a,b)=>(b.priceUSDLaunch??-1)-(a.priceUSDLaunch??-1)},
 {id:'size',label:'Screen size ↑',cmp:(a,b)=>(a.displayIn??99)-(b.displayIn??99)},
 {id:'upd',label:'Update years ↓',cmp:(a,b)=>(b.osUpdateYears??0)-(a.osUpdateYears??0)},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Price',html:d=>esc(d.priceNote)},
 {label:'Display & battery',html:d=>`<dl class="kv">
   <dt>Panel</dt><dd>${d.displayIn}" ${esc(d.displayType)} &middot; ${d.refreshHz}Hz &middot; ${d.peakNits?d.peakNits+' nits peak':'?'}</dd>
   <dt>Battery</dt><dd>${d.batteryMah?d.batteryMah.toLocaleString()+' mAh':'?'}</dd>
   <dt>Charging</dt><dd>${d.chargeWiredW||'?'}W wired${d.chargeWirelessW?` &middot; ${d.chargeWirelessW}W wireless`:' &middot; no wireless'}</dd>
 </dl>`},
 {label:'Cameras',html:d=>`<dl class="kv">
   <dt>Main</dt><dd>${esc(d.camMain)}</dd>
   <dt>Ultrawide</dt><dd>${esc(d.camUltrawide)}</dd>
   <dt>Telephoto</dt><dd>${esc(d.camTele)}</dd>
   <dt>Front</dt><dd>${esc(d.camFront)}</dd>
   <dt>Video</dt><dd>${esc(d.video)}</dd>
 </dl>`},
 {label:'Software & longevity',html:d=>`<dl class="kv">
   <dt>Ships with</dt><dd>${esc(d.os)}</dd>
   <dt>Updates</dt><dd>${d.osUpdateYears} major OS versions &middot; ${d.securityYears} yrs security</dd>
   <dt>Bootloader</dt><dd>${esc(d.bootloaderUnlock)}</dd>
   <dt>Custom ROM</dt><dd>${esc(d.customRom)}</dd>
 </dl>`},
 {label:'Connectivity & expansion',html:d=>`<dl class="kv">
   <dt>USB</dt><dd>${esc(d.usb)}</dd>
   <dt>SIM</dt><dd>${esc(d.sim)}</dd>
   <dt>Headphone jack</dt><dd>${d.headphoneJack?'yes':'no'}</dd>
   <dt>microSD</dt><dd>${d.microSD?'yes':'no'}</dd>
   <dt>IR blaster</dt><dd>${d.irBlaster?'yes':'no'}</dd>
   <dt>Water resistance</dt><dd>${esc(d.ipRating)}</dd>
 </dl>`}
];
