const ctx=n=>n==null?'?':n>=1e6?(n/1e6)+'M':n>=1000?(n/1000)+'k':(''+n);
const pnum=s=>{const m=String(s||'').match(/[\d.]+/);return m?parseFloat(m[0]):1e9;};
const TIER={S:['S','t-yes'],A:['A','t-yes'],B:['B','t-part'],C:['C','t-neutral']};
const tierTag=v=>v==null?'<span style="color:var(--ink-soft)">&mdash;</span>':(t=>tag(t[0],t[1]))(TIER[v]||['?','t-neutral']);
const IMG={none:['None','t-no'],'basic (OCR / captions)':['Basic','t-part'],good:['Good','t-part'],excellent:['Excellent','t-yes']};
const AUD={none:['None','t-no'],'ASR only':['ASR','t-part'],'ASR + understanding':['ASR + understanding','t-yes']};
const TYPE={LLM:'t-neutral',coder:'t-neutral','VLM':'t-part','ASR':'t-part','video-gen':'t-yes','audio-gen':'t-yes','TTS':'t-part'};
const gb=v=>v==null?'&mdash;':`<span class="price">${v} GB</span>`;

// Alignment / censorship of the DEFAULT released weights. "light" = ships with
// minimal guardrails; "moderate" = standard safety RLHF, jailbreakable;
// "strict" = refusal-prone; "prc" = also hard-refuses PRC-political topics.
// ASR / transcription models have no refusal behaviour -> n/a.
const ALIGN={strict:['Heavily filtered','t-no'],moderate:['Standard guardrails','t-part'],light:['Light guardrails','t-yes'],na:['n/a (transcription)','t-neutral']};
const ALORD={light:0,moderate:1,prc:2,strict:3,na:4};
function alignOf(d){
  const n=(d.name||'').toLowerCase(), dev=(d.developer||'').toLowerCase(), t=d.type||'';
  if(t==='ASR') return ['na',null];
  if(/gemma/.test(n)) return ['strict','Among the most refusal-prone open models; heavy safety RLHF. Community "abliterated" builds exist.'];
  if(/phi-/.test(n)) return ['strict','Microsoft’s heavy synthetic-data curation makes it very filtered; refuses readily.'];
  if(/granite/.test(n)) return ['strict','IBM enterprise safety tuning; conservative on anything edgy.'];
  if(/qwen/.test(n)) return ['prc','General safety refusals, plus hard refusal of PRC-sensitive political topics. Strong community abliterated / RP fine-tunes.'];
  if(/deepseek/.test(n)) return ['prc','Light general guardrails but deflects Tiananmen / PRC-political queries; R1 distills inherit the base tuning.'];
  if(/internvl|minicpm|glm-/.test(n)) return ['prc','Chinese lab model — standard safety plus PRC-political refusals.'];
  if(/command r|aya/.test(n)) return ['moderate','Cohere enterprise tuning — compliant for business use, standard safety refusals.'];
  if(/jamba/.test(n)) return ['moderate','Standard commercial safety tuning.'];
  if(/llama|nemotron|ultravox/.test(n)) return ['moderate','Standard Meta safety RLHF; jailbreakable, and abliterated / Dolphin / Hermes tunes are everywhere.'];
  if(/mistral|mixtral|pixtral|ministral|devstral|voxtral|codestral/.test(n)) return ['light','Mistral ships minimal guardrails by design; Nemo and 7B are among the most permissive instruct models.'];
  if(/molmo|olmo/.test(n)) return ['light','Ai2 fully-open research model; light instruct tuning, base weights released.'];
  if(/smollm|falcon/.test(n)) return ['light','Small research model with minimal alignment tuning.'];
  return ['moderate',null];
}

const COLUMNS=[
 {id:'name',hideable:false,label:'Model',sort:d=>d.name.toLowerCase(),cell:d=>`<span class="name">${esc(d.name)}</span><span class="sub">${esc(d.developer)}</span>`},
 {id:'type',label:'Type',cell:d=>tag(d.type,TYPE[d.type]||(/omni/.test(d.type)?'t-yes':'t-neutral'))},
 {id:'gen',label:'Generates',sort:d=>(d.generates||[]).join(','),cell:d=>{const g=d.generates||[];return g.length?g.map(x=>tag(x,'t-yes')).join(''):'<span style="color:var(--ink-soft)">&mdash;</span>';}},
 {id:'params',label:'Params',sort:d=>pnum(d.paramsB),cell:d=>`<span class="price">${esc(d.paramsB)}B</span><span class="sub">${esc((d.modality||[]).join(' + '))}</span>`},
 {id:'ctx',label:'Max context',sort:d=>d.contextMaxTokens,cell:d=>`<span class="price">${ctx(d.contextMaxTokens)}</span><span class="sub">${esc(d.contextNote||'')}</span>`},
 {id:'q4',label:'VRAM · Q4',sort:d=>d.vramQ4GB,cell:d=>gb(d.vramQ4GB)+`<span class="sub">min: ${esc(d.minPracticalGPU||'?')}</span>`},
 {id:'q8',label:'VRAM · Q8',sort:d=>d.vramQ8GB,cell:d=>gb(d.vramQ8GB)},
 {id:'fp16',label:'VRAM · FP16',sort:d=>d.vramFP16GB,cell:d=>gb(d.vramFP16GB)},
 {id:'kv',label:'KV cache',cell:d=>`<span style="font-size:11.5px">${esc(d.kvCacheNote||'?')}</span>`},
 {id:'img',label:'Image',sort:d=>({none:0,'basic (OCR / captions)':1,good:2,excellent:3}[d.imageRecognition]??-1),cell:d=>{const m=IMG[d.imageRecognition]||['?','t-neutral'];return tag(m[0],m[1])+(d.imageNote?`<span class="sub">${esc(d.imageNote)}</span>`:'');}},
 {id:'vidin',label:'Video in',sort:d=>d.videoIn?1:0,cell:d=>d.videoIn?tag('Video','t-yes'):'<span style="color:var(--ink-soft)">&mdash;</span>'},
 {id:'aud',label:'Audio',sort:d=>({none:0,'ASR only':1,'ASR + understanding':2}[d.audioRecognition]??-1),cell:d=>{const m=AUD[d.audioRecognition]||['?','t-neutral'];return tag(m[0],m[1])+(d.audioNote?`<span class="sub">${esc(d.audioNote)}</span>`:'');}},
 {id:'reason',label:'Reasoning',sort:d=>({S:0,A:1,B:2,C:3}[d.reasoningTier]??9),cell:d=>tierTag(d.reasoningTier)},
 {id:'code',label:'Coding',sort:d=>({S:0,A:1,B:2,C:3}[d.codingTier]??9),cell:d=>tierTag(d.codingTier)},
 {id:'tools',label:'Tool use',cell:d=>d.toolUse==null?'<span style="color:var(--ink-soft)">&mdash;</span>':d.toolUse==='native'?tag('Native','t-yes'):d.toolUse==='prompted'?tag('Prompted','t-part'):tag('Weak','t-no')},
 {id:'align',label:'Alignment',sort:d=>ALORD[alignOf(d)[0]]??5,cell:d=>{const[k,note]=alignOf(d);const m=k==='prc'?['PRC-topic + guardrails','t-no']:ALIGN[k]||['?','t-neutral'];return tag(m[0],m[1])+(note?`<span class="sub">${esc(note)}</span>`:'');}},
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
 {id:'vidgen',label:'Video generation',test:d=>(d.generates||[]).includes('video')},
 {id:'audgen',label:'Audio / music / speech generation',test:d=>(d.generates||[]).some(x=>['music','vocals','speech','SFX','music-loops','dialogue','audio','cloning'].includes(x))},
 {id:'vidin',label:'Video-in understanding',test:d=>!!d.videoIn},
 {id:'nat',label:'Native tool use',test:d=>d.toolUse==='native'},
 {id:'top',label:'Reasoning S / A',test:d=>d.reasoningTier==='S'||d.reasoningTier==='A'},
 {id:'cod',label:'Coding S / A',test:d=>d.codingTier==='S'||d.codingTier==='A'},
 {id:'ctx',label:'128k+ context',test:d=>d.contextMaxTokens!=null&&d.contextMaxTokens>=128000},
 {id:'perm',label:'Apache / MIT',test:d=>/apache|mit/i.test(d.license||'')},
 {id:'lgd',label:'Light guardrails',test:d=>alignOf(d)[0]==='light'},
 {id:'noprc',label:'No PRC-topic refusals',test:d=>{const k=alignOf(d)[0];return k==='light'||k==='moderate';}},
 {id:'strict',label:'Heavily filtered',test:d=>alignOf(d)[0]==='strict'}
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
   <dt>Generates</dt><dd>${(d.generates||[]).length?esc((d.generates||[]).join(', ')):'&mdash;'}</dd>
   <dt>Video in</dt><dd>${d.videoIn?'yes (clip / frame understanding)':'&mdash;'}</dd>
   <dt>Image</dt><dd>${esc(d.imageRecognition)}${d.imageNote?' &mdash; '+esc(d.imageNote):''}</dd>
   <dt>Audio</dt><dd>${esc(d.audioRecognition)}${d.audioNote?' &mdash; '+esc(d.audioNote):''}</dd>
   <dt>Reasoning</dt><dd>tier ${esc(d.reasoningTier||'n/a')}</dd>
   <dt>Coding</dt><dd>tier ${esc(d.codingTier||'n/a')}</dd>
   <dt>Tool use</dt><dd>${esc(d.toolUse)}</dd>
   <dt>Alignment</dt><dd>${(()=>{const[k,n]=alignOf(d);return (k==='prc'?'standard guardrails + PRC-political refusals':k==='na'?'n/a (transcription)':k+' guardrails')+(n?' — '+esc(n):'');})()}</dd>
 </dl>`},
 {label:'Meta',html:d=>`<dl class="kv">
   <dt>Developer</dt><dd>${esc(d.developer)}</dd>
   <dt>Released</dt><dd>${esc(d.releaseDate)}</dd>
   <dt>License</dt><dd>${esc(d.license)}</dd>
   <dt>Runners</dt><dd>${esc(d.runners)}</dd>
 </dl>`}
];
