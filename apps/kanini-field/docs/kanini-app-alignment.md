# Nice_OS → Kanini Field Alignment Audit

Status: AUDITED AGAINST SOURCE. Fork: `~/kanini-field` @ pre-alignment snapshot.
Design target: `~/Downloads/kanini_app_screen_mockups.html` (10 screens).
SOP governs workflow; mockup governs UI; NAMPARK contract pending (Step 3).

## 1. Executive summary
Nice_OS is an offline-first Flutter rep app (~6.6k lines Dart): Hive persistence, queue-based sync via Supabase edge function, hard quality gates enforced in code, shift-gate routing. It already separates outlet census from visits and already enforces GPS discipline. The SOP's Observe→Record→Question→Proceed loop maps cleanly onto the existing check-in visit flow; what is missing is the outcome model, the Question phase, onboarding, safety, and Kanini branding. Supabase touches exactly 6 files. Verdict: fork is viable; ~70% KEEP/ADAPT.

## 2. Existing architecture
- `main.dart`: dotenv fail-closed (`FatalConfigScreen` if config missing/placeholder or init fails, 10s timeout) → Hive init → `syncService.init()` + `qualityService.init()` → MultiProvider(Auth, Retailer, Sync, Census(shift), Intercept(shift), Submission(shift), Shift, SupabaseService) → SplashScreen. Route `/check-in`.
- Layers: screens → providers (ChangeNotifier) → services → Hive boxes / sync queue / Supabase. Screens never touch HTTP directly (except RetailerProvider direct table reads — violation to fix during transport swap).
- Theme: `lib/theme/brand.dart` — ink/paper/card/amber/stampRed/stampGreen palette; `appName='Nice OS'`, `company='Nice Rice Millers'`.

## 3. Actual user flow (verified in code)
Splash → RootScreen: !auth → LoginScreen (Supabase email/password); needsClockIn → ShiftScreen(gate:true, no back); else HomeShell (5 tabs IndexedStack: Submit | Census | Dashboard(center) | Intercept | Visits; drawer quick-actions incl. shift/guide/profile). Census tab → OutletCensusFlow (new outlets). Visits tab → route stops → CheckInScreen(visit) (known outlets). Dashboard shows live stats + `_SyncErrorBanner` (fail-closed retry/dismiss) + update alert.

## 4. Screen alignment matrix
| Screen | Now (code) | Kanini target | Class |
|---|---|---|---|
| splash_screen | 'Nice OS' mark fade | Kanini Field mark | ADAPT (branding) |
| login_screen | Supabase email/pw | same UI, NAMPARK auth later | ADAPT |
| root_screen | auth+shift gates | + onboarding-first-run gate | ADAPT |
| home_shell | 5-tab shell+drawer | + persistent Safety control | ADAPT |
| dashboard_screen | mission/stats/tasks/sync-error | Home "Today" w/ rhythm timeline + n-of-target (mockup) | ADAPT |
| shift_screen | clock in/out gate | Check-in block (07:00) | KEEP |
| check_in_screen (673L) | GPS-proximity check-in → photos → stock/competitor/order → Complete Visit | Visit Flow Observe→Record→Question→Outcome | ADAPT (core) |
| outlet_census_flow (673L) | 6-step new-outlet census, GPS≤15m+photo hard gates, consent, profile, categories, per-client status | New-outlet record (same, +outcome NOT_AN_OUTLET path) | ADAPT |
| visits_screen | local route from census work | assigned routes (NAMPARK later) | ADAPT |
| submissions_screen | daily close + back-checks | Submissions | KEEP |
| sync_screen | pending list/flush | Sync Center (16:45 block) | KEEP |
| field_guide_screen | hardcoded widget handbook | JSON-driven guide + Six People/Sweep/Fallbacks | ADAPT |
| consumer_intercept_flow + intercept_* | unaided-before-aided locked survey | OUT OF SCOPE V1 (hide tab) | RETAIN-UNUSED |
| fatal_config_screen | branded fail-closed boot error | KEEP (rebrand msg) | KEEP |
| NEW onboarding | none | 10 mockup screens, Hive completion flag | NEW |
| NEW safety sheet | drawer "Support" tile only | persistent Safety bottom-sheet, offline cached contacts | NEW |

## 5. Provider matrix
auth (Supabase session; `isOTPVerified` hardcoded true — dead flag) → ADAPT to token/session abstraction. retailer (direct Supabase reads of client accounts RLS-scoped; feeds per-client status in census review) → REPLACE transport, keep concept. census (draft + captured outlets box + submit via gates) → ADAPT (+outcomes). intercept → RETAIN-UNUSED. submission (daily close + back-checks) → KEEP. sync (online state, deviceId via SharedPreferences UUID, flush/retry/force, error surfacing) → KEEP, swap onPush impl. shift (day-keyed clock in/out persisted ms, autoCheck, activity timeout) → KEEP.

## 6. Service matrix
- quality_service: gpsGateAccuracyM=15 (hard reject), proximityRadiusM=50 vs stored outlet GPS, one-visit/day (Hive `census_log`), photoMandatory, speedFlag<4min, straightlining delegate, backCheckFraction=10% deterministic → KEEP logic, READ FROM CONFIG.
- location_service: single high-accuracy fix or null; `stabiliseFixes(minSamples:3,maxSeconds:15,10m tolerance avg)` → KEEP both; wire stabilise into flows.
- sequence_lock (unaided-before-aided, throws at save) → pattern reusable for visit phase ordering; instance stays with intercepts.
- straightlining → KEEP.
- capture_service: ALL writes via enqueueSync (visits, shelf_photos+bucket upload `$repId/$photoId.jpg`, stock_observations, competitor_observations, order_intents(+items), route_stops); reads profiles once → KEEP shape, swap transport.
- census_service.submitCensus: hard gates (GPS/one-visit/photo/consent) → consent_records, outlets, outlet_contacts, outlet_client_links, visits(notes='census'), category_observations → ADAPT (+NOT_AN_OUTLET short-circuit).
- sync_service: Hive `pending_sync` LWW queue, pushOrder parents-before-children (19 entities), failed entities stay queued, flush(onPush callback) → KEEP WHOLESALE (transport-agnostic already).
- supabase_service → REPLACE. update_service (`app_versions`,`app_settings`) → REPLACE with `/mobile/config`.
- messaging → defer.

## 7. Model/data alignment
Plain toJson/fromJson classes, no Hive annotations, no Supabase imports. outlet_model(gpsLat/Lng…), visit_model, retailer_model(=client account), route_model(+route_stops entity), consent_record, daily_submission, category/competitor/stock observations, order_intent(+items), outlet_contact, outlet_client_link, shelf_photo, stock_item, user. → KEEP; add `outcome` to visit payload; ensure lat/lng/accuracy/captured_at quadruple everywhere GPS is stored.

## 8. Supabase dependency map (complete)
main.dart:107 init · auth_provider (session/signIn/signOut) · retailer_provider (4× direct table ops) · sync_provider→supabase_service.pushSync (edge fn `sync-push`, deviceId batch) · capture_service (auth uid, profiles read, bucket upload) · update_service (app_versions/app_settings) · services.dart export · fatal_config gating · messaging comment. Storage bucket `shelf-photos`.

## 9. Visit state machine
Existing: implicit Stepper indices (census) and screen-stack (check-in). No explicit FSM; no refusal branch (refusal = abandon, data lost — violates SOP). Required FSM (mockup "Step 1 of 4"): START→OBSERVE(hard rule: look before app)→RECORD→QUESTION(branch CONSENTED→questions / REFUSED keeps observe+record)→OUTCOME(exactly one of six)→REVIEW→SUBMITTED. Implement as explicit `SurveySequenceLock`-style phase lock.

## 10. Outlet vs Visit
ALREADY SEPARATED: census creates OutletModel + first VisitModel(notes='census'); subsequent days create visits against known outlet (proximity-checked). Outcome belongs to Visit. Keep this boundary; never overwrite outlet on revisit.

## 11. Complete record mapping (SOP 8 groups)
Location→gpsFix(lat/lng/accuracy/time)+ward/beat ✔ · Identity→businessName/channel/type/sizeTier ✔ · Contact→contactName/role/phone/language/isDecisionMaker ✔ · Proof→storefrontPhotoPath ✔ (mandatory) · Shelf→categoryDrafts(brands/facings/price/stockouts) ✔ · Volume→PARTIAL (estDailyCustomers, stock units; monthly flour offtake MISSING) · Supply→purchaseFrequency/primarySupplySource/supplierName/deliveryOrCollect ✔ · Landmark→landmark/street/buildingOrStallNo ✔. Missing fields flagged for Step 3 reconciliation.

## 12. GPS mapping
Capture: LocationService single fix; accuracy available; Position carries timestamp; persisted with record; blocks submission when >15m (hard) — SOP-aligned. Gaps: thresholds scattered as consts; multi-record-one-spot not blocked server-side (one-visit/day partially covers); stabiliseFixes unused by flows; WARN band absent (binary accept/reject). Plan: FieldConfig{accept≤15,warn≤40,reject>40 configurable}, three-state UX, wire stabilise.

## 13. Outcome mapping
CORRECTION (post-audit): typology.dart §4.5 DOES define VisitOutcome (completed/partial/refused/closed/owner_absent/duplicate_refusal) and Visit.outcome is a String — missed in the first pass. Reconciled: enum values now carry the SOP six (COMPLETE/PARTIAL/REFUSED/CLOSED/NOT_AN_OUTLET/UNSAFE) with legacy-code remapping in fromCode/fromJson ('completed'→COMPLETE, 'owner_absent'→PARTIAL, 'duplicate_refusal'→REFUSED). Exactly-one enforcement added at the Complete Visit gate.

## 14. Offline/sync mapping
UI→Provider→Service→Hive(`pending_sync` keyed `entity:rowId`)→flush grouped by pushOrder→onPush(edge fn)→markSynced/purge. Failed entities remain queued; errors surfaced fail-closed on dashboard. Target identical with onPush→NamparkApi.syncBatch. Idempotency: rowId keys give natural idempotency; add client op UUID when NAMPARK contract lands.

## 15. NAMPARK API dependency map (capability placeholders — DO NOT IMPLEMENT ENDPOINTS YET)
login/refresh→AuthProvider · GET /me→profile · devices/register→SyncProvider._deviceId · routes+outlets download→VisitsScreen/RetailerProvider replacement · visits CRUD+location/photos/submit→capture/census services · sync/batch→SyncProvider.flush · mobile/config→update_service+FieldConfig remote · safety contacts→SafetySheet. Consuming code identified; endpoints deferred to Step 3.

## 16. Onboarding mapping
None exists. NEW 10-screen per mockup: Welcome / Observe / Record / Question / Proceed / Complete Record / GPS Discipline / Outcome Codes / Your Target(30/day, band 20–40, Mon–Sat) / Ready→Sign-in. Hive `onboarding_done` flag; content mirrors enforced rules (no second truth).

## 17. Field Guide mapping
Hardcoded widgets today. Extract to `assets/content/field_guide.json`; sections: People you'll meet / Sweep technique / Fallbacks / Quick Reference. Content assets already drafted in superseded `~/kanini-rep-app`. Safety NEVER inside guide.

## 18. Safety mapping
Only a drawer "Support" tile. NEW persistent Safety affordance on HomeShell app-bar → modal bottom sheet (mockup): Hostility→Cluster lead→Laban (call) · Police/askari→Laban immediately (call) · Device/sync failure→Ian→Brian (same-day). Contacts from FieldConfig placeholders `tel://TO_BE_PROVISIONED` until business supplies numbers — NO invented numbers; works offline (local config).

## 19. Home / field-day mapping
ShiftProvider gives clock in/out + gate. Dashboard gains mockup "Today" timeline: 07:00 check-in(done via shift) · 07:15 brief · 07:45 depart · 08:00–12:30 block1 · 13:15–16:30 block2 · 16:45 sync(deadline) · debrief/close; progress n-of-target from CensusProvider.todayCount + completed visits; current-block highlight from clock time. All times config values.

## 20. Branding migration map
REMOVE/REPLACE: brand.dart appName/company ('Nice OS','Nice Rice Millers') → 'Kanini Field'; splash mark; main.dart:49 crash title; README. RETAIN internal: package id, pubspec name (build-stable), source identifiers (NICE-RICE SKU hints die with NICE-specific forms). User-facing must never show Nice_OS/NAMPARK/Market Link/PlayMax.

## 21. Classification summary
KEEP: sync_service, quality gates(logic), shift/submission providers+screens, straightlining, location_service, models, fatal-config pattern, root gate pattern. ADAPT: check_in_flow(state machine+outcomes), census_flow(outcome path), dashboard(rhythm/target), home_shell(safety), field_guide(JSON), auth_provider(abstraction), retailer_provider(transport), root(onboarding gate), brand(theme reuse, rename). REPLACE: supabase_service, update_service, auth transport, sync transport impl. NEW: onboarding, safety sheet, VisitOutcome enum+FSM, FieldConfig, NamparkApi interface, volume/offtake fields.

## 22. Missing capabilities (client)
Outcome model · Question phase · onboarding · safety control · config layer · guide content pipeline · volume(offtake) capture · route download consumption · device registration UX.

## 23. Risks
Intercept/census share `visits` entity naming with Kanini visit semantics (payload disambiguation needed) · RetailerProvider direct reads break offline (pre-existing) · hardcoded thresholds drift · photos queued as metadata+binary split (upload coupling in capture_service) · SharedPreferences deviceId survives reinstall ambiguities · no tests for check_in flow (largest file).

## 24. Implementation sequence
1 Branding+config 2 Outcomes+FSM in visit flow 3 Onboarding 4 Safety 5 Guide JSON 6 Dashboard rhythm 7 NamparkApi seam 8 [BLOCKED on Step 3] auth/device/routes/sync-transport swap 9 remove Nice-specific forms 10 integration+field tests.

## 25. Files to modify
theme/brand.dart, main.dart, splash/root/home_shell/dashboard screens, check_in_screen, outlet_census_flow, census_service(+draft), quality_service(config), auth/retailer providers(later), field_guide_screen, pubspec(assets), new: config/, domain/visit_outcome.dart, screens/onboarding_*, screens/safety_sheet.dart, services/nampark_api.dart, assets/content/*.json.

## 26. Files untouched
sync_service.dart, straightlining.dart, sequence_lock.dart, location_service.dart, submissions_screen.dart, sync_screen.dart, shift_screen.dart, shift/submission/sync providers, all lib/models/*, consumer_intercept_flow.dart (until V2 decision), test/*.
