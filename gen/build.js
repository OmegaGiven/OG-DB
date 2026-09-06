#!/usr/bin/env node
// Usage: node gen/build.js <slug>
// Reads gen/db/<slug>.meta.json, gen/db/<slug>.defs.js, and the data file named in meta.
// Writes OG-DB/<slug>/index.html and OG-DB/<slug>/<slug>.json
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const slug=process.argv[2];
if(!slug){console.error('need slug');process.exit(1);}

const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'db',slug+'.meta.json'),'utf8'));
const defs=fs.readFileSync(path.join(__dirname,'db',slug+'.defs.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'shell.css'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,meta.dataFile),'utf8'));

const DB={name:meta.dbName,compiled:meta.compiled,noun:meta.noun};

const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.description||''}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
body{margin:0;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}img{max-width:100%}[hidden]{display:none!important}
${css}
</style>
</head>
<body>
<div class="wrap">
  <header class="masthead">
    <h1><a class="crumb" href="../">OG-DB</a><span class="sep">/</span>${meta.dbName} <span class="compiled">compiled ${meta.compiled}</span></h1>
  </header>
  ${meta.primerHTML||''}
  <div class="controls">
    <div class="grp searchwrap"><input id="rowq" class="rowsearch" type="search" placeholder="Search rows… ( / )" autocomplete="off" aria-label="Search rows"></div>
    <div class="grp"><span class="glabel">Filter</span><span id="filters" style="display:contents"></span></div>
    <div class="grp"><span class="glabel">Sort</span><select id="sort"></select></div>
    <div class="grp colwrap">
      <button class="chip" id="colbtn" aria-expanded="false" aria-controls="colpanel">Columns ▾</button>
      <div class="colpanel" id="colpanel" hidden>
        <p class="colhead">Show columns</p>
        <div class="colactions"><button type="button" data-all="1">All</button><button type="button" data-all="0">Minimal</button></div>
      </div>
    </div>
  </div>
  <div class="count" id="count"></div>
  <div class="tablewrap"><table id="tbl"><thead><tr></tr></thead><tbody id="tbody"></tbody></table></div>
  ${meta.footerHTML||''}
</div>
<script>
const DATA=${JSON.stringify(data)};
const DB=${JSON.stringify(DB)};
${defs}
${engine}
</script>
</body>
</html>
`;

const outdir=path.join(ROOT,slug);
fs.mkdirSync(outdir,{recursive:true});
fs.writeFileSync(path.join(outdir,'index.html'),html);
fs.writeFileSync(path.join(outdir,slug+'.json'),JSON.stringify(data,null,2));
console.log(`built ${slug}: ${data.length} rows -> ${slug}/  (index.html ${(html.length/1024|0)}kb)`);
