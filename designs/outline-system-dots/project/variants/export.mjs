// Rebuild the review media from authored geometry. No application state is loaded.
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { catalog } from "./catalog.mjs";
import { background } from "./backgrounds.mjs";
import { artboard, sheet, standalone, boardWidth, boardHeight } from "./layout.mjs";
import { gallery } from "./gallery.mjs";

const require=createRequire(new URL("../../../../package.json",import.meta.url));
const sharp=require("sharp");
const project=fileURLToPath(new URL("../",import.meta.url));
const repository=fileURLToPath(new URL("../../../../",import.meta.url));
const media=join(project,"variant-media");
const scratch=await mkdtemp(join(tmpdir(),"thinkly-dot-variants-"));
const oldSvgs={};
const patchPaths=[];
await mkdir(media,{recursive:true});

function firstSvg(text){
  const start=text.indexOf('<svg');
  const tokens=/<\/?svg\b[^>]*>/g;
  tokens.lastIndex=start;
  let depth=0, token;
  while((token=tokens.exec(text))){depth+=token[0].startsWith('</')?-1:1;if(depth===0)return text.slice(start,tokens.lastIndex);}
  throw new Error('Missing old SVG');
}
function newFilePatch(path,contents){return `*** Begin Patch\n*** Add File: ${path}\n${contents.trimEnd().split('\n').map(line=>'+'+line).join('\n')}\n*** End Patch\n`;}

for(let index=0;index<catalog.length;index++){
  const row=catalog[index];
  const old=firstSvg(execFileSync('git',['show',`a3443425:designs/outline-system-dots/project/${row.oldFile}.dc.html`],{cwd:repository,encoding:'utf8',maxBuffer:2e6}));
  oldSvgs[row.key]=old;
  const patchFile=join(scratch,row.key+'.patch');
  await writeFile(patchFile,newFilePatch(join(project,row.key+'Variants.dc.html'),artboard(row,index,old)));
  patchPaths.push(patchFile);
}

const current=await readFile(join(project,'canvas.json'),'utf8');
const index=JSON.parse(current);
index.pages=[...index.pages.filter(page=>!['applied','alternatives'].includes(page.id)),{id:'applied',name:'已实施'},{id:'alternatives',name:'待选方案'}];
index.launch={view:'canvas',page:'alternatives'};
catalog.forEach((row,i)=>{const file=row.key+'Variants.dc.html';index.boards[file]={x:(i%2)*(boardWidth+80),y:Math.floor(i/2)*(boardHeight+120),w:boardWidth,h:boardHeight,title:row.title+' · 旧版 / A / B / C',radius:0,page:'alternatives'};if(!index.order.includes(file))index.order.push(file);});
const updated=JSON.stringify(index,null,2)+'\n';
const indexPatch=`*** Begin Patch\n*** Update File: ${join(project,'canvas.json')}\n@@\n${current.trimEnd().split('\n').map(line=>'-'+line).join('\n')}\n${updated.trimEnd().split('\n').map(line=>'+'+line).join('\n')}\n*** End Patch\n`;
await writeFile(join(scratch,'index.patch'),indexPatch);
await writeFile(join(scratch,'gallery.patch'),newFilePatch(join(project,'variants.html'),gallery(catalog,oldSvgs)));
await writeFile(join(scratch,'manifest.json'),JSON.stringify({scratch,patchPaths,indexPatch:join(scratch,'index.patch'),galleryPatch:join(scratch,'gallery.patch')}));
console.log(JSON.stringify({scratch,phase:'prepared',boards:catalog.length,variants:catalog.length*3}));

const report=[];
for(let index=0;index<catalog.length;index++){
  const row=catalog[index], old=oldSvgs[row.key];
  const frames=[];
  for(let frame=0;frame<48;frame++){
    const svg=sheet(row,index,old,frame/4);
    frames.push(await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer());
  }
  const bytes=Buffer.concat(frames);
  await sharp(bytes,{raw:{width:1600,height:480*48,channels:4,pageHeight:480},limitInputPixels:false})
    .gif({loop:0,delay:Array(48).fill(250),colours:128,dither:0,effort:7}).toFile(join(media,row.key+'.gif'));
  await sharp(Buffer.from(sheet(row,index,old,0))).resize(3200,960).png().toFile(join(media,row.key+'.png'));
  await sharp(Buffer.from(sheet(row,index,old,4.3,'dark'))).png().toFile(join(scratch,row.key+'-dark.png'));
  for(let v=0;v<3;v++)await writeFile(join(media,row.key+'-'+row.variants[v].letter+'.svg'),standalone(row,index,v));
  const metadata=await sharp(join(media,row.key+'.gif'),{animated:true}).metadata();
  report.push({key:row.key,title:row.title,frames:metadata.pages,loop:metadata.loop,durationMs:metadata.delay.reduce((a,b)=>a+b,0),variants:row.variants.map((v,i)=>({letter:v.letter,name:v.name,background:background(index*3+i).name,note:v.note}))});
  console.log(JSON.stringify(report.at(-1)));
}
await writeFile(join(media,'catalog.json'),JSON.stringify(report,null,2)+'\n');
const darkTiles=await Promise.all(catalog.map(async row=>({input:await sharp(join(scratch,row.key+'-dark.png')).resize(800,240).png().toBuffer()})));
await sharp({create:{width:1600,height:960,channels:4,background:'#222222'}}).composite(darkTiles.map((tile,i)=>({...tile,left:(i%2)*800,top:Math.floor(i/2)*240}))).png().toFile(join(scratch,'dark-overview.png'));
console.log(JSON.stringify({scratch,phase:'finished',media,boards:7,variants:21}));
