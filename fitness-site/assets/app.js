
const API_BASE="";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
async function api(url,opt={}){
  const r=await fetch(API_BASE+url,{credentials:"include",headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});
  let d={}; try{d=await r.json()}catch{}
  if(!r.ok) throw Error(d.error||"حدث خطأ");
  return d;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function nav(){
  const path=location.pathname.split("/").pop()||"index.html";
  $$(".links a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===path));
  const y=$("#year"); if(y)y.textContent=new Date().getFullYear();
}
function reveal(){
  const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("show")}),{threshold:.1});
  $$(".reveal").forEach(x=>o.observe(x));
}
function n(el,target){
  if(!el)return; let start=performance.now();
  function f(t){let p=Math.min((t-start)/900,1);el.textContent=Math.floor(target*p);if(p<1)requestAnimationFrame(f);else el.textContent=target}
  requestAnimationFrame(f);
}
function layout(){
  document.body.insertAdjacentHTML("afterbegin",`<div class="bg"><div class="orb a"></div><div class="orb b"></div><div class="orb c"></div></div>`);
  nav(); reveal();
}
async function site(){try{return await api("/api/site")}catch{return {plans:[],workouts:[],settings:{}}}}
layout();
