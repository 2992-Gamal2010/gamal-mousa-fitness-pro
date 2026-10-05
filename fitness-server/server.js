require("dotenv").config();
const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const multer=require("multer");
const crypto=require("crypto");
const axios=require("axios");
const fs=require("fs");
const path=require("path");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;
const DATA=path.join(ROOT,"data");
const UPLOADS=path.join(ROOT,"uploads");
const SITE=path.join(ROOT,"..","fitness-site");
const ADMIN=path.join(ROOT,"..","fitness-admin");

fs.mkdirSync(DATA,{recursive:true});
fs.mkdirSync(UPLOADS,{recursive:true});

const defaults={
  users:[{
    id:"demo-admin-user",name:"Ø¬Ù…Ø§Ù„ Ù…ÙˆØ³Ù‰",email:"demo@example.com",
    passwordHash:bcrypt.hashSync("Demo123456",10),planId:"free",status:"active",
    createdAt:new Date().toISOString(),expiresAt:null
  }],
  plans:[
    {id:"free",name:"Ù…Ø¬Ø§Ù†ÙŠ",price:0,period:"Ø´Ù‡Ø±ÙŠ",description:"Ø§Ø¨Ø¯Ø£ Ø¨Ø¹Ø§Ø¯Ø§Øª ØµØ­ÙŠØ© ÙˆØªÙ…Ø§Ø±ÙŠÙ† Ø£Ø³Ø§Ø³ÙŠØ©.",features:["ØªÙ…Ø§Ø±ÙŠÙ† Ø£Ø³Ø§Ø³ÙŠØ©","Ù…Ø­ØªÙˆÙ‰ ØµØ­ÙŠ Ø¹Ø§Ù…"],active:true},
    {id:"pro",name:"Pro",price:99,period:"Ø´Ù‡Ø±ÙŠ",description:"Ù…ÙƒØªØ¨Ø© Ø£ÙƒØ¨Ø± Ù…Ù† Ø§Ù„ØªÙ…Ø§Ø±ÙŠÙ† ÙˆØ®Ø·Ø· Ù…Ù†Ø¸Ù…Ø©.",features:["ÙƒÙ„ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø¬Ø§Ù†ÙŠ","ØªÙ…Ø§Ø±ÙŠÙ† Ø¥Ø¶Ø§ÙÙŠØ©","Ø®Ø·Ø· ØªØ¯Ø±ÙŠØ¨"],active:true},
    {id:"premium",name:"Premium",price:199,period:"Ø´Ù‡Ø±ÙŠ",description:"Ø§Ù„ØªØ¬Ø±Ø¨Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ù…Ø¹ Ù…Ø­ØªÙˆÙ‰ Premium.",features:["ÙƒÙ„ Ù…Ø­ØªÙˆÙ‰ Pro","ØªÙ…Ø§Ø±ÙŠÙ† Premium","ÙÙŠØ¯ÙŠÙˆÙ‡Ø§Øª ÙˆØµÙˆØ±","ØªØªØ¨Ø¹ Ø§Ù„ØªÙ‚Ø¯Ù…"],active:true}
  ],
  workouts:[
    {id:"w1",title:"Ø³ÙƒÙˆØ§Øª ÙˆØ²Ù† Ø§Ù„Ø¬Ø³Ù…",description:"ØªÙ…Ø±ÙŠÙ† Ø£Ø³Ø§Ø³ÙŠ Ù„Ù„Ø±Ø¬Ù„ÙŠÙ†. Ù†ÙØ°Ù‡ Ø¨ØªØ­ÙƒÙ… ÙˆØ¨Ù…Ø¯Ù‰ Ø­Ø±ÙƒØ© Ù…Ø±ÙŠØ­.",level:"Ù…Ø¨ØªØ¯Ø¦",planId:"free",image:"",video:"",sets:"3",reps:"10-12",createdAt:new Date().toISOString()},
    {id:"w2",title:"Ø¶ØºØ· Ø¹Ù„Ù‰ Ø§Ù„Ø­Ø§Ø¦Ø·",description:"Ù†Ø³Ø®Ø© Ø³Ù‡Ù„Ø© Ù…Ù† Ø§Ù„Ø¶ØºØ· Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù„Ø¨Ø¯Ø§ÙŠØ©.",level:"Ù…Ø¨ØªØ¯Ø¦",planId:"free",image:"",video:"",sets:"3",reps:"10-12",createdAt:new Date().toISOString()},
    {id:"w3",title:"Glute Bridge",description:"Ø±ÙØ¹ Ø§Ù„Ø­ÙˆØ¶ Ù…Ø¹ Ø´Ø¯ Ø¹Ø¶Ù„Ø§Øª Ø§Ù„Ù…Ø¤Ø®Ø±Ø© ÙˆØ§Ù„ØªØ­ÙƒÙ… ÙÙŠ Ø§Ù„Ø­Ø±ÙƒØ©.",level:"Ù…Ø¨ØªØ¯Ø¦",planId:"pro",image:"",video:"",sets:"3",reps:"12-15",createdAt:new Date().toISOString()},
    {id:"w4",title:"Plank",description:"Ø«Ø¨Ø§Øª Ø§Ù„Ø¬Ø°Ø¹ Ù…Ø¹ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ ÙˆØ¶Ø¹ Ø¬Ø³Ù… Ù…Ø±ÙŠØ­.",level:"Ù…ØªÙˆØ³Ø·",planId:"premium",image:"",video:"",sets:"3",reps:"20-30 Ø«Ø§Ù†ÙŠØ©",createdAt:new Date().toISOString()}
  ],
  payments:[],
  settings:{
    brand:"Ø¬Ù…Ø§Ù„ Ù…ÙˆØ³Ù‰ FITNESS",
    logoText:"GM",
    cashNumber:"01131704920",
    fawryLink:"",
    supportPhone:"01131704920",
    siteUrl:"http://localhost:3000"
  }
};
for(const [k,v] of Object.entries(defaults)){
  const f=path.join(DATA,k+".json");
  if(!fs.existsSync(f))fs.writeFileSync(f,JSON.stringify(v,null,2),"utf8");
}
const read=k=>JSON.parse(fs.readFileSync(path.join(DATA,k+".json"),"utf8"));
const write=(k,v)=>fs.writeFileSync(path.join(DATA,k+".json"),JSON.stringify(v,null,2),"utf8");

app.use((req,res,next)=>{res.header("Access-Control-Allow-Origin","https://gamal-mousa-fitness.vercel.app");res.header("Access-Control-Allow-Credentials","true");res.header("Access-Control-Allow-Headers","Content-Type");res.header("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS");if(req.method==="OPTIONS")return res.sendStatus(204);next();});

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.set("trust proxy",1);
app.use(session({
  secret:process.env.SESSION_SECRET||"CHANGE_THIS_SESSION_SECRET",
  resave:false,saveUninitialized:false,proxy:true,
  cookie:{httpOnly:true,sameSite:"none",secure:true,maxAge:1000*60*60*24*7}
}));
app.use("/uploads",express.static(UPLOADS));
app.use("/admin",express.static(ADMIN));
app.use(express.static(SITE));

const userOnly=(req,res,next)=>req.session.user?next():res.status(401).json({error:"Ø³Ø¬Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹."});
const adminOnly=(req,res,next)=>req.session.admin?next():res.status(401).json({error:"ØºÙŠØ± Ù…ØµØ±Ø­."});

function publicUser(u){
  if(!u)return null;
  return {id:u.id,name:u.name,email:u.email,planId:u.planId,expiresAt:u.expiresAt,status:u.status};
}
function getPlan(id){return read("plans").find(p=>p.id===id);}
function addMonth(){
  const d=new Date();
  d.setMonth(d.getMonth()+1);
  return d.toISOString();
}
function cleanName(name){return String(name||"").trim().slice(0,80)}
function emailOf(v){return String(v||"").trim().toLowerCase()}

function workoutAccessLevel(planId){
  const p=String(planId||"free").toLowerCase();
  if(p==="premium") return 3;
  if(p==="pro") return 2;
  return 1;
}

function userAccessLevel(req){
  if(!req.session.user) return 1;

  const u=read("users").find(x=>x.id===req.session.user.id);
  if(!u || u.status!=="active") return 1;

  if(u.expiresAt && new Date(u.expiresAt).getTime()<Date.now()) return 1;

  return workoutAccessLevel(u.planId);
}

app.get("/api/site",(req,res)=>{
  const level=userAccessLevel(req);

  const workouts=read("workouts").filter(
    w=>workoutAccessLevel(w.planId)<=level
  );

  res.json({
    settings:read("settings"),
    plans:read("plans").filter(p=>p.active),
    workouts
  });
});

app.post("/api/register",async(req,res)=>{
  const name=cleanName(req.body.name), email=emailOf(req.body.email), password=String(req.body.password||"");
  if(!name||!email||password.length<6)return res.status(400).json({error:"Ø§ÙƒØªØ¨ Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯ ÙˆÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„."});
  const users=read("users");
  if(users.some(u=>u.email===email))return res.status(409).json({error:"Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ÙØ¹Ù„."});
  const u={id:crypto.randomUUID(),name,email,passwordHash:await bcrypt.hash(password,10),planId:"free",status:"active",createdAt:new Date().toISOString(),expiresAt:null};
  users.push(u);write("users",users);req.session.user=publicUser(u);req.session.save(err=>{if(err)return res.status(500).json({error:"Session error"});res.json({user:req.session.user})});
});
app.post("/api/login",async(req,res)=>{
  const users=read("users"),u=users.find(x=>x.email===emailOf(req.body.email));
  if(!u||!(await bcrypt.compare(String(req.body.password||""),u.passwordHash)))return res.status(401).json({error:"Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ ØºÙŠØ± ØµØ­ÙŠØ­Ø©."});
  if(u.status==="blocked")return res.status(403).json({error:"Ø§Ù„Ø­Ø³Ø§Ø¨ Ù…ÙˆÙ‚ÙˆÙ."});
  req.session.user=publicUser(u);req.session.save(err=>{if(err)return res.status(500).json({error:"Session error"});res.json({user:req.session.user})});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>{ if(!req.session.user)return res.json({user:null}); const users=read("users"); const u=users.find(x=>x.id===req.session.user.id); if(!u)return res.json({user:null}); req.session.user=publicUser(u); res.json({user:req.session.user}); });

app.post("/api/checkout",userOnly,async(req,res)=>{
  const plan=getPlan(req.body.planId);
  if(!plan||!plan.active||plan.price<=0)return res.status(400).json({error:"Ø§Ù„Ø®Ø·Ø© ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ù„Ù„Ø¯ÙØ¹."});
  const settings=read("settings");
const provider=String(req.body.provider||req.body.paymentMethod||"paymob").toLowerCase();
  const paymentId="PAY-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex");
  const payments=read("payments");
  const p={id:paymentId,userId:req.session.user.id,name:req.session.user.name,email:req.session.user.email,planId:plan.id,planName:plan.name,amount:plan.price,provider,status:"pending",createdAt:new Date().toISOString(),paymobOrderId:null};
  payments.push(p);write("payments",payments);

  if(provider==="cash"){
    return res.json({mode:"cash",cashNumber:settings.cashNumber,paymentId});
  }
  if(provider==="fawry"){
    if(!settings.fawryLink)return res.status(400).json({error:"Ù„Ù… ÙŠØªÙ… Ø¥Ø¹Ø¯Ø§Ø¯ Ø±Ø§Ø¨Ø· ÙÙˆØ±ÙŠ Ø¨Ø¹Ø¯. Ø§Ø³ØªØ®Ø¯Ù… Paymob Ø£Ùˆ Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ù†Ù‚Ø¯ÙŠ."});
    return res.json({mode:"external",url:settings.fawryLink,paymentId});
  }
  if(provider!=="paymob")return res.status(400).json({error:"Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙØ©."});
  if(!process.env.PAYMOB_SECRET_KEY||!process.env.PAYMOB_PUBLIC_KEY||!process.env.PAYMOB_INTEGRATION_IDS){
    return res.status(503).json({error:"Paymob ØºÙŠØ± Ù…ÙØ¹Ø¯ Ø¨Ø¹Ø¯. Ø¶Ø¹ Ù…ÙØ§ØªÙŠØ­ Paymob ÙÙŠ Ù…Ù„Ù .env Ø«Ù… Ø£Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ±."});
  }
  try{
    const base=(process.env.PAYMOB_BASE_URL||"https://accept.paymob.com").replace(/\/$/,"");
    const ids=process.env.PAYMOB_INTEGRATION_IDS.split(",").map(x=>Number(x.trim())).filter(Boolean);
    const first=(req.session.user.name||"Ø¹Ù…ÙŠÙ„").split(/\s+/)[0];
    const last=(req.session.user.name||"Fitness").split(/\s+/).slice(1).join(" ")||"Fitness";
    const appUrl=process.env.APP_URL||settings.siteUrl||`http://localhost:${PORT}`;
    const payload={
      amount:Math.round(plan.price*100),currency:"EGP",payment_methods:ids,
      items:[{name:`Ø§Ø´ØªØ±Ø§Ùƒ ${plan.name}`,amount:Math.round(plan.price*100),description:plan.description,quantity:1}],
      billing_data:{
        apartment:"NA",first_name:first,last_name:last,street:"NA",building:"NA",floor:"NA",
        phone_number:req.body.phone||"01000000000",city:"Zagazig",state:"Sharqia",country:"EG",postal_code:"NA"
      },
      customer:{first_name:first,last_name:last,email:req.session.user.email},
      extras:{local_payment_id:paymentId,plan_id:plan.id},
      special_reference:paymentId,
      expiration:3600,
      notification_url:`${appUrl}/api/paymob/webhook`,
      redirection_url:`${appUrl}/payment/complete`
    };
    const r=await axios.post(`${base}/v1/intention/`,payload,{headers:{Authorization:`Token ${process.env.PAYMOB_SECRET_KEY}`,"Content-Type":"application/json"},timeout:20000});
    const data=r.data;
    const arr=read("payments");const ix=arr.findIndex(x=>x.id===paymentId);
    arr[ix].paymobOrderId=data.intention_order_id||null;arr[ix].paymobIntentionId=data.id||null;write("payments",arr);
    const url=`${base}/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY)}&clientSecret=${encodeURIComponent(data.client_secret)}`;
    res.json({mode:"redirect",url,paymentId});
  }catch(e){
    const msg=e.response?.data?.detail||e.response?.data?.message||"ØªØ¹Ø°Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¯ÙØ¹.";
    res.status(502).json({error:String(msg)});
  }
});

app.post("/api/cash-confirm",userOnly,(req,res)=>{
  const payments=read("payments"),p=payments.find(x=>x.id===req.body.paymentId&&x.userId===req.session.user.id);
  if(!p)return res.status(404).json({error:"Ø·Ù„Ø¨ Ø§Ù„Ø¯ÙØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."});
  p.reference=String(req.body.reference||"").trim().slice(0,120);p.status="pending_admin";p.updatedAt=new Date().toISOString();write("payments",payments);
  res.json({ok:true});
});

function verifyHmac(obj,received){
  const secret=process.env.PAYMOB_HMAC_SECRET;
  if(!secret||!obj||!received)return false;
  const vals=[
    obj.amount_cents,obj.created_at,obj.currency,obj.error_occured,obj.has_parent_transaction,obj.id,
    obj.integration_id,obj.is_3d_secure,obj.is_auth,obj.is_capture,obj.is_refunded,obj.is_standalone_payment,
    obj.is_voided,obj.order?.id,obj.owner,obj.pending,obj.source_data?.pan,obj.source_data?.sub_type,obj.source_data?.type,obj.success
  ];
  const s=vals.map(v=>String(v)).join("");
  const computed=crypto.createHmac("sha512",secret).update(s).digest("hex");
  if(computed.length!==String(received).length)return false;
  return crypto.timingSafeEqual(Buffer.from(computed),Buffer.from(String(received)));
}
app.post("/api/paymob/webhook",(req,res)=>{
  const obj=req.body?.obj,received=req.query.hmac;
  if(!verifyHmac(obj,received))return res.status(401).json({error:"Invalid HMAC"});
  if(obj.success===true && obj.pending===false){
    const payments=read("payments");
    const localId=obj.order?.merchant_order_id||obj.order?.merchant_order_id||obj.merchant_order_id;
    const p=payments.find(x=>x.id===localId);
    if(p&&p.status!=="paid"){
      p.status="paid";p.paidAt=new Date().toISOString();p.transactionId=String(obj.id);write("payments",payments);
      const users=read("users"),u=users.find(x=>x.id===p.userId);
      if(u){u.planId=p.planId;u.expiresAt=addMonth();write("users",users);}
    }
  }
  res.json({received:true});
});
app.get("/payment/complete",(req,res)=>res.sendFile(path.join(SITE,"payment-complete.html")));

app.post("/api/admin/login",(req,res)=>{
  const user=process.env.ADMIN_USERNAME||"admin",pass=process.env.ADMIN_PASSWORD||"ChangeMe123!";
  if(req.body.username!==user||req.body.password!==pass)return res.status(401).json({error:"Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø´Ø±Ù ØºÙŠØ± ØµØ­ÙŠØ­Ø©."});
  req.session.admin=true;res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{req.session.admin=false;res.json({ok:true})});
app.get("/api/admin/stats",adminOnly,(req,res)=>{
  const users=read("users"),payments=read("payments"),plans=read("plans"),workouts=read("workouts");
  res.json({users:users.length,payments:payments.filter(p=>p.status==="pending_admin"||p.status==="pending").length,paid:payments.filter(p=>p.status==="paid").length,plans:plans.length,workouts:workouts.length});
});
app.get("/api/admin/users",adminOnly,(req,res)=>res.json(read("users").map(u=>({id:u.id,name:u.name,email:u.email,planId:u.planId,status:u.status,createdAt:u.createdAt,expiresAt:u.expiresAt}))));
app.post("/api/admin/user",adminOnly,async(req,res)=>{
  const users=read("users"),name=cleanName(req.body.name),email=emailOf(req.body.email),password=String(req.body.password||"");
  if(!name||!email)return res.status(400).json({error:"Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø·Ù„ÙˆØ¨Ø§Ù†."});
  if(users.some(u=>u.email===email))return res.status(409).json({error:"Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³ØªØ®Ø¯Ù…."});
  const u={id:crypto.randomUUID(),name,email,passwordHash:await bcrypt.hash(password||crypto.randomBytes(8).toString("hex"),10),planId:req.body.planId||"free",status:"active",createdAt:new Date().toISOString(),expiresAt:null};
  users.push(u);write("users",users);res.json({ok:true});
});
app.patch("/api/admin/user/:id",adminOnly,(req,res)=>{
  const users=read("users"),u=users.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({error:"Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."});
  if(req.body.planId&&getPlan(req.body.planId))u.planId=req.body.planId;
  if(req.body.status)u.status=req.body.status;
  if(req.body.resetPassword)u.passwordHash=bcrypt.hashSync(String(req.body.resetPassword),10);
  write("users",users);res.json({ok:true});
});
app.delete("/api/admin/user/:id",adminOnly,(req,res)=>{write("users",read("users").filter(x=>x.id!==req.params.id));res.json({ok:true})});

app.get("/api/admin/payments",adminOnly,(req,res)=>res.json(read("payments")));
app.post("/api/admin/payment/:id/approve",adminOnly,(req,res)=>{
  const ps=read("payments"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."});
  p.status="paid";p.paidAt=new Date().toISOString();write("payments",ps);
  const us=read("users"),u=us.find(x=>x.id===p.userId);if(u){u.planId=p.planId;u.expiresAt=addMonth();write("users",us)}
  res.json({ok:true});
});
app.post("/api/admin/payment/:id/reject",adminOnly,(req,res)=>{
  const ps=read("payments"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."});
  p.status="rejected";p.updatedAt=new Date().toISOString();write("payments",ps);res.json({ok:true});
});

app.get("/api/admin/plans",adminOnly,(req,res)=>res.json(read("plans")));
app.post("/api/admin/plan",adminOnly,(req,res)=>{
  const plans=read("plans"),p={id:crypto.randomUUID(),name:cleanName(req.body.name),price:Number(req.body.price||0),period:cleanName(req.body.period)||"Ø´Ù‡Ø±ÙŠ",description:String(req.body.description||"").slice(0,300),features:String(req.body.features||"").split("\n").map(x=>x.trim()).filter(Boolean),active:true};
  if(!p.name)return res.status(400).json({error:"Ø§Ø³Ù… Ø§Ù„Ø®Ø·Ø© Ù…Ø·Ù„ÙˆØ¨."});plans.push(p);write("plans",plans);res.json({ok:true});
});
app.patch("/api/admin/plan/:id",adminOnly,(req,res)=>{
  const ps=read("plans"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Ø§Ù„Ø®Ø·Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©."});
  if(req.body.name!==undefined)p.name=cleanName(req.body.name);
  if(req.body.price!==undefined)p.price=Math.max(0,Number(req.body.price));
  if(req.body.period!==undefined)p.period=cleanName(req.body.period);
  if(req.body.description!==undefined)p.description=String(req.body.description).slice(0,300);
  if(req.body.features!==undefined)p.features=Array.isArray(req.body.features)?req.body.features:String(req.body.features).split("\n").map(x=>x.trim()).filter(Boolean);
  if(req.body.active!==undefined)p.active=!!req.body.active;
  write("plans",ps);res.json({ok:true});
});
app.delete("/api/admin/plan/:id",adminOnly,(req,res)=>{
  if(req.params.id==="free")return res.status(400).json({error:"Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ù…Ø¬Ø§Ù†ÙŠØ©."});
  write("plans",read("plans").filter(x=>x.id!==req.params.id));res.json({ok:true});
});

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOADS),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase().replace(/[^.\w-]/g,"");
    cb(null,Date.now()+"-"+crypto.randomBytes(4).toString("hex")+ext);
  }
});
const upload=multer({storage,limits:{fileSize:250*1024*1024},fileFilter:(req,file,cb)=>{
  const ok=/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)||/^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
  cb(ok?null:new Error("Ø§Ù„Ù…Ù„Ù ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† ØµÙˆØ±Ø© Ø£Ùˆ ÙÙŠØ¯ÙŠÙˆ Ù…Ø¯Ø¹ÙˆÙ…."),ok);
}});
app.post("/api/admin/upload",adminOnly,upload.single("file"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"Ù„Ù… ÙŠØªÙ… Ø±ÙØ¹ Ù…Ù„Ù."});
  res.json({url:"/uploads/"+req.file.filename,type:req.file.mimetype});
});

app.get("/api/admin/workouts",adminOnly,(req,res)=>res.json(read("workouts")));
app.post("/api/admin/workout",adminOnly,(req,res)=>{
  const plan=String(req.body.planId||"free").toLowerCase();

  const w={
    id:crypto.randomUUID(),
    title:cleanName(req.body.title),
    description:String(req.body.description||"").slice(0,1000),
    level:cleanName(req.body.level)||"Ù…Ø¨ØªØ¯Ø¦",
    planId:["free","pro","premium"].includes(plan)?plan:"free",
    image:String(req.body.image||""),
    video:String(req.body.video||""),
    muscles:String(req.body.muscles||""),
    sets:String(req.body.sets||""),
    reps:String(req.body.reps||""),
    rest:String(req.body.rest||""),
    howTo:String(req.body.howTo||"").slice(0,3000),
    mistakes:String(req.body.mistakes||"").slice(0,2000),
    createdAt:new Date().toISOString()
  };

  if(!w.title)return res.status(400).json({error:"Ø§Ø³Ù… Ø§Ù„ØªÙ…Ø±ÙŠÙ† Ù…Ø·Ù„ÙˆØ¨."});

  const arr=read("workouts");
  arr.unshift(w);
  write("workouts",arr);

  res.json({ok:true,workout:w});
});

app.patch("/api/admin/workout/:id",adminOnly,(req,res)=>{
  const arr=read("workouts");
  const w=arr.find(x=>x.id===req.params.id);

  if(!w)return res.status(404).json({error:"Ø§Ù„ØªÙ…Ø±ÙŠÙ† ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."});

  for(const k of [
    "title","description","level","image","video",
    "muscles","sets","reps","rest","howTo","mistakes"
  ]){
    if(req.body[k]!==undefined){
      w[k]=String(req.body[k]);
    }
  }

  if(req.body.planId!==undefined){
    const plan=String(req.body.planId).toLowerCase();
    if(["free","pro","premium"].includes(plan)){
      w.planId=plan;
    }
  }

  write("workouts",arr);
  res.json({ok:true,workout:w});
});

app.delete("/api/admin/workout/:id",adminOnly,(req,res)=>{
  write("workouts",read("workouts").filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});


app.get("/api/admin/settings",adminOnly,(req,res)=>res.json(read("settings")));
app.patch("/api/admin/settings",adminOnly,(req,res)=>{
  const s=read("settings");for(const k of ["brand","logoText","cashNumber","fawryLink","supportPhone","siteUrl"])if(req.body[k]!==undefined)s[k]=String(req.body[k]).trim();
  write("settings",s);res.json({ok:true});
});

app.get("/health",(req,res)=>res.json({ok:true,service:"Gamal Mousa Fitness"}));

app.use((err,req,res,next)=>{
  if(err instanceof multer.MulterError)return res.status(400).json({error:"Ø­Ø¬Ù…/Ù†ÙˆØ¹ Ø§Ù„Ù…Ù„Ù ØºÙŠØ± Ù…Ù†Ø§Ø³Ø¨: "+err.message});
  if(err)return res.status(400).json({error:err.message||"Ø­Ø¯Ø« Ø®Ø·Ø£."});
  next();
});

app.listen(PORT,"0.0.0.0",()=>console.log(`Ø¬Ù…Ø§Ù„ Ù…ÙˆØ³Ù‰ FITNESS: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin`));




