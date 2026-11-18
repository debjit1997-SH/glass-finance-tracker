# AuraFinance v2 — পুরোনো data রেখে setup

এই package-এর code প্রস্তুত। তোর live Sheet, GitHub বা Vercel এখনও পরিবর্তন করা হয়নি। আগে test copy-তে চালাবি। আগের review ZIP-এর বদলে এই v2 package ব্যবহার করবি।

## ১. Test Sheet তৈরি কর

বর্তমান Google Sheet খুলে **File → Make a copy** কর। Copy-টার নাম `AuraFinance TEST` রাখ। এই test copy-তে **Extensions → Apps Script** খুলবি। মূল Sheet-এর script/deployment এখন বদলাবি না।

## ২. নতুন Apps Script বসা

আগের script-এর আলাদা backup রাখ। Test copy-র Apps Script editor-এ পুরোনো Code.gs-এর বদলে package-এর `apps-script/Code.gs` বসা। একই project-এ পুরোনো ও নতুন `doPost`, `doGet`, `SCHEMA` একসঙ্গে রাখবি না। Save কর।

**Project Settings → Script Properties**-এ যোগ কর:

| Property | Value |
| --- | --- |
| `AURA_API_SECRET` | নিজে generate করা ৩২+ character random secret |

Random secret বানানোর local command:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Secret আমাকে পাঠাবি না, GitHub-এও রাখবি না। Script যদি Sheet-এর Extensions থেকে খোলা হয়, আলাদা Spreadsheet ID লাগবে না। Standalone script হলে `SPREADSHEET_ID` property-তে test Sheet-এর ID দিতে হবে।

## ৩. Backup ও additive upgrade চালা

Function dropdown থেকে এই order-এ Run কর:

1. `previewUpgrade` — শুধু missing columns/tabs-এর plan দেখাবে।
2. `backupAndUpgrade` — পূর্ণ backup copy বানিয়ে verify করবে; তারপর শুধু missing headers/tabs যোগ করবে। Execution log-এ backup link থাকবে।
3. Backup খুলে records, IDs, amounts, dates, formulas এবং row counts মিলিয়ে দেখ। Test Sheet-এ নতুন headers আসবে; পুরোনো rows বদলানো উচিত নয়।
4. এগুলো ঠিক থাকলে `enableWritesAfterReview` Run কর।

Google প্রথমবার authorization চাইতে পারে। Script যদি duplicate/blank header বা duplicate ID নিয়ে error দেয়, থামবি—নিজে থেকে data delete/rename করবি না। Error text জানাবি।

এই সময় অন্য tab/device থেকে app-এ বা Sheet-এ entry/edit করবি না। Script lock অন্য app version বা manual Sheet edit আটকায় না।

## ৪. নতুন Web App deployment তৈরি কর

**Deploy → New deployment → Web app**। Execute as নিজের account। Vercel server থেকে পৌঁছাতে deployment access এমন হতে হবে যাতে Google sign-in redirect না আসে; সাধারণ personal-account setup-এ এটি **Anyone**। এখানে নতুন script প্রতিটি request-এ server secret যাচাই করে; secret ছাড়া records পড়া/লেখা যাবে না। Google Sheet-এর sharing public করার দরকার নেই।

Workspace policy এই option না দিলে permission bypass করবি না; সেই restriction আগে সমাধান করতে হবে।

নতুন `/exec` URL copy কর। পুরোনো live deployment overwrite করবি না।

## ৫. Frontend/API test deploy

Package-এর `source/`-এর project files **আলাদা Git branch/test checkout**-এ রাখ। `api/` এবং `server/` folder বাদ দিবি না—এগুলো নতুন password login ও backend relay। শুধু `dist/` upload করলে চলবে না।

Vercel-এর **Preview environment**-এ সেট কর:

| Variable | কী দিবি |
| --- | --- |
| `GAS_WEB_APP_URL` | test Sheet-এর নতুন `/exec` URL |
| `GAS_SHARED_SECRET` | Apps Script-এর `AURA_API_SECRET`-এর একই value |
| `APP_PASSWORD` | এই app-এ ঢোকার নিজের ১২+ character password |
| `SESSION_SECRET` | আলাদা ৩২+ character random secret |
| `VITE_ENABLE_UPGRADE_WRITES` | প্রথমে `false`; নিচের read check-এর পরে `true` দিয়ে redeploy |

প্রথম চারটির নামের সামনে **VITE_ বসাবি না**। এগুলো server-only। Test ও production-এর secrets/deployments আলাদা রাখ। GitHub push থেকে production auto-deploy হলে main branch-এ এখন push করবি না।

Preview-তে password দিয়ে ঢুকে read-only অবস্থায় records/counts দেখে নে। ঠিক থাকলে test preview-তে `VITE_ENABLE_UPGRADE_WRITES=true` দিয়ে redeploy কর।

## ৬. শুধু test copy-তে verify কর

- নতুন expense add, refresh, edit — amount/date/status একই থাকছে?
- ১৭ নভেম্বরের card bill-এর default due date ৭ ডিসেম্বর হচ্ছে?
- একই bill-এ দুবার partial payment দিলে মোট যোগ হচ্ছে, bank debit তৈরি হচ্ছে না?
- Foreclose করলে future dues বন্ধ হচ্ছে, payment history থেকে যাচ্ছে?
- Template দিয়ে একই মাস দুবার prepare করলে duplicate হচ্ছে না?
- দুটি browser tab-এ একই entry edit করলে দ্বিতীয় stale save reject হচ্ছে?
- Archive করলে row Sheet-এ থেকে `_DeletedAt` পূরণ হচ্ছে? Restore করতে শুধু ওই marker cell clear করে refresh কর।
- Light/dark ও mobile forms ঠিকমতো দেখা যাচ্ছে?

## ৭. তারপর production cutover

Test ঠিক হলে মূল Sheet-এর script-এর backup রেখে নতুন script বসিয়ে আবার preview → backupAndUpgrade → backup verification → enableWritesAfterReview চালাতে হবে। নতুন production Web App deployment তৈরি কর; main Vercel environment-এ তার URL/secret/password বসিয়ে তারপর approved source deploy কর।

যাচাই শেষে পুরোনো unauthenticated Apps Script deployment retire/disable কর—নইলে তার পুরোনো endpoint চালু থাকবে। পুরোনো live app আগে বন্ধ করবি না; নতুনটি কাজ করছে নিশ্চিত হয়ে cutover করবি। মূল spreadsheet বা পুরোনো backup delete করবি না।

কোনও failed/timeout save-এর পরে আগে refresh করে entry আছে কি না দেখবি। না দেখে বারবার নতুন entry add করবি না।

## Rollback

পুরোনো code `baseline-source.zip`-এ আছে। মূল Apps Script-এর পুরোনো code/deployment-এর backup আলাদা রাখতে হবে। Data-এর backup হলো upgrade-এর তৈরি Google Sheet copy—code ZIP নয়। Source rollback দিয়ে data restore হয় না। কোনও mismatch হলে writes বন্ধ করতে editor থেকে `disableWrites` চালিয়ে backup ও original তুলনা কর।
