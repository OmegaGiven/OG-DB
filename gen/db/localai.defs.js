const ctx=n=>n==null?'?':n>=1e6?(n/1e6)+'M':n>=1000?(n/1000)+'k':(''+n);
const pnum=s=>{const m=String(s||'').match(/[\d.]+/);return m?parseFloat(m[0]):1e9;};
const TIER={S:['S','t-yes'],A:['A','t-yes'],B:['B','t-part'],C:['C','t-neutral']};
const tierTag=v=>v==null?'<span style="color:var(--ink-soft)">&mdash;</span>':(t=>tag(t[0],t[1]))(TIER[v]||['?','t-neutral']);
const IMG={none:['None','t-no'],'basic (OCR / captions)':['Basic','t-part'],good:['Good','t-part'],excellent:['Excellent','t-yes']};
const AUD={none:['None','t-no'],'ASR only':['ASR','t-part'],'ASR + understanding':['ASR + understanding','t-yes']};
const TYPE={LLM:'t-neutral',coder:'t-neutral','VLM':'t-part','ASR':'t-part'};
const gb=v=>v==null?'&mdash;':`<span class="price">${v} GB</span>`;

const COLUMNS=[
 {id:'name',hideable:false,label:'Model',cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.developer)}</span>`},
 {id:'type',label:'Type',cell:d=>tag(d.type,TYPE[d.type]||(/omni/.test(d.type)?'t-yes':'t-neutral'))},
 {id:'params',label:'Params',cell:d=>`<span class="price">${esc(d.paramsB)}B</span><span class="sub">${esc((d.modality||[]).join(' + '))}</span>`},
 {id:'ctx',label:'Max context',cell:d=>`<span class="price">${ctx(d.contextMaxTokens)}</span><span class="sub">${esc(d.contextNote||'')}</span>`},
 {id:'q4',label:'VRAM · Q4',cell:d=>gb(d.vramQ4GB)+`<span class="sub">min: ${esc(d.minPracticalGPU||'?')}</span>`},
 {id:'q8',label:'VRAM · Q8',cell:d=>gb(d.vramQ8GB)},
 {id:'fp16',label:'VRAM · FP16',cell:d=>gb(d.vramFP16GB)},
 {id:'kv',label:'KV cache',cell:d=>`<span style="font-size:11.5px">${esc(d.kvCacheNote||'?')}</span>`},
 {id:'img',label:'Image',cell:d=>{const m=IMG[d.imageRecognition]||['?','t-neutral'];return tag(m[0],m[1])+(d.imageNote?`<span class="sub">${esc(d.imageNote)}</span>`:'');}},
 {id:'aud',label:'Audio',cell:d=>{const m=AUD[d.audioRecognition]||['?','t-neutral'];return tag(m[0],m[1])+(d.audioNote?`<span class="sub">${esc(d.audioNote)}</span>`:'');}},
 {id:'reason',label:'Reasoning',cell:d=>tierTag(d.reasoningTier)},
 {id:'code',label:'Coding',cell:d=>tierTag(d.codingTier)},
 {id:'tools',label:'Tool use',cell:d=>d.toolUse==='native'?tag('Native','t-yes'):d.toolUse==='prompted'?tag('Prompted','t-part'):tag('Weak','t-no')},
 {id:'runners',label:'Runners',cell:d=>`<span style="font-size:11.5px">${esc(d.runners||'')}</span>`},
 {id:'license',label:'License',cell:d=>`<span style="font-size:11.5px">${esc(d.license||'')}</span>`},
 {id:'source',label:'Source',cell:d=>srcLink(d.source)}
];

const hasVision=d=>d.imageRecognition==='good'||d.imageRecognition==='excellent';
const hasAudio=d=>d.audioRecognition&&d.audioRecognition!=='none';

const FILTERS=[
 {id:'f8',label:'Fits 8 GB (Q4)',test:d=>d.vramQ4GB!=null&&d.vramQ4GB<=8},
 {id:'f12',label:'Fits 12 GB (Q4)',test:d=>d.vramQ4GB!=null&&d.vramQ4GB<=12},
 {id:'f24',label:'Fits 24 GB (Q4)',test:d=>d.vramQ4GB!=null&&d.vramQ4GB<=24},
 {id:'vis',label:'Real vision',test:hasVision},
 {id:'visx',label:'Excellent vision',test:d=>d.imageRecognition==='excellent'},
 {id:'aud',label:'Audio / ASR',test:hasAudio},
 {id:'omni',label:'Omni (vision + audio)',test:d=>/omni/.test(d.type)},
 {id:'nat',label:'Native tool use',test:d=>d.toolUse==='native'},
 {id:'top',label:'Reasoning S / A',test:d=>d.reasoningTier==='S'||d.reasoningTier==='A'},
 {id:'cod',label:'Coding S / A',test:d=>d.codingTier==='S'||d.codingTier==='A'},
 {id:'ctx',label:'128k+ context',test:d=>d.contextMaxTokens!=null&&d.contextMaxTokens>=128000},
 {id:'perm',label:'Apache / MIT',test:d=>/apache|mit/i.test(d.license||'')}
];

const SORTS=[
 {id:'q4',label:'VRAM Q4 ↑',cmp:(a,b)=>(a.vramQ4GB??1e9)-(b.vramQ4GB??1e9)},
 {id:'params',label:'Params ↑',cmp:(a,b)=>pnum(a.paramsB)-pnum(b.paramsB)},
 {id:'ctx',label:'Context ↓',cmp:(a,b)=>(b.contextMaxTokens??0)-(a.contextMaxTokens??0)},
 {id:'date',label:'Newest first',cmp:(a,b)=>String(b.releaseDate).localeCompare(String(a.releaseDate))},
 {id:'name',label:'Name A–Z',cmp:(a,b)=>a.name.localeCompare(b.name)}
];

const EXPAND=[
 {label:'Good for',html:d=>esc(d.goodFor)},
 {label:'Notes',html:d=>esc(d.notes)},
 {label:'Fitting it on a GPU',html:d=>`<dl class="kv">
   <dt>Params</dt><dd>${esc(d.paramsB)}B</dd>
   <dt>VRAM (weights)</dt><dd>Q4 ${d.vramQ4GB??'?'} GB &middot; Q8 ${d.vramQ8GB??'?'} GB &middot; FP16 ${d.vramFP16GB??'?'} GB</dd>
   <dt>Smallest practical GPU</dt><dd>${esc(d.minPracticalGPU)}</dd>
   <dt>KV cache</dt><dd>${esc(d.kvCacheNote)}</dd>
   <dt>Max context</dt><dd>${ctx(d.contextMaxTokens)} tokens</dd>
   <dt>Context in practice</dt><dd>${esc(d.contextNote)}</dd>
 </dl>`},
 {label:'Capabilities',html:d=>`<dl class="kv">
   <dt>Modality</dt><dd>${esc((d.modality||[]).join(', '))}</dd>
   <dt>Image</dt><dd>${esc(d.imageRecognition)}${d.imageNote?' &mdash; '+esc(d.imageNote):''}</dd>
   <dt>Audio</dt><dd>${esc(d.audioRecognition)}${d.audioNote?' &mdash; '+esc(d.audioNote):''}</dd>
   <dt>Reasoning</dt><dd>tier ${esc(d.reasoningTier||'n/a')}</dd>
   <dt>Coding</dt><dd>tier ${esc(d.codingTier||'n/a')}</dd>
   <dt>Tool use</dt><dd>${esc(d.toolUse)}</dd>
 </dl>`},
 {label:'Meta',html:d=>`<dl class="kv">
   <dt>Developer</dt><dd>${esc(d.developer)}</dd>
   <dt>Released</dt><dd>${esc(d.releaseDate)}</dd>
   <dt>License</dt><dd>${esc(d.license)}</dd>
   <dt>Runners</dt><dd>${esc(d.runners)}</dd>
 </dl>`}
];
