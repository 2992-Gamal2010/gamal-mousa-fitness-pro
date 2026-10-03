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
    id:"demo-admin-user",name:"جمال موسى",email:"demo@example.com",
    passwordHash:bcrypt.hashSync("Demo123456",10),planId:"free",status:"active",
    createdAt:new Date().toISOString(),expiresAt:null
  }],
  plans:[
    {id:"free",name:"مجاني",price:0,period:"شهري",description:"ابدأ بعادات صحية وتمارين أساسية.",features:["تمارين أساسية","محتوى صحي عام"],active:true},
    {id:"pro",name:"Pro",price:99,period:"شهري",description:"مكتبة أكبر من التمارين وخطط منظمة.",features:["كل محتوى المجاني","تمارين إضافية","خطط تدريب"],active:true},
    {id:"premium",name:"Premium",price:199,period:"شهري",description:"التجربة الكاملة مع محتوى Premium.",features:["كل محتوى Pro","تمارين Premium","فيديوهات وصور","تتبع التقدم"],active:true}
  ],
  workouts:[
    {id:"w1",title:"سكوات وزن الجسم",description:"تمرين أساسي للرجلين. نفذه بتحكم وبمدى حركة مريح.",level:"مبتدئ",planId:"free",image:"",video:"",sets:"3",reps:"10-12",createdAt:new Date().toISOString()},
    {id:"w2",title:"ضغط على الحائط",description:"نسخة سهلة من الضغط مناسبة للبداية.",level:"مبتدئ",planId:"free",image:"",video:"",sets:"3",reps:"10-12",createdAt:new Date().toISOString()},
    {id:"w3",title:"Glute Bridge",description:"رفع الحوض مع شد عضلات المؤخرة والتحكم في الحركة.",level:"مبتدئ",planId:"pro",image:"",video:"",sets:"3",reps:"12-15",createdAt:new Date().toISOString()},
    {id:"w4",title:"Plank",description:"ثبات الجذع مع الحفاظ على وضع جسم مريح.",level:"متوسط",planId:"premium",image:"",video:"",sets:"3",reps:"20-30 ثانية",createdAt:new Date().toISOString()}
  ],
  payments:[],
  settings:{
    brand:"جمال موسى FITNESS",
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
app.set("trust proxy",1);\napp.set("trust proxy",1);
app.use(session({
  secret:process.env.SESSION_SECRET||"CHANGE_THIS_SESSION_SECRET",
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"none",secure:true,maxAge:1000*60*60*24*7}
}));
app.use("/uploads",express.static(UPLOADS));
app.use("/admin",express.static(ADMIN));
app.use(express.static(SITE));

const userOnly=(req,res,next)=>req.session.user?next():res.status(401).json({error:"سجل الدخول أولاً."});
const adminOnly=(req,res,next)=>req.session.admin?next():res.status(401).json({error:"غير مصرح."});

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

app.get("/api/site", (req,res)=>res.json({
  settings:read("settings"),
  plans:read("plans").filter(p=>p.active),
  workouts:read("workouts")
}));

app.post("/api/register",async(req,res)=>{
  const name=cleanName(req.body.name), email=emailOf(req.body.email), password=String(req.body.password||"");
  if(!name||!email||password.length<6)return res.status(400).json({error:"اكتب الاسم والبريد وكلمة مرور 6 أحرف على الأقل."});
  const users=read("users");
  if(users.some(u=>u.email===email))return res.status(409).json({error:"البريد مسجل بالفعل."});
  const u={id:crypto.randomUUID(),name,email,passwordHash:await bcrypt.hash(password,10),planId:"free",status:"active",createdAt:new Date().toISOString(),expiresAt:null};
  users.push(u);write("users",users);req.session.user=publicUser(u);res.json({user:req.session.user});
});
app.post("/api/login",async(req,res)=>{
  const users=read("users"),u=users.find(x=>x.email===emailOf(req.body.email));
  if(!u||!(await bcrypt.compare(String(req.body.password||""),u.passwordHash)))return res.status(401).json({error:"بيانات الدخول غير صحيحة."});
  if(u.status==="blocked")return res.status(403).json({error:"الحساب موقوف."});
  req.session.user=publicUser(u);res.json({user:req.session.user});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));

app.post("/api/checkout",userOnly,async(req,res)=>{
  const plan=getPlan(req.body.planId);
  if(!plan||!plan.active||plan.price<=0)return res.status(400).json({error:"الخطة غير متاحة للدفع."});
  const settings=read("settings");
  const provider=req.body.provider||"paymob";
  const paymentId="PAY-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex");
  const payments=read("payments");
  const p={id:paymentId,userId:req.session.user.id,name:req.session.user.name,email:req.session.user.email,planId:plan.id,planName:plan.name,amount:plan.price,provider,status:"pending",createdAt:new Date().toISOString(),paymobOrderId:null};
  payments.push(p);write("payments",payments);

  if(provider==="cash"){
    return res.json({mode:"cash",cashNumber:settings.cashNumber,paymentId});
  }
  if(provider==="fawry"){
    if(!settings.fawryLink)return res.status(400).json({error:"لم يتم إعداد رابط فوري بعد. استخدم Paymob أو الدفع النقدي."});
    return res.json({mode:"external",url:settings.fawryLink,paymentId});
  }
  if(provider!=="paymob")return res.status(400).json({error:"طريقة الدفع غير معروفة."});
  if(!process.env.PAYMOB_SECRET_KEY||!process.env.PAYMOB_PUBLIC_KEY||!process.env.PAYMOB_INTEGRATION_IDS){
    return res.status(503).json({error:"Paymob غير مُعد بعد. ضع مفاتيح Paymob في ملف .env ثم أعد تشغيل السيرفر."});
  }
  try{
    const base=(process.env.PAYMOB_BASE_URL||"https://accept.paymob.com").replace(/\/$/,"");
    const ids=process.env.PAYMOB_INTEGRATION_IDS.split(",").map(x=>Number(x.trim())).filter(Boolean);
    const first=(req.session.user.name||"عميل").split(/\s+/)[0];
    const last=(req.session.user.name||"Fitness").split(/\s+/).slice(1).join(" ")||"Fitness";
    const appUrl=process.env.APP_URL||settings.siteUrl||`http://localhost:${PORT}`;
    const payload={
      amount:Math.round(plan.price*100),currency:"EGP",payment_methods:ids,
      items:[{name:`اشتراك ${plan.name}`,amount:Math.round(plan.price*100),description:plan.description,quantity:1}],
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
    const msg=e.response?.data?.detail||e.response?.data?.message||"تعذر إنشاء عملية الدفع.";
    res.status(502).json({error:String(msg)});
  }
});

app.post("/api/cash-confirm",userOnly,(req,res)=>{
  const payments=read("payments"),p=payments.find(x=>x.id===req.body.paymentId&&x.userId===req.session.user.id);
  if(!p)return res.status(404).json({error:"طلب الدفع غير موجود."});
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
  if(req.body.username!==user||req.body.password!==pass)return res.status(401).json({error:"بيانات المشرف غير صحيحة."});
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
  if(!name||!email)return res.status(400).json({error:"الاسم والبريد مطلوبان."});
  if(users.some(u=>u.email===email))return res.status(409).json({error:"البريد مستخدم."});
  const u={id:crypto.randomUUID(),name,email,passwordHash:await bcrypt.hash(password||crypto.randomBytes(8).toString("hex"),10),planId:req.body.planId||"free",status:"active",createdAt:new Date().toISOString(),expiresAt:null};
  users.push(u);write("users",users);res.json({ok:true});
});
app.patch("/api/admin/user/:id",adminOnly,(req,res)=>{
  const users=read("users"),u=users.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({error:"المستخدم غير موجود."});
  if(req.body.planId&&getPlan(req.body.planId))u.planId=req.body.planId;
  if(req.body.status)u.status=req.body.status;
  if(req.body.resetPassword)u.passwordHash=bcrypt.hashSync(String(req.body.resetPassword),10);
  write("users",users);res.json({ok:true});
});
app.delete("/api/admin/user/:id",adminOnly,(req,res)=>{write("users",read("users").filter(x=>x.id!==req.params.id));res.json({ok:true})});

app.get("/api/admin/payments",adminOnly,(req,res)=>res.json(read("payments")));
app.post("/api/admin/payment/:id/approve",adminOnly,(req,res)=>{
  const ps=read("payments"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"الطلب غير موجود."});
  p.status="paid";p.paidAt=new Date().toISOString();write("payments",ps);
  const us=read("users"),u=us.find(x=>x.id===p.userId);if(u){u.planId=p.planId;u.expiresAt=addMonth();write("users",us)}
  res.json({ok:true});
});
app.post("/api/admin/payment/:id/reject",adminOnly,(req,res)=>{
  const ps=read("payments"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"الطلب غير موجود."});
  p.status="rejected";p.updatedAt=new Date().toISOString();write("payments",ps);res.json({ok:true});
});

app.get("/api/admin/plans",adminOnly,(req,res)=>res.json(read("plans")));
app.post("/api/admin/plan",adminOnly,(req,res)=>{
  const plans=read("plans"),p={id:crypto.randomUUID(),name:cleanName(req.body.name),price:Number(req.body.price||0),period:cleanName(req.body.period)||"شهري",description:String(req.body.description||"").slice(0,300),features:String(req.body.features||"").split("\n").map(x=>x.trim()).filter(Boolean),active:true};
  if(!p.name)return res.status(400).json({error:"اسم الخطة مطلوب."});plans.push(p);write("plans",plans);res.json({ok:true});
});
app.patch("/api/admin/plan/:id",adminOnly,(req,res)=>{
  const ps=read("plans"),p=ps.find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"الخطة غير موجودة."});
  if(req.body.name!==undefined)p.name=cleanName(req.body.name);
  if(req.body.price!==undefined)p.price=Math.max(0,Number(req.body.price));
  if(req.body.period!==undefined)p.period=cleanName(req.body.period);
  if(req.body.description!==undefined)p.description=String(req.body.description).slice(0,300);
  if(req.body.features!==undefined)p.features=Array.isArray(req.body.features)?req.body.features:String(req.body.features).split("\n").map(x=>x.trim()).filter(Boolean);
  if(req.body.active!==undefined)p.active=!!req.body.active;
  write("plans",ps);res.json({ok:true});
});
app.delete("/api/admin/plan/:id",adminOnly,(req,res)=>{
  if(req.params.id==="free")return res.status(400).json({error:"لا يمكن حذف الخطة المجانية."});
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
  cb(ok?null:new Error("الملف يجب أن يكون صورة أو فيديو مدعوم."),ok);
}});
app.post("/api/admin/upload",adminOnly,upload.single("file"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"لم يتم رفع ملف."});
  res.json({url:"/uploads/"+req.file.filename,type:req.file.mimetype});
});

app.get("/api/admin/workouts",adminOnly,(req,res)=>res.json(read("workouts")));
app.post("/api/admin/workout",adminOnly,(req,res)=>{
  const w={id:crypto.randomUUID(),title:cleanName(req.body.title),description:String(req.body.description||"").slice(0,1000),level:cleanName(req.body.level)||"مبتدئ",planId:req.body.planId||"free",image:String(req.body.image||""),video:String(req.body.video||""),sets:String(req.body.sets||""),reps:String(req.body.reps||""),createdAt:new Date().toISOString()};
  if(!w.title)return res.status(400).json({error:"اسم التمرين مطلوب."});
  const arr=read("workouts");arr.unshift(w);write("workouts",arr);res.json({ok:true});
});
app.patch("/api/admin/workout/:id",adminOnly,(req,res)=>{
  const arr=read("workouts"),w=arr.find(x=>x.id===req.params.id);if(!w)return res.status(404).json({error:"التمرين غير موجود."});
  for(const k of ["title","description","level","planId","image","video","sets","reps"])if(req.body[k]!==undefined)w[k]=String(req.body[k]);
  write("workouts",arr);res.json({ok:true});
});
app.delete("/api/admin/workout/:id",adminOnly,(req,res)=>{write("workouts",read("workouts").filter(x=>x.id!==req.params.id));res.json({ok:true})});

app.get("/api/admin/settings",adminOnly,(req,res)=>res.json(read("settings")));
app.patch("/api/admin/settings",adminOnly,(req,res)=>{
  const s=read("settings");for(const k of ["brand","logoText","cashNumber","fawryLink","supportPhone","siteUrl"])if(req.body[k]!==undefined)s[k]=String(req.body[k]).trim();
  write("settings",s);res.json({ok:true});
});

app.get("/health",(req,res)=>res.json({ok:true,service:"Gamal Mousa Fitness"}));

app.use((err,req,res,next)=>{
  if(err instanceof multer.MulterError)return res.status(400).json({error:"حجم/نوع الملف غير مناسب: "+err.message});
  if(err)return res.status(400).json({error:err.message||"حدث خطأ."});
  next();
});

app.listen(PORT,()=>console.log(`جمال موسى FITNESS: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin`));
