# جمال موسى FITNESS — PRO

هذا المشروع جاهز للتشغيل والنشر، ومقسم إلى:
- fitness-site: الموقع الذي يراه العملاء.
- fitness-admin: لوحة الإدارة المنفصلة.
- fitness-server: السيرفر والـAPI والملفات والرفع.

## المميزات
- تسجيل وإنشاء حسابات.
- خطط اشتراك ديناميكية: مجاني / Pro / Premium ويمكن تعديلها من الإدارة.
- إضافة تمارين من لوحة الإدارة.
- رفع صور للتمارين.
- رفع فيديوهات (حتى 250MB للملف) أو إضافة رابط فيديو مباشر.
- تحديد الخطة التي تفتح التمرين.
- إدارة المستخدمين وتغيير الخطة وكلمة المرور.
- قبول/رفض طلبات الدفع.
- الدفع النقدي.
- Fawry Payment Link اختياري من الإعدادات.
- Paymob Hosted Checkout: البطاقات والمحافظ والطرق التي يفعّلها حسابك في Paymob.
- Webhook مع HMAC-SHA512 لتأكيد الدفع من السيرفر وليس من رابط الرجوع.
- تخزين كلمات المرور بشكل hashed.
- لا يتم تخزين بيانات البطاقات في الموقع.

## التشغيل على Windows
1) فك الضغط.
2) افتح CMD داخل:
   fitness-server
3) نفذ:
   npm install
4) انسخ:
   .env.example
   إلى:
   .env
5) غيّر:
   SESSION_SECRET
   ADMIN_PASSWORD
6) شغل:
   node server.js

الموقع:
http://localhost:3000

لوحة الإدارة:
http://localhost:3000/admin

## حساب الإدارة الافتراضي
اسم المستخدم:
admin
كلمة المرور:
ChangeMe123!

غيّرها فورًا داخل .env قبل النشر.

## Paymob
من لوحة Paymob تحتاج مفاتيح Test أثناء التجربة:
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_INTEGRATION_IDS=

وضع رابط الموقع المنشور في:
APP_URL=https://your-domain.com

مهم:
- Webhook يجب أن يكون Public HTTPS في الإنتاج.
- لا تضع Secret Key أو HMAC Secret داخل HTML أو JavaScript.
- فعّل فقط Integration IDs التي تظهر في حساب Paymob.
- أثناء التطوير استخدم Test credentials.
- الدفع الحقيقي يحتاج حساب Paymob مفعّل وموافقات/بيانات التاجر.

## Fawry
يمكنك وضع Fawry Payment Link في لوحة الإدارة > الإعدادات.
هذا المسار يرسل العميل للرابط ثم يبقى التأكيد/المراجعة حسب إعداداتك.

## النشر
أفضل شكل:
- ارفع fitness-server على Render / Railway / VPS.
- الموقع والإدارة يقدمهما نفس السيرفر.
- ضع المتغيرات السرية في Environment Variables.
- استخدم HTTPS.
- استخدم APP_URL بعنوان الموقع النهائي.

## ملاحظة مهمة
المشروع الحالي مناسب كبداية عملية ونسخة MVP قوية. للإطلاق التجاري الكبير يفضّل نقل البيانات من JSON إلى PostgreSQL/Supabase، ووضع التخزين للصور والفيديو في Object Storage، مع نظام نسخ احتياطي ومراقبة.
