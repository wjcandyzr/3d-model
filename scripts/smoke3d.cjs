// Smoke test (node scripts/smoke3d.cjs): build every furniture type and the fixed decor with the real
// three.js under Node, to catch runtime errors in the 3D code before it reaches the site.
const fs=require('fs'), vm=require('vm');
const path=require('path'), root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const script=html.match(/<script>\r?\n([\s\S]*?)\r?\n<\/script>/)[1].replace(/\r\n/g,'\n');   // tolerate CRLF checkouts
const cut=(a,b)=>{ const i=script.indexOf(a), j=script.indexOf(b,i); if(i<0||j<0) throw new Error('marker '+a); return script.slice(i,j); };
const model=cut('const G = ','ROOMS.forEach(r=>r.area');
const three3d=cut('/* ============ 3D','/* ---------- scene ---------- */');
const mvdecor=cut('// ---------- colour:','function buildMv(){');
const ctx2d=()=>new Proxy({}, {get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):k==='getImageData'?(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}):(k in t?t[k]:()=>{}), set:(t,k,v)=>(t[k]=v,true)});
const document={createElement:()=>({width:0,height:0,getContext:()=>ctx2d()}), querySelector:()=>null};
const ctx={console,document,window:{},matchMedia:()=>({matches:false}),Image:function(){},Uint8ClampedArray};
ctx.self=ctx; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/three.min.js'),'utf8'),ctx);
const test=`
const MY=(C1+C2)/2;
${three3d}
${mvdecor}
T.group=new THREE.Group(); T.renderer={capabilities:{getMaxAnisotropy:()=>8}};
let n=0; for(const it of DEFAULT_ITEMS){ const g=mvMesh(it); g.traverse(()=>n++); }
for(const t of Object.keys(CATALOG)){ mvMesh({id:'u1',type:t,cx:1,cy:1,rot:90}); }
decor(2.8); decor(1.2);
({meshesInFurniture:n, decorObjects:T.group.children.length});`;
const out=vm.runInContext(model+test,ctx,{filename:'smoke3d'});
console.log(`smoke3d: built ${out.meshesInFurniture} furniture meshes and ${out.decorObjects} decor objects`);
