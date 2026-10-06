require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const crypto = require("crypto");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");
const SITE = path.join(ROOT, "..", "fitness-site");
const ADMIN = path.join(ROOT, "..", "fitness-admin");

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

/* =========================================================
   HELPERS
========================================================= */

function now() {
  return new Date().toISOString();
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 80);
}

function emailOf(value) {
  return String(value || "").trim().toLowerCase();
}

function addMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function safeString(value, max = 3000) {
  return String(value || "").slice(0, max);
}

function repairMojibake(value) {
  if (typeof value !== "string") return value;

  const markers = ["Ã", "Â", "Ø", "Ù", "Ð", "Ñ", "â"];

  function score(text) {
    let n = 0;

    for (const marker of markers) {
      n += text.split(marker).length - 1;
    }

    return n;
  }

  if (score(value) === 0) {
    return value;
  }

  try {
    const fixed = Buffer.from(value, "latin1").toString("utf8");

    if (fixed && score(fixed) < score(value)) {
      return fixed;
    }
  } catch (_) {}

  return value;
}

function repairDeep(value) {
  if (typeof value === "string") {
    return repairMojibake(value);
  }

  if (Array.isArray(value)) {
    return value.map(repairDeep);
  }

  if (value && typeof value === "object") {
    const output = {};

    for (const [key, val] of Object.entries(value)) {
      output[key] = repairDeep(val);
    }

    return output;
  }

  return value;
}

/* =========================================================
   DATA DEFAULTS
========================================================= */

const defaults = {
  users: [
    {
      id: "demo-admin-user",
      name: "جمال موسى",
      email: "demo@example.com",
      passwordHash: bcrypt.hashSync("Demo123456", 10),
      planId: "free",
      status: "active",
      createdAt: now(),
      expiresAt: null
    }
  ],

  plans: [
    {
      id: "free",
      name: "مجاني",
      price: 0,
      period: "شهري",
      description: "ابدأ بعادات صحية وتمارين أساسية.",
      features: [
        "تمارين أساسية",
        "محتوى صحي عام"
      ],
      active: true
    },
    {
      id: "pro",
      name: "Pro",
      price: 99,
      period: "شهري",
      description: "مكتبة أكبر من التمارين وخطط منظمة.",
      features: [
        "كل محتوى المجاني",
        "تمارين إضافية",
        "خطط تدريب"
      ],
      active: true
    },
    {
      id: "premium",
      name: "Premium",
      price: 199,
      period: "شهري",
      description: "التجربة الكاملة مع محتوى Premium.",
      features: [
        "كل محتوى Pro",
        "تمارين Premium",
        "فيديوهات وصور",
        "تتبع التقدم"
      ],
      active: true
    }
  ],

  workouts: [
    {
      id: "w1",
      title: "سكوات وزن الجسم",
      description: "تمرين أساسي للرجلين. نفذه بتحكم وبمدى حركة مريح.",
      level: "مبتدئ",
      planId: "free",
      image: "",
      video: "",
      muscles: "الرجلين",
      sets: "3",
      reps: "10-12",
      rest: "60 ثانية",
      howTo: "قف بشكل مستقيم، انزل بالحوض للخلف وللأسفل، ثم ادفع الأرض للعودة.",
      mistakes: "تجنب انحناء الظهر أو النزول بسرعة شديدة.",
      createdAt: now()
    },
    {
      id: "w2",
      title: "ضغط على الحائط",
      description: "نسخة سهلة من الضغط مناسبة للبداية.",
      level: "مبتدئ",
      planId: "free",
      image: "",
      video: "",
      muscles: "الصدر والكتف والترايسبس",
      sets: "3",
      reps: "10-12",
      rest: "60 ثانية",
      howTo: "ضع يديك على الحائط، اثن المرفقين، اقترب بجسمك ثم ادفع للخلف.",
      mistakes: "لا تجعل الحركة سريعة ولا تفقد وضع الجسم.",
      createdAt: now()
    },
    {
      id: "w3",
      title: "Glute Bridge",
      description: "رفع الحوض مع شد عضلات المؤخرة والتحكم في الحركة.",
      level: "مبتدئ",
      planId: "pro",
      image: "",
      video: "",
      muscles: "المؤخرة وأوتار الركبة",
      sets: "3",
      reps: "12-15",
      rest: "60 ثانية",
      howTo: "استلق على ظهرك، اثن الركبتين، ارفع الحوض واضغط عضلات المؤخرة.",
      mistakes: "لا تبالغ في تقويس أسفل الظهر.",
      createdAt: now()
    },
    {
      id: "w4",
      title: "Plank",
      description: "ثبات الجذع مع الحفاظ على وضع جسم مريح.",
      level: "متوسط",
      planId: "premium",
      image: "",
      video: "",
      muscles: "البطن والجذع",
      sets: "3",
      reps: "20-30 ثانية",
      rest: "60 ثانية",
      howTo: "ثبت جسمك في خط مستقيم مع شد عضلات البطن والتنفس بشكل طبيعي.",
      mistakes: "لا ترفع الحوض كثيرًا ولا تسمح لأسفل الظهر بالهبوط.",
      createdAt: now()
    }
  ],

  payments: [],

  settings: {
    brand: "جمال موسى FITNESS",
    logoText: "GM",
    cashNumber: "01131704920",
    fawryLink: "",
    supportPhone: "01131704920",
    siteUrl: "http://localhost:3000"
  }
};

for (const [key, value] of Object.entries(defaults)) {
  const file = path.join(DATA, key + ".json");

  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(value, null, 2),
      "utf8"
    );
  }
}

/* إصلاح ملفات JSON القديمة */

for (const key of Object.keys(defaults)) {
  const file = path.join(DATA, key + ".json");

  try {
    const original = JSON.parse(
      fs.readFileSync(file, "utf8")
    );

    const repaired = repairDeep(original);

    fs.writeFileSync(
      file,
      JSON.stringify(repaired, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error(
      "Data repair error:",
      key,
      error.message
    );
  }
}

function read(key) {
  const file = path.join(DATA, key + ".json");

  try {
    const data = JSON.parse(
      fs.readFileSync(file, "utf8")
    );

    return repairDeep(data);
  } catch (error) {
    console.error(
      "Read data error:",
      key,
      error.message
    );

    if (Array.isArray(defaults[key])) {
      return [...defaults[key]];
    }

    return { ...defaults[key] };
  }
}

function write(key, value) {
  const file = path.join(DATA, key + ".json");

  fs.writeFileSync(
    file,
    JSON.stringify(repairDeep(value), null, 2),
    "utf8"
  );
}

/* =========================================================
   EXPRESS
========================================================= */

app.set("trust proxy", 1);

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = new Set([
  "https://gamal-mousa-fitness.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );

    res.setHeader(
      "Vary",
      "Origin"
    );
  }

  res.setHeader(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================================================
   SESSION
========================================================= */

const sessionStore = new session.MemoryStore();

app.use(
  session({
    name: "gamal.sid",

    store: sessionStore,

    secret:
      process.env.SESSION_SECRET ||
      "gamal-mousa-fitness-secret-2026",

    resave: false,

    saveUninitialized: false,

    proxy: true,

    cookie: {
      httpOnly: true,

      secure: false,

      sameSite: "lax",

      maxAge:
        1000 *
        60 *
        60 *
        24 *
        7
    }
  })
);

/*
  نغيّر خصائص الـCookie حسب الاتصال.
  localhost:
    secure=false
    SameSite=lax

  HTTPS:
    secure=true
    SameSite=none
*/

app.use((req, res, next) => {
  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";

  if (req.session && req.session.cookie) {
    req.session.cookie.secure = !!isHttps;

    req.session.cookie.sameSite =
      isHttps
        ? "none"
        : "lax";
  }

  next();
});

/* =========================================================
   AUTH HELPERS
========================================================= */

function getPlan(id) {
  const wanted =
    String(id || "")
      .trim()
      .toLowerCase();

  if (!wanted) {
    return null;
  }

  const plans = read("plans");

  return (
    plans.find(
      (plan) =>
        String(plan.id || "")
          .trim()
          .toLowerCase() === wanted
    ) ||
    plans.find(
      (plan) =>
        String(plan.name || "")
          .trim()
          .toLowerCase() === wanted
    ) ||
    null
  );
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  const plan = getPlan(user.planId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    planId: user.planId || "free",
    plan: plan ? plan.name : "مجاني",
    expiresAt: user.expiresAt || null,
    status: user.status || "active"
  };
}

function workoutAccessLevel(planId) {
  const plan =
    String(planId || "free")
      .toLowerCase();

  if (plan === "premium") {
    return 3;
  }

  if (plan === "pro") {
    return 2;
  }

  return 1;
}

function userAccessLevel(req) {
  if (!req.session.user) {
    return 1;
  }

  const users = read("users");

  const user = users.find(
    (item) =>
      item.id === req.session.user.id
  );

  if (!user || user.status !== "active") {
    return 1;
  }

  if (
    user.expiresAt &&
    new Date(user.expiresAt).getTime() <
      Date.now()
  ) {
    return 1;
  }

  return workoutAccessLevel(
    user.planId
  );
}

function userOnly(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      error: "سجّل الدخول أولًا."
    });
  }

  next();
}

function adminOnly(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({
      error: "غير مصرح."
    });
  }

  next();
}

/* =========================================================
   STATIC FILES
========================================================= */

app.use(
  "/uploads",
  express.static(UPLOADS)
);

app.use(
  "/admin",
  express.static(ADMIN)
);

app.use(
  express.static(SITE)
);

/* =========================================================
   SITE API
========================================================= */

app.get(
  "/api/site",
  (req, res) => {
    const level =
      userAccessLevel(req);

    const workouts =
      read("workouts")
        .filter(
          (workout) =>
            workoutAccessLevel(
              workout.planId
            ) <= level
        )
        .map((workout) => ({
          ...workout,
          category:
            workout.category ||
            workout.level ||
            "مبتدئ",
          instructions:
            workout.instructions ||
            workout.howTo ||
            ""
        }));

    res.json({
      settings: read("settings"),

      plans:
        read("plans").filter(
          (plan) =>
            plan.active !== false
        ),

      workouts
    });
  }
);

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const name =
        cleanName(req.body.name);

      const email =
        emailOf(req.body.email);

      const password =
        String(
          req.body.password || ""
        );

      if (
        !name ||
        !email ||
        password.length < 6
      ) {
        return res.status(400).json({
          error:
            "اكتب الاسم والبريد وكلمة مرور 6 أحرف على الأقل."
        });
      }

      const users =
        read("users");

      if (
        users.some(
          (user) =>
            user.email === email
        )
      ) {
        return res.status(409).json({
          error:
            "البريد الإلكتروني مسجل بالفعل."
        });
      }

      const user = {
        id: crypto.randomUUID(),

        name,

        email,

        passwordHash:
          await bcrypt.hash(
            password,
            10
          ),

        planId: "free",

        status: "active",

        createdAt: now(),

        expiresAt: null
      };

      users.push(user);

      write(
        "users",
        users
      );

      req.session.user =
        publicUser(user);

      req.session.save(
        (error) => {
          if (error) {
            console.error(
              "Register session error:",
              error
            );

            return res.status(500).json({
              error:
                "تعذر حفظ جلسة تسجيل الدخول."
            });
          }

          return res.json({
            ok: true,
            user:
              req.session.user
          });
        }
      );
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      return res.status(500).json({
        error:
          "حدث خطأ أثناء إنشاء الحساب."
      });
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const identifier =
        emailOf(
          req.body.email ||
          req.body.username
        );

      const password =
        String(
          req.body.password || ""
        );

      const users =
        read("users");

      const user =
        users.find(
          (item) =>
            item.email ===
              identifier ||
            String(
              item.username || ""
            )
              .toLowerCase() ===
              identifier
        );

      if (
        !user ||
        !(await bcrypt.compare(
          password,
          user.passwordHash
        ))
      ) {
        return res.status(401).json({
          error:
            "بيانات الدخول غير صحيحة."
        });
      }

      if (
        user.status ===
        "blocked"
      ) {
        return res.status(403).json({
          error:
            "الحساب موقوف."
        });
      }

      /*
        لا نستخدم regenerate هنا.
        نحفظ المستخدم في الـSession الحالية
        حتى لا تضيع الجلسة على localhost.
      */

      req.session.user =
        publicUser(user);

      req.session.save(
        (saveError) => {
          if (saveError) {
            console.error(
              "Session save error:",
              saveError
            );

            return res.status(500).json({
              error:
                "تعذر حفظ جلسة تسجيل الدخول."
            });
          }

          return res.json({
            ok: true,
            user:
              req.session.user
          });
        }
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        error:
          "حدث خطأ أثناء تسجيل الدخول."
      });
    }
  }
);

/* =========================================================
   ME
========================================================= */

app.get(
  "/api/me",
  (req, res) => {
    if (!req.session.user) {
      return res.json({
        user: null
      });
    }

    const users =
      read("users");

    const user =
      users.find(
        (item) =>
          item.id ===
          req.session.user.id
      );

    if (!user) {
      req.session.user = null;

      return res.json({
        user: null
      });
    }

    req.session.user =
      publicUser(user);

    req.session.save(
      () => {
        return res.json({
          user:
            req.session.user
        });
      }
    );
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  (req, res) => {
    req.session.destroy(
      (error) => {
        if (error) {
          console.error(
            "Logout session error:",
            error
          );

          return res.status(500).json({
            error:
              "تعذر تسجيل الخروج."
          });
        }

        res.clearCookie(
          "gamal.sid",
          {
            httpOnly: true,
            sameSite:
              req.secure
                ? "none"
                : "lax",
            secure:
              !!req.secure
          }
        );

        return res.json({
          ok: true
        });
      }
    );
  }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */

app.post(
  "/api/forgot-password",
  (req, res) => {
    const email =
      emailOf(
        req.body.email
      );

    if (!email) {
      return res.status(400).json({
        error:
          "اكتب البريد الإلكتروني."
      });
    }

    const users =
      read("users");

    const user =
      users.find(
        (item) =>
          item.email === email
      );

    if (!user) {
      return res.json({
        ok: true,
        message:
          "إذا كان البريد مسجلًا، سيتم التعامل مع طلب الاستعادة."
      });
    }

    return res.json({
      ok: true,
      message:
        "تم استلام طلب استعادة كلمة المرور. تواصل مع الإدارة لإعادة تعيين كلمة المرور."
    });
  }
);

/* =========================================================
   CHECKOUT
========================================================= */

app.post(
  "/api/checkout",
  userOnly,
  async (req, res) => {
    try {
      const requestedPlanId =
        req.body.planId ??
        req.body.id ??
        req.body.plan;

      const plan =
        getPlan(
          requestedPlanId
        );

      if (
        !plan ||
        !plan.active ||
        Number(plan.price) <= 0
      ) {
        return res.status(400).json({
          error:
            "الخطة غير متاحة للدفع."
        });
      }

      const settings =
        read("settings");

      const provider =
        String(
          req.body.provider ||
          req.body.paymentMethod ||
          "paymob"
        ).toLowerCase();

      const paymentId =
        "PAY-" +
        Date.now() +
        "-" +
        crypto
          .randomBytes(3)
          .toString("hex");

      const payments =
        read("payments");

      const payment = {
        id: paymentId,

        userId:
          req.session.user.id,

        name:
          req.session.user.name,

        email:
          req.session.user.email,

        planId:
          plan.id,

        planName:
          plan.name,

        amount:
          Number(plan.price),

        provider,

        status:
          provider === "cash" ||
          provider === "instapay"
            ? "pending_admin"
            : "pending",

        createdAt: now(),

        paymobOrderId: null,

        paymobIntentionId: null
      };

      payments.push(payment);

      write(
        "payments",
        payments
      );

      /* CASH */

      if (
        provider === "cash"
      ) {
        return res.json({
          mode: "cash",

          cashNumber:
            settings.cashNumber,

          paymentId
        });
      }

      /* INSTAPAY */

      if (
        provider === "instapay"
      ) {
        return res.json({
          mode: "instapay",

          cashNumber:
            settings.cashNumber,

          paymentId
        });
      }

      /* FAWRY */

      if (
        provider === "fawry"
      ) {
        if (
          !settings.fawryLink
        ) {
          return res.status(400).json({
            error:
              "لم يتم إعداد رابط فوري بعد. استخدم Paymob أو الدفع النقدي."
          });
        }

        return res.json({
          mode: "external",

          url:
            settings.fawryLink,

          paymentId
        });
      }

      /* PAYMOB */

      if (
        provider !== "paymob" &&
        provider !== "card"
      ) {
        return res.status(400).json({
          error:
            "طريقة الدفع غير معروفة."
        });
      }

      if (
        !process.env.PAYMOB_SECRET_KEY ||
        !process.env.PAYMOB_PUBLIC_KEY ||
        !process.env.PAYMOB_INTEGRATION_IDS
      ) {
        return res.status(503).json({
          error:
            "Paymob غير مُعد بعد. ضع مفاتيح Paymob في ملف .env ثم أعد تشغيل السيرفر."
        });
      }

      const base =
        (
          process.env.PAYMOB_BASE_URL ||
          "https://accept.paymob.com"
        ).replace(
          /\/$/,
          ""
        );

      const ids =
        process.env.PAYMOB_INTEGRATION_IDS
          .split(",")
          .map(
            (value) =>
              Number(
                value.trim()
              )
          )
          .filter(Boolean);

      const fullName =
        req.session.user.name ||
        "عميل Fitness";

      const nameParts =
        fullName
          .trim()
          .split(/\s+/);

      const first =
        nameParts.shift() ||
        "عميل";

      const last =
        nameParts.join(" ") ||
        "Fitness";

      const appUrl =
        process.env.APP_URL ||
        settings.siteUrl ||
        `http://localhost:${PORT}`;

      const payload = {
        amount:
          Math.round(
            Number(plan.price) *
              100
          ),

        currency: "EGP",

        payment_methods:
          ids,

        items: [
          {
            name:
              `اشتراك ${plan.name}`,

            amount:
              Math.round(
                Number(plan.price) *
                  100
              ),

            description:
              plan.description ||
              `اشتراك ${plan.name}`,

            quantity: 1
          }
        ],

        billing_data: {
          apartment: "NA",

          first_name:
            first,

          last_name:
            last,

          street: "NA",

          building: "NA",

          floor: "NA",

          phone_number:
            req.body.phone ||
            "01000000000",

          city: "Zagazig",

          state: "Sharqia",

          country: "EG",

          postal_code: "NA"
        },

        customer: {
          first_name:
            first,

          last_name:
            last,

          email:
            req.session.user.email
        },

        extras: {
          local_payment_id:
            paymentId,

          plan_id:
            plan.id
        },

        special_reference:
          paymentId,

        expiration: 3600,

        notification_url:
          `${appUrl}/api/paymob/webhook`,

        redirection_url:
          `${appUrl}/payment/complete`
      };

      const response =
        await axios.post(
          `${base}/v1/intention/`,
          payload,
          {
            headers: {
              Authorization:
                `Token ${process.env.PAYMOB_SECRET_KEY}`,

              "Content-Type":
                "application/json"
            },

            timeout: 20000
          }
        );

      const data =
        response.data;

      const updatedPayments =
        read("payments");

      const index =
        updatedPayments.findIndex(
          (item) =>
            item.id ===
            paymentId
        );

      if (index !== -1) {
        updatedPayments[index]
          .paymobOrderId =
          data.intention_order_id ||
          null;

        updatedPayments[index]
          .paymobIntentionId =
          data.id ||
          null;

        write(
          "payments",
          updatedPayments
        );
      }

      const clientSecret =
        data.client_secret;

      if (!clientSecret) {
        return res.status(502).json({
          error:
            "Paymob لم يُرجع رابط الدفع."
        });
      }

      const url =
        `${base}/unifiedcheckout/?publicKey=` +
        encodeURIComponent(
          process.env.PAYMOB_PUBLIC_KEY
        ) +
        `&clientSecret=` +
        encodeURIComponent(
          clientSecret
        );

      return res.json({
        mode: "redirect",

        url,

        paymentId
      });
    } catch (error) {
      console.error(
        "Checkout error:",
        error.response?.data ||
          error.message
      );

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "تعذر إنشاء عملية الدفع.";

      return res.status(502).json({
        error:
          String(message)
      });
    }
  }
);

/* =========================================================
   CASH / INSTAPAY CONFIRM
========================================================= */

app.post(
  "/api/cash-confirm",
  userOnly,
  (req, res) => {
    const paymentId =
      String(
        req.body.paymentId ||
          ""
      ).trim();

    const reference =
      String(
        req.body.reference ||
          ""
      )
        .trim()
        .slice(0, 120);

    if (!paymentId) {
      return res.status(400).json({
        error:
          "رقم طلب الدفع غير موجود."
      });
    }

    if (!reference) {
      return res.status(400).json({
        error:
          "اكتب رقم المرجع / رقم العملية."
      });
    }

    const payments =
      read("payments");

    const payment =
      payments.find(
        (item) =>
          item.id ===
            paymentId &&
          item.userId ===
            req.session.user.id
      );

    if (!payment) {
      return res.status(404).json({
        error:
          "طلب الدفع غير موجود."
      });
    }

    if (
      payment.status ===
      "paid"
    ) {
      return res.status(400).json({
        error:
          "تم تأكيد هذا الطلب بالفعل."
      });
    }

    payment.reference =
      reference;

    payment.status =
      "pending_admin";

    payment.updatedAt =
      now();

    write(
      "payments",
      payments
    );

    return res.json({
      ok: true,

      message:
        "تم إرسال طلب الدفع للإدارة."
    });
  }
);

/* =========================================================
   PAYMOB HMAC
========================================================= */

function verifyHmac(
  obj,
  received
) {
  const secret =
    process.env.PAYMOB_HMAC_SECRET;

  if (
    !secret ||
    !obj ||
    !received
  ) {
    return false;
  }

  const values = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success
  ];

  const raw =
    values
      .map((value) =>
        String(value)
      )
      .join("");

  const calculated =
    crypto
      .createHmac(
        "sha512",
        secret
      )
      .update(raw)
      .digest("hex");

  const receivedString =
    String(received);

  if (
    calculated.length !==
    receivedString.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(
      calculated
    ),
    Buffer.from(
      receivedString
    )
  );
}

/* =========================================================
   PAYMOB WEBHOOK
========================================================= */

app.post(
  "/api/paymob/webhook",
  (req, res) => {
    try {
      const obj =
        req.body?.obj;

      const received =
        req.query.hmac;

      if (
        !verifyHmac(
          obj,
          received
        )
      ) {
        return res.status(401).json({
          error:
            "Invalid HMAC"
        });
      }

      if (
        obj.success === true &&
        obj.pending === false
      ) {
        const payments =
          read("payments");

        const localId =
          obj.order?.merchant_order_id ||
          obj.merchant_order_id ||
          obj.special_reference;

        const payment =
          payments.find(
            (item) =>
              item.id ===
              localId
          );

        if (
          payment &&
          payment.status !==
            "paid"
        ) {
          payment.status =
            "paid";

          payment.paidAt =
            now();

          payment.transactionId =
            String(obj.id);

          write(
            "payments",
            payments
          );

          const users =
            read("users");

          const user =
            users.find(
              (item) =>
                item.id ===
                payment.userId
            );

          if (user) {
            user.planId =
              payment.planId;

            user.expiresAt =
              addMonth();

            write(
              "users",
              users
            );
          }
        }
      }

      return res.json({
        received: true
      });
    } catch (error) {
      console.error(
        "Paymob webhook error:",
        error
      );

      return res.status(500).json({
        error:
          "Webhook error"
      });
    }
  }
);

/* =========================================================
   PAYMENT COMPLETE
========================================================= */

app.get(
  "/payment/complete",
  (req, res) => {
    return res.sendFile(
      path.join(
        SITE,
        "payment-complete.html"
      )
    );
  }
);

/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {
    const username =
      process.env.ADMIN_USERNAME ||
      "admin";

    const password =
      process.env.ADMIN_PASSWORD ||
      "ChangeMe123!";

    if (
      req.body.username !==
        username ||
      req.body.password !==
        password
    ) {
      return res.status(401).json({
        error:
          "بيانات المشرف غير صحيحة."
      });
    }

    req.session.admin =
      true;

    req.session.save(
      (error) => {
        if (error) {
          console.error(
            "Admin session error:",
            error
          );

          return res.status(500).json({
            error:
              "تعذر حفظ جلسة المشرف."
          });
        }

        return res.json({
          ok: true
        });
      }
    );
  }
);

/* =========================================================
   ADMIN LOGOUT
========================================================= */

app.post(
  "/api/admin/logout",
  (req, res) => {
    req.session.admin =
      false;

    req.session.save(
      () => {
        return res.json({
          ok: true
        });
      }
    );
  }
);

/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
  "/api/admin/stats",
  adminOnly,
  (req, res) => {
    const users =
      read("users");

    const payments =
      read("payments");

    const plans =
      read("plans");

    const workouts =
      read("workouts");

    return res.json({
      users:
        users.length,

      payments:
        payments.filter(
          (p) =>
            p.status ===
              "pending_admin" ||
            p.status ===
              "pending"
        ).length,

      paid:
        payments.filter(
          (p) =>
            p.status ===
            "paid"
        ).length,

      plans:
        plans.length,

      workouts:
        workouts.length
    });
  }
);

/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
  "/api/admin/users",
  adminOnly,
  (req, res) => {
    return res.json(
      read("users").map(
        (user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          planId: user.planId,
          status: user.status,
          createdAt:
            user.createdAt,
          expiresAt:
            user.expiresAt
        })
      )
    );
  }
);

/* =========================================================
   ADMIN CREATE USER
========================================================= */

app.post(
  "/api/admin/user",
  adminOnly,
  async (req, res) => {
    try {
      const users =
        read("users");

      const name =
        cleanName(
          req.body.name
        );

      const email =
        emailOf(
          req.body.email
        );

      const password =
        String(
          req.body.password ||
            ""
        );

      if (!name || !email) {
        return res.status(400).json({
          error:
            "الاسم والبريد مطلوبان."
        });
      }

      if (
        users.some(
          (user) =>
            user.email ===
            email
        )
      ) {
        return res.status(409).json({
          error:
            "البريد مستخدم بالفعل."
        });
      }

      const finalPassword =
        password ||
        crypto
          .randomBytes(8)
          .toString("hex");

      const user = {
        id:
          crypto.randomUUID(),

        name,

        email,

        passwordHash:
          await bcrypt.hash(
            finalPassword,
            10
          ),

        planId:
          req.body.planId ||
          "free",

        status:
          "active",

        createdAt:
          now(),

        expiresAt:
          null
      };

      users.push(user);

      write(
        "users",
        users
      );

      return res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "Admin create user:",
        error
      );

      return res.status(500).json({
        error:
          "تعذر إنشاء المستخدم."
      });
    }
  }
);

/* =========================================================
   ADMIN UPDATE USER
========================================================= */

app.patch(
  "/api/admin/user/:id",
  adminOnly,
  (req, res) => {
    const users =
      read("users");

    const user =
      users.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!user) {
      return res.status(404).json({
        error:
          "المستخدم غير موجود."
      });
    }

    if (
      req.body.planId &&
      getPlan(
        req.body.planId
      )
    ) {
      user.planId =
        req.body.planId;
    }

    if (
      req.body.status
    ) {
      user.status =
        req.body.status;
    }

    if (
      req.body.resetPassword
    ) {
      user.passwordHash =
        bcrypt.hashSync(
          String(
            req.body.resetPassword
          ),
          10
        );
    }

    write(
      "users",
      users
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   ADMIN DELETE USER
========================================================= */

app.delete(
  "/api/admin/user/:id",
  adminOnly,
  (req, res) => {
    write(
      "users",
      read("users").filter(
        (user) =>
          user.id !==
          req.params.id
      )
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   ADMIN PAYMENTS
========================================================= */

app.get(
  "/api/admin/payments",
  adminOnly,
  (req, res) => {
    return res.json(
      read("payments")
    );
  }
);

/* =========================================================
   APPROVE PAYMENT
========================================================= */

app.post(
  "/api/admin/payment/:id/approve",
  adminOnly,
  (req, res) => {
    const payments =
      read("payments");

    const payment =
      payments.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!payment) {
      return res.status(404).json({
        error:
          "طلب الدفع غير موجود."
      });
    }

    payment.status =
      "paid";

    payment.paidAt =
      now();

    write(
      "payments",
      payments
    );

    const users =
      read("users");

    const user =
      users.find(
        (item) =>
          item.id ===
          payment.userId
      );

    if (user) {
      user.planId =
        payment.planId;

      user.expiresAt =
        addMonth();

      write(
        "users",
        users
      );
    }

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   REJECT PAYMENT
========================================================= */

app.post(
  "/api/admin/payment/:id/reject",
  adminOnly,
  (req, res) => {
    const payments =
      read("payments");

    const payment =
      payments.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!payment) {
      return res.status(404).json({
        error:
          "طلب الدفع غير موجود."
      });
    }

    payment.status =
      "rejected";

    payment.updatedAt =
      now();

    write(
      "payments",
      payments
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   ADMIN PLANS
========================================================= */

app.get(
  "/api/admin/plans",
  adminOnly,
  (req, res) => {
    return res.json(
      read("plans")
    );
  }
);

app.post(
  "/api/admin/plan",
  adminOnly,
  (req, res) => {
    const plans =
      read("plans");

    const plan = {
      id:
        crypto.randomUUID(),

      name:
        cleanName(
          req.body.name
        ),

      price:
        Number(
          req.body.price || 0
        ),

      period:
        cleanName(
          req.body.period
        ) || "شهري",

      description:
        safeString(
          req.body.description,
          300
        ),

      features:
        String(
          req.body.features ||
            ""
        )
          .split("\n")
          .map(
            (x) =>
              x.trim()
          )
          .filter(Boolean),

      active:
        true
    };

    if (!plan.name) {
      return res.status(400).json({
        error:
          "اسم الخطة مطلوب."
      });
    }

    plans.push(plan);

    write(
      "plans",
      plans
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   UPDATE PLAN
========================================================= */

app.patch(
  "/api/admin/plan/:id",
  adminOnly,
  (req, res) => {
    const plans =
      read("plans");

    const plan =
      plans.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!plan) {
      return res.status(404).json({
        error:
          "الخطة غير موجودة."
      });
    }

    if (
      req.body.name !==
      undefined
    ) {
      plan.name =
        cleanName(
          req.body.name
        );
    }

    if (
      req.body.price !==
      undefined
    ) {
      plan.price =
        Math.max(
          0,
          Number(
            req.body.price
          )
        );
    }

    if (
      req.body.period !==
      undefined
    ) {
      plan.period =
        cleanName(
          req.body.period
        );
    }

    if (
      req.body.description !==
      undefined
    ) {
      plan.description =
        safeString(
          req.body.description,
          300
        );
    }

    if (
      req.body.features !==
      undefined
    ) {
      plan.features =
        Array.isArray(
          req.body.features
        )
          ? req.body.features
          : String(
              req.body.features
            )
              .split("\n")
              .map(
                (x) =>
                  x.trim()
              )
              .filter(Boolean);
    }

    if (
      req.body.active !==
      undefined
    ) {
      plan.active =
        !!req.body.active;
    }

    write(
      "plans",
      plans
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   DELETE PLAN
========================================================= */

app.delete(
  "/api/admin/plan/:id",
  adminOnly,
  (req, res) => {
    if (
      req.params.id ===
      "free"
    ) {
      return res.status(400).json({
        error:
          "لا يمكن حذف الخطة المجانية."
      });
    }

    write(
      "plans",
      read("plans").filter(
        (plan) =>
          plan.id !==
          req.params.id
      )
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   UPLOAD
========================================================= */

const storage =
  multer.diskStorage({
    destination:
      (req, file, cb) => {
        cb(
          null,
          UPLOADS
        );
      },

    filename:
      (req, file, cb) => {
        const ext =
          path
            .extname(
              file.originalname
            )
            .toLowerCase()
            .replace(
              /[^.\w-]/g,
              ""
            );

        cb(
          null,
          Date.now() +
            "-" +
            crypto
              .randomBytes(4)
              .toString("hex") +
            ext
        );
      }
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        250 *
        1024 *
        1024
    },

    fileFilter:
      (req, file, cb) => {
        const validImage =
          /^image\/(jpeg|png|webp|gif)$/
            .test(
              file.mimetype
            );

        const validVideo =
          /^video\/(mp4|webm|quicktime)$/
            .test(
              file.mimetype
            );

        if (
          validImage ||
          validVideo
        ) {
          return cb(
            null,
            true
          );
        }

        return cb(
          new Error(
            "الملف يجب أن يكون صورة أو فيديو مدعوم."
          )
        );
      }
  });

app.post(
  "/api/admin/upload",
  adminOnly,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error:
          "لم يتم رفع ملف."
      });
    }

    return res.json({
      url:
        "/uploads/" +
        req.file.filename,

      type:
        req.file.mimetype,

      filename:
        req.file.filename,

      size:
        req.file.size
    });
  }
);

/* =========================================================
   ADMIN WORKOUTS
========================================================= */

app.get(
  "/api/admin/workouts",
  adminOnly,
  (req, res) => {
    return res.json(
      read("workouts")
    );
  }
);

/* =========================================================
   CREATE WORKOUT
========================================================= */

app.post(
  "/api/admin/workout",
  adminOnly,
  (req, res) => {
    const requestedPlan =
      String(
        req.body.planId ||
          "free"
      ).toLowerCase();

    const plan =
      getPlan(
        requestedPlan
      );

    const workout = {
      id:
        crypto.randomUUID(),

      title:
        cleanName(
          req.body.title
        ),

      description:
        safeString(
          req.body.description,
          1000
        ),

      level:
        cleanName(
          req.body.level
        ) || "مبتدئ",

      planId:
        plan
          ? plan.id
          : "free",

      image:
        safeString(
          req.body.image,
          1000
        ),

      video:
        safeString(
          req.body.video,
          1000
        ),

      muscles:
        safeString(
          req.body.muscles,
          500
        ),

      sets:
        safeString(
          req.body.sets,
          100
        ),

      reps:
        safeString(
          req.body.reps,
          100
        ),

      rest:
        safeString(
          req.body.rest,
          100
        ),

      howTo:
        safeString(
          req.body.howTo ||
            req.body.instructions,
          3000
        ),

      mistakes:
        safeString(
          req.body.mistakes,
          2000
        ),

      createdAt:
        now()
    };

    if (!workout.title) {
      return res.status(400).json({
        error:
          "اسم التمرين مطلوب."
      });
    }

    const workouts =
      read("workouts");

    workouts.unshift(
      workout
    );

    write(
      "workouts",
      workouts
    );

    return res.json({
      ok: true,
      workout
    });
  }
);

/* =========================================================
   UPDATE WORKOUT
========================================================= */

app.patch(
  "/api/admin/workout/:id",
  adminOnly,
  (req, res) => {
    const workouts =
      read("workouts");

    const workout =
      workouts.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!workout) {
      return res.status(404).json({
        error:
          "التمرين غير موجود."
      });
    }

    const fields = [
      "title",
      "description",
      "level",
      "image",
      "video",
      "muscles",
      "sets",
      "reps",
      "rest",
      "howTo",
      "mistakes"
    ];

    for (
      const field of fields
    ) {
      if (
        req.body[field] !==
        undefined
      ) {
        workout[field] =
          String(
            req.body[field]
          );
      }
    }

    if (
      req.body.instructions !==
        undefined &&
      req.body.howTo ===
        undefined
    ) {
      workout.howTo =
        String(
          req.body.instructions
        );
    }

    if (
      req.body.planId !==
      undefined
    ) {
      const plan =
        getPlan(
          req.body.planId
        );

      if (plan) {
        workout.planId =
          plan.id;
      }
    }

    write(
      "workouts",
      workouts
    );

    return res.json({
      ok: true,
      workout
    });
  }
);

/* =========================================================
   DELETE WORKOUT
========================================================= */

app.delete(
  "/api/admin/workout/:id",
  adminOnly,
  (req, res) => {
    write(
      "workouts",
      read("workouts").filter(
        (workout) =>
          workout.id !==
          req.params.id
      )
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   ADMIN SETTINGS
========================================================= */

app.get(
  "/api/admin/settings",
  adminOnly,
  (req, res) => {
    return res.json(
      read("settings")
    );
  }
);

app.patch(
  "/api/admin/settings",
  adminOnly,
  (req, res) => {
    const settings =
      read("settings");

    const fields = [
      "brand",
      "logoText",
      "cashNumber",
      "fawryLink",
      "supportPhone",
      "siteUrl"
    ];

    for (
      const field of fields
    ) {
      if (
        req.body[field] !==
        undefined
      ) {
        settings[field] =
          String(
            req.body[field]
          ).trim();
      }
    }

    write(
      "settings",
      settings
    );

    return res.json({
      ok: true
    });
  }
);

/* =========================================================
   SESSION DEBUG
========================================================= */

app.get(
  "/api/session-status",
  (req, res) => {
    return res.json({
      ok: true,

      loggedIn:
        !!req.session.user,

      admin:
        !!req.session.admin,

      user:
        req.session.user ||
        null,

      secure:
        !!(
          req.secure ||
          req.headers[
            "x-forwarded-proto"
          ] === "https"
        )
    });
  }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/health",
  (req, res) => {
    return res.json({
      ok: true,

      service:
        "Gamal Mousa Fitness",

      time: now()
    });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(413).json({
          error:
            "حجم الملف أكبر من الحد المسموح به وهو 250 ميجابايت."
        });
      }

      return res.status(400).json({
        error:
          "حجم أو نوع الملف غير مناسب: " +
          error.message
      });
    }

    if (error) {
      return res.status(400).json({
        error:
          error.message ||
          "حدث خطأ."
      });
    }

    return next();
  }
);

/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `جمال موسى FITNESS: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin`
    );
  }
);