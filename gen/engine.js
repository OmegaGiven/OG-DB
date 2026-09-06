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

  const tbl=$('#tbl'), tbody=$('#tbody'), countEl=$('#count');
  const active=new Set();
  let sortMode=SORTS[0].id;

  // header
  const htr=$('#tbl thead tr');
  htr.innerHTML='<th style="width:32px" aria-label="expand"></th>'+
    COLUMNS.map(c=>`<th data-col="${c.id}">${esc(c.label)}</th>`).join('');

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
  sel.addEventListener('change',e=>{sortMode=e.target.value;render();});

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
    const s=SORTS.find(x=>x.id===sortMode)||SORTS[0];
    rows.sort(s.cmp);
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
  render();
})();
