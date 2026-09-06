/* Generic OG-DB table engine.
   Expects, defined earlier in the page:
     DATA      - array of row objects
     DB        - { name, compiled, noun }         (noun e.g. "keyboards")
     COLUMNS   - [ { id, label, cell(d)->html, hideable? (default true) } ]   // first column = name, not hideable
     FILTERS   - [ { id, label, test(d)->bool } ]
     SORTS     - [ { id, label, cmp(a,b) } ]      // first = default
     EXPAND    - [ { label, html(d)->html } ]
*/
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  window.tag=(t,c)=>`<span class="tag ${c||'t-neutral'}">${esc(t)}</span>`;
  window.esc=esc;
  window.srcLink=s=>s&&s.url?`<a class="srclink" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label||'source')} &#8599;</a>`:'<span style="color:var(--ink-soft)">&mdash;</span>';
  window.yn=(v,yes,no)=>v===true?tag(yes||'Yes','t-yes'):v===false?tag(no||'No','t-no'):tag(String(v),'t-part');

  // --- price history rendering (no library, theme-aware via currentColor) ---
  window.priceTrend=h=>{ // 'down' | 'up' | 'flat' | null
    if(!h||h.length<2) return null;
    const a=h[0].priceUSD, b=h[h.length-1].priceUSD;
    if(a==null||b==null) return null;
    const d=(b-a)/a;
    return d<-0.02?'down':d>0.02?'up':'flat';
  };
  window.sparkline=h=>{
    if(!h||!h.length) return '<span style="color:var(--ink-soft)">&mdash;</span>';
    const pts=h.map(p=>p.priceUSD).filter(v=>v!=null);
    if(pts.length<2) return `<span class="price">$${pts[0]??'?'}</span>`;
    const w=76,ht=20,mn=Math.min(...pts),mx=Math.max(...pts),rng=mx-mn||1;
    const step=w/(pts.length-1);
    const d=pts.map((v,i)=>`${(i*step).toFixed(1)},${(ht-1-((v-mn)/rng)*(ht-2)).toFixed(1)}`).join(' ');
    const tr=priceTrend(h);
    const col=tr==='down'?'var(--yes)':tr==='up'?'var(--no)':'var(--ink-soft)';
    const last=pts[pts.length-1], lx=w, ly=(ht-1-((last-mn)/rng)*(ht-2)).toFixed(1);
    return `<span style="display:inline-flex;align-items:center;gap:7px">`
      +`<svg width="${w}" height="${ht}" viewBox="0 0 ${w+4} ${ht}" style="overflow:visible">`
      +`<polyline points="${d}" fill="none" stroke="${col}" stroke-width="1.5"/>`
      +`<circle cx="${lx}" cy="${ly}" r="2" fill="${col}"/></svg>`
      +`<span class="price" style="font-size:12px">$${last}</span></span>`;
  };
  window.priceChart=h=>{
    if(!h||h.length<2) return h&&h.length?`Only one recorded price: $${h[0].priceUSD} (${h[0].date}).`:'No price history yet.';
    const pts=h.filter(p=>p.priceUSD!=null);
    const W=440,H=150,pad={l:44,r:12,t:12,b:24};
    const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
    const vs=pts.map(p=>p.priceUSD), mn=Math.min(...vs), mx=Math.max(...vs), rng=mx-mn||1;
    const x=i=>pad.l+(i/(pts.length-1))*iw;
    const y=v=>pad.t+ih-((v-mn)/rng)*ih;
    const line=pts.map((p,i)=>`${x(i).toFixed(1)},${y(p.priceUSD).toFixed(1)}`).join(' ');
    const area=`${pad.l},${pad.t+ih} ${line} ${pad.l+iw},${pad.t+ih}`;
    const cur=pts[pts.length-1].priceUSD;
    const tr=priceTrend(h), col=tr==='down'?'var(--yes)':tr==='up'?'var(--no)':'var(--accent)';
    const g='var(--line)';
    return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="max-width:${W}px;font-family:IBM Plex Mono,monospace">`
      +`<polygon points="${area}" fill="${col}" opacity="0.10"/>`
      +`<line x1="${pad.l}" y1="${y(mx)}" x2="${pad.l+iw}" y2="${y(mx)}" stroke="${g}" stroke-width="1"/>`
      +`<line x1="${pad.l}" y1="${y(mn)}" x2="${pad.l+iw}" y2="${y(mn)}" stroke="${g}" stroke-width="1"/>`
      +`<text x="${pad.l-6}" y="${y(mx)+3}" text-anchor="end" font-size="10" fill="var(--ink-soft)">$${Math.round(mx)}</text>`
      +`<text x="${pad.l-6}" y="${y(mn)+3}" text-anchor="end" font-size="10" fill="var(--ink-soft)">$${Math.round(mn)}</text>`
      +`<polyline points="${line}" fill="none" stroke="${col}" stroke-width="2"/>`
      +`<circle cx="${x(pts.length-1)}" cy="${y(cur)}" r="3.2" fill="${col}"/>`
      +`<text x="${pad.l}" y="${H-8}" font-size="10" fill="var(--ink-soft)">${esc(pts[0].date)}</text>`
      +`<text x="${pad.l+iw}" y="${H-8}" text-anchor="end" font-size="10" fill="var(--ink-soft)">${esc(pts[pts.length-1].date)}</text>`
      +`</svg>`
      +`<div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px">now <b style="color:var(--ink)">$${cur}</b> &middot; low $${Math.round(mn)} &middot; high $${Math.round(mx)} &middot; ${pts.length} points</div>`;
  };

  const tbl=$('#tbl'), tbody=$('#tbody'), countEl=$('#count');
  const active=new Set();
  let sortMode=SORTS[0].id;

  // header (click to sort)
  const htr=$('#tbl thead tr');
  htr.innerHTML='<th style="width:32px" aria-label="expand"></th>'+
    COLUMNS.map(c=>`<th data-col="${c.id}" class="sortable" role="button" tabindex="0" aria-sort="none"><span class="hlabel">${esc(c.label)}</span><span class="arrow"></span></th>`).join('');
  let colSort=null; // {id, dir:1|-1}
  const scratch=document.createElement('div');
  function sortVal(c,d){
    if(c.sort) return c.sort(d);
    scratch.innerHTML=c.cell(d);
    const t=(scratch.textContent||'').replace(/↑|↓|↗/g,'').trim();
    const n=parseFloat(t.replace(/[$,]/g,''));
    return (t!=='' && !isNaN(n) && /^[-$]?[\d,]*\.?\d/.test(t))?n:t.toLowerCase();
  }
  function colCmp(a,b){
    const c=COLUMNS.find(x=>x.id===colSort.id);
    let va=sortVal(c,a), vb=sortVal(c,b);
    const ea=(va===''||va==null), eb=(vb===''||vb==null);
    if(ea&&eb) return 0; if(ea) return 1; if(eb) return -1;   // blanks always last
    let r = (typeof va==='number'&&typeof vb==='number') ? va-vb : String(va).localeCompare(String(vb));
    return r*colSort.dir;
  }
  function markHeaders(){
    htr.querySelectorAll('th.sortable').forEach(th=>{
      const on=colSort&&colSort.id===th.dataset.col;
      th.setAttribute('aria-sort',on?(colSort.dir===1?'ascending':'descending'):'none');
      th.querySelector('.arrow').textContent=on?(colSort.dir===1?' ▲':' ▼'):'';
    });
    try{sel.selectedIndex=colSort?-1:SORTS.findIndex(x=>x.id===sortMode);}catch(e){}
  }
  htr.querySelectorAll('th.sortable').forEach(th=>{
    const go=()=>{
      const id=th.dataset.col;
      if(colSort&&colSort.id===id) colSort = colSort.dir===1 ? {id,dir:-1} : null; // asc -> desc -> off
      else colSort = {id,dir:1};
      markHeaders(); render();
    };
    th.addEventListener('click',go);
    th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });

  // column hide CSS
  const st=document.createElement('style');
  st.textContent=COLUMNS.filter(c=>c.hideable!==false).map(c=>
    `#tbl[data-hide~="${c.id}"] [data-col="${c.id}"]{display:none}`).join('\n');
  document.head.appendChild(st);

  // min-width so it stays legible; ~150px per visible col
  function setMin(){
    const vis=COLUMNS.filter(c=>!hidden.has(c.id)).length+1;
    tbl.style.minWidth=Math.min(2300,Math.max(760,vis*155))+'px';
  }

  // filters
  const fwrap=$('#filters');
  FILTERS.forEach(f=>{
    const b=document.createElement('button');
    b.className='chip';b.dataset.filter=f.id;b.setAttribute('aria-pressed','false');b.textContent=f.label;
    b.addEventListener('click',()=>{
      if(active.has(f.id)){active.delete(f.id);b.setAttribute('aria-pressed','false');}
      else{active.add(f.id);b.setAttribute('aria-pressed','true');}
      render();
    });
    fwrap.appendChild(b);
  });

  // sorts
  const sel=$('#sort');
  sel.innerHTML=SORTS.map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('');
  sel.addEventListener('change',e=>{sortMode=e.target.value;colSort=null;markHeaders();render();});

  // column panel
  const panel=$('#colpanel'), colbtn=$('#colbtn');
  panel.querySelector('.colhead').insertAdjacentHTML('afterend',
    COLUMNS.filter(c=>c.hideable!==false).map(c=>
      `<label><input type="checkbox" data-col="${c.id}" checked> ${esc(c.label)}</label>`).join(''));
  const HIDE_KEY='ogdb.'+DB.noun+'.hidden';
  let hidden=new Set();
  try{const s=localStorage.getItem(HIDE_KEY);if(s)hidden=new Set(JSON.parse(s));}catch(e){}
  const ALL=COLUMNS.filter(c=>c.hideable!==false).map(c=>c.id);
  function applyCols(){
    tbl.setAttribute('data-hide',[...hidden].join(' '));
    panel.querySelectorAll('input[data-col]').forEach(cb=>cb.checked=!hidden.has(cb.dataset.col));
    colbtn.textContent=hidden.size?`Columns · ${ALL.length-hidden.size}/${ALL.length} ▾`:'Columns ▾';
    try{localStorage.setItem(HIDE_KEY,JSON.stringify([...hidden]));}catch(e){}
    setMin();
  }
  colbtn.addEventListener('click',e=>{e.stopPropagation();const o=panel.hidden;panel.hidden=!o;colbtn.setAttribute('aria-expanded',String(o));});
  panel.addEventListener('click',e=>e.stopPropagation());
  panel.addEventListener('change',e=>{const cb=e.target;if(!cb.dataset.col)return;
    cb.checked?hidden.delete(cb.dataset.col):hidden.add(cb.dataset.col);applyCols();});
  panel.querySelectorAll('.colactions button').forEach(b=>b.addEventListener('click',()=>{
    hidden=b.dataset.all==='1'?new Set():new Set(ALL);applyCols();}));
  document.addEventListener('click',()=>{if(!panel.hidden){panel.hidden=true;colbtn.setAttribute('aria-expanded','false');}});

  function passes(d){for(const id of active){const f=FILTERS.find(x=>x.id===id);if(f&&!f.test(d))return false;}return true;}

  function render(){
    let rows=DATA.filter(passes);
    if(colSort){rows.sort(colCmp);}
    else{const s=SORTS.find(x=>x.id===sortMode)||SORTS[0];rows.sort(s.cmp);}
    tbody.innerHTML='';
    const frag=document.createDocumentFragment();
    rows.forEach(d=>{
      const tr=document.createElement('tr');
      tr.className='row';tr.tabIndex=0;tr.setAttribute('aria-expanded','false');
      tr.innerHTML='<td><span class="chev">▶</span></td>'+
        COLUMNS.map(c=>`<td data-col="${c.id}">${c.cell(d)}</td>`).join('');
      const ex=document.createElement('tr');
      ex.className='expand';ex.hidden=true;
      ex.innerHTML=`<td colspan="${COLUMNS.length+1}"><div class="inner">`+
        EXPAND.map(e=>{const h=e.html(d);return h?`<div><h4>${esc(e.label)}</h4><p>${h}</p></div>`:'';}).join('')+
        `</div></td>`;
      const toggle=()=>{const o=tr.getAttribute('aria-expanded')==='true';tr.setAttribute('aria-expanded',String(!o));ex.hidden=o;};
      tr.addEventListener('click',toggle);
      tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
      frag.appendChild(tr);frag.appendChild(ex);
    });
    tbody.appendChild(frag);
    countEl.textContent=`${rows.length} of ${DATA.length} ${DB.noun} shown`;
  }

  applyCols();
  markHeaders();
  render();
})();
