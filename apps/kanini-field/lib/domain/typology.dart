/// Market Link data collection model — typology (v1.0, 11 Aug 2026).
///
/// Single source of truth for every enum in the field dictionary. The UI,
/// models, validation and sync payloads all derive from this file so the
/// channel → type → extension tree can never drift from the spec.
///
/// Model: one outlet record, many client relationships.
///   OUTLET (canonical/shared) ─┬ OUTLET_CONTACT (PD)
///                              ├ OUTLET_CLIENT_LINK (status per client)
///                              └ VISIT ─ observations / order / photos
///   CONSUMER_INTERCEPT (anonymous, standalone)
///   CONSENT_RECORD (attaches to OUTLET_CONTACT and CONSUMER_INTERCEPT)
library;

/// 3.1 Channel — top level, 6 values, mandatory.
enum Channel {
  traditionalTrade('traditional', 'Traditional trade',
      'Duka/general shop, kiosk, cereal shop, posho mill'),
  modernTrade('modern', 'Modern trade',
      'Supermarket, mini-mart, self-service, petrol station convenience'),
  horeca('horeca', 'HoReCa',
      'Hotel, restaurant, kibanda, café, bar, fast food'),
  institutional('institutional', 'Institutional',
      'School, college, hospital, church, prison, canteen, NGO'),
  wholesale('wholesale', 'Wholesale',
      'Wholesaler, distributor, stockist, sub-distributor'),
  openMarket('open_market', 'Open market',
      'Soko stall, market shed, hawker, mobile vendor');

  const Channel(this.code, this.label, this.description);
  final String code;
  final String label;
  final String description;

  static Channel? fromCode(String? code) =>
      values.where((c) => c.code == code).firstOrNull;
}

/// 3.2 Outlet type — second level, pick one per channel.
enum OutletType {
  // Traditional
  duka('duka', 'Duka / general shop', Channel.traditionalTrade),
  kiosk('kiosk', 'Kiosk', Channel.traditionalTrade),
  cerealShop('cereal_shop', 'Cereal & grains shop', Channel.traditionalTrade),
  poshoMill('posho_mill', 'Posho mill', Channel.traditionalTrade),
  butchery('butchery', 'Butchery', Channel.traditionalTrade),
  greengrocer('greengrocer', 'Greengrocer (mama mboga)', Channel.traditionalTrade),
  milkBar('milk_bar', 'Milk bar / milk ATM', Channel.traditionalTrade),
  bakery('bakery', 'Bakery', Channel.traditionalTrade),
  chapatiProducer('chapati_producer', 'Chapati & mandazi producer',
      Channel.traditionalTrade),
  agrovet('agrovet', 'Agrovet', Channel.traditionalTrade),
  chemist('chemist', 'Chemist', Channel.traditionalTrade),
  mpesaAgent('mpesa_agent', 'M-Pesa / agent shop', Channel.traditionalTrade),
  // Modern trade
  supermarketChain('supermarket_chain', 'Supermarket (chain)', Channel.modernTrade),
  supermarketIndependent('supermarket_independent', 'Supermarket (independent)',
      Channel.modernTrade),
  minimart('minimart', 'Mini-mart / self-service', Channel.modernTrade),
  petrolStationShop('petrol_station_shop', 'Petrol station shop', Channel.modernTrade),
  wholesaleClub('wholesale_club', 'Wholesale club', Channel.modernTrade),
  // HoReCa
  hotel('hotel', 'Hotel (accommodation)', Channel.horeca),
  restaurant('restaurant', 'Restaurant (mid/upper)', Channel.horeca),
  kibanda('kibanda', 'Kibanda / local eatery', Channel.horeca),
  fastFood('fast_food', 'Fast food outlet', Channel.horeca),
  cafe('cafe', 'Café / coffee shop', Channel.horeca),
  bar('bar', 'Bar / pub', Channel.horeca),
  catering('catering', 'Catering business', Channel.horeca),
  institutionalCanteen('institutional_canteen', 'Institutional canteen', Channel.horeca),
  // Institutional
  school('school', 'School / college', Channel.institutional),
  hospital('hospital', 'Hospital / clinic', Channel.institutional),
  church('church', 'Church / religious', Channel.institutional),
  prison('prison', 'Prison', Channel.institutional),
  staffCanteen('staff_canteen', 'Staff canteen', Channel.institutional),
  ngo('ngo', 'NGO / community', Channel.institutional),
  // Wholesale
  wholesaler('wholesaler', 'Wholesaler', Channel.wholesale),
  distributor('distributor', 'Distributor', Channel.wholesale),
  stockist('stockist', 'Stockist', Channel.wholesale),
  subDistributor('sub_distributor', 'Sub-distributor', Channel.wholesale),
  // Open market
  marketStallPermanent('market_stall_permanent', 'Market stall (permanent)',
      Channel.openMarket),
  marketStallMarketDay('market_stall_market_day', 'Market stall (market-day)',
      Channel.openMarket),
  hawker('hawker', 'Hawker / mobile vendor', Channel.openMarket),
  // Other — free text, reviewed weekly (§3.2)
  other('other', 'Other — free text', null);

  const OutletType(this.code, this.label, this.channel);
  final String code;
  final String label;
  final Channel? channel;

  static OutletType? fromCode(String? code) =>
      values.where((t) => t.code == code).firstOrNull;

  static List<OutletType> forChannel(Channel channel) =>
      values.where((t) => t.channel == channel).toList();
}

/// 3.3 Status — per client (in OUTLET_CLIENT_LINK, never on the outlet).
enum ClientStatus {
  activeCustomer('active_customer', 'Active customer'),
  prospect('prospect', 'Prospect'),
  lapsed('lapsed', 'Lapsed (bought before, stopped)'),
  inactive('inactive', 'Inactive (dormant ≥90 days)'),
  competitorOnly('competitor_only', 'Competitor-only'),
  refused('refused', 'Refused'),
  notApplicable('not_applicable', 'Not applicable'),
  closed('closed', 'Closed / gone');

  const ClientStatus(this.code, this.label);
  final String code;
  final String label;

  static ClientStatus? fromCode(String? code) =>
      values.where((s) => s.code == code).firstOrNull;
}

/// 4.4 Category — ask for every relevant category on every visit.
enum ProductCategory {
  maizeFlour('maize_flour', 'Maize flour'),
  wheatFlour('wheat_flour', 'Wheat flour'),
  rice('rice', 'Rice'),
  sugar('sugar', 'Sugar'),
  cookingOil('cooking_oil', 'Cooking oil'),
  freshMilk('fresh_milk', 'Fresh milk'),
  uhtMilk('uht_milk', 'UHT milk'),
  fermentedMilk('fermented_milk', 'Fermented milk (mala)'),
  yoghurt('yoghurt', 'Yoghurt'),
  powderedMilk('powdered_milk', 'Powdered milk'),
  breadBakery('bread_bakery', 'Bread & bakery'),
  softDrinks('soft_drinks', 'Soft drinks'),
  water('water', 'Water'),
  teaCoffee('tea_coffee', 'Tea & coffee'),
  soapsDetergents('soaps_detergents', 'Soaps & detergents'),
  animalFeed('animal_feed', 'Animal feed');

  const ProductCategory(this.code, this.label);
  final String code;
  final String label;

  static ProductCategory? fromCode(String? code) =>
      values.where((c) => c.code == code).firstOrNull;
}

/// 4.4 Flour brand list.
enum FlourBrand {
  nice('Nice'),
  jogoo('Jogoo (Unga)'),
  pembe('Pembe'),
  soko('Soko (Capwell)'),
  dola('Dola'),
  ndovu('Ndovu'),
  amaize('Amaize'),
  unbranded('Unbranded / posho'),
  other('Other');

  const FlourBrand(this.label);
  final String label;
}

/// 4.4 Dairy brand list (Kiambu is Fresha's home county).
enum DairyBrand {
  brookside('Brookside'),
  newKcc('New KCC'),
  fresha('Fresha (Githunguri)'),
  daima('Daima'),
  ilara('Ilara'),
  tuzo('Tuzo'),
  lato('Lato'),
  raw('Raw / unbranded'),
  other('Other');

  const DairyBrand(this.label);
  final String label;
}

/// Brand presence list for a [ProductCategory]. Flour/dairy use the
/// spec lists; everything else is free-text "Other".
String? brandListFor(ProductCategory category) {
  switch (category) {
    case ProductCategory.maizeFlour:
    case ProductCategory.wheatFlour:
      return FlourBrand.values.map((b) => b.label).join('|');
    case ProductCategory.freshMilk:
    case ProductCategory.uhtMilk:
    case ProductCategory.fermentedMilk:
    case ProductCategory.yoghurt:
    case ProductCategory.powderedMilk:
      return DairyBrand.values.map((b) => b.label).join('|');
    default:
      return null;
  }
}

/// 4.4 Why is it the fastest moving brand?
enum FastestMovingReason {
  price('price', 'Price'),
  quality('quality', 'Quality'),
  demand('demand', 'Customer demand'),
  margin('margin', 'Margin'),
  availability('availability', 'Availability');

  const FastestMovingReason(this.code, this.label);
  final String code;
  final String label;
}

/// 4.4 Common pack sizes (multi-select).
enum PackSize {
  small('small', '< 250 g'),
  medium('medium', '250 g – 1 kg'),
  large('large', '1–5 kg'),
  xlarge('xlarge', '5 kg +');

  const PackSize(this.code, this.label);
  final String code;
  final String label;

  static PackSize? fromCode(String? code) =>
      values.where((p) => p.code == code).firstOrNull;
}

/// 4.2 Outlet size tier.
enum OutletSizeTier {
  micro('micro', 'Micro'),
  small('small', 'Small'),
  medium('medium', 'Medium'),
  large('large', 'Large');

  const OutletSizeTier(this.code, this.label);
  final String code;
  final String label;
}

/// 4.2 Purchase frequency bands (drives visit frequency model).
enum PurchaseFrequency {
  daily('daily', 'Daily'),
  twoToThreeWeekly('2-3x_wk', '2–3× / week'),
  weekly('weekly', 'Weekly'),
  fortnightly('fortnightly', 'Fortnightly'),
  monthly('monthly', 'Monthly');

  const PurchaseFrequency(this.code, this.label);
  final String code;
  final String label;

  static PurchaseFrequency? fromCode(String? code) =>
      values.where((f) => f.code == code).firstOrNull;
}

/// 4.2 Primary supply source — RTM reconstruction (Pillar 1 finding).
enum PrimarySupplySource {
  manufacturerDirect('manufacturer_direct', 'Manufacturer direct'),
  distributor('distributor', 'Distributor'),
  wholesaler('wholesaler', 'Wholesaler'),
  openMarket('open_market', 'Open market'),
  ownTransport('own_transport', 'Own transport');

  const PrimarySupplySource(this.code, this.label);
  final String code;
  final String label;
}

/// 4.2 Delivery or collect (service model).
enum DeliveryMode {
  delivery('delivery', 'Delivery'),
  collect('collect', 'Collect');

  const DeliveryMode(this.code, this.label);
  final String code;
  final String label;
}

/// 4.2 Storage capacity.
enum StorageCapacity {
  none('none', 'None'),
  small('small', 'Small'),
  backstore('backstore', 'Backstore'),
  warehouse('warehouse', 'Warehouse');

  const StorageCapacity(this.code, this.label);
  final String code;
  final String label;
}

/// 4.3 Contact role.
enum ContactRole {
  owner('owner', 'Owner'),
  manager('manager', 'Manager'),
  attendant('attendant', 'Attendant');

  const ContactRole(this.code, this.label);
  final String code;
  final String label;

  static ContactRole? fromCode(String? code) =>
      values.where((r) => r.code == code).firstOrNull;
}

/// 4.7 HoReCa / Institutional — menu items using the category.
enum MenuItemUsingCategory {
  ugali('ugali', 'Ugali'),
  chapati('chapati', 'Chapati'),
  mandazi('mandazi', 'Mandazi'),
  bread('bread', 'Bread'),
  tea('tea', 'Tea'),
  porridge('porridge', 'Porridge');

  const MenuItemUsingCategory(this.code, this.label);
  final String code;
  final String label;
}

/// 4.7 Purchase channel (HoReCa/institutional).
enum PurchaseChannel {
  wholesaler('wholesaler', 'Wholesaler'),
  distributor('distributor', 'Distributor'),
  supermarket('supermarket', 'Supermarket'),
  market('market', 'Market'),
  direct('direct', 'Direct');

  const PurchaseChannel(this.code, this.label);
  final String code;
  final String label;
}

/// 4.7 Decision maker role.
enum DecisionMakerRole {
  owner('owner', 'Owner'),
  chef('chef', 'Chef'),
  procurement('procurement', 'Procurement'),
  matron('matron', 'Matron'),
  bursar('bursar', 'Bursar');

  const DecisionMakerRole(this.code, this.label);
  final String code;
  final String label;
}

/// 4.7 Payment terms.
enum PaymentTerms {
  cash('cash', 'Cash'),
  sevenDays('7_days', '7 days'),
  fourteenDays('14_days', '14 days'),
  thirtyDays('30_days', '30 days');

  const PaymentTerms(this.code, this.label);
  final String code;
  final String label;
}

/// 4.6 Intercept — shopper role.
enum ShopperRole {
  mainShopper('main_shopper', 'Main shopper'),
  occasional('occasional', 'Occasional');

  const ShopperRole(this.code, this.label);
  final String code;
  final String label;

  static ShopperRole? fromCode(String? code) =>
      values.where((r) => r.code == code).firstOrNull;
}

/// 4.6 Intercept — where they buy.
enum WhereTheyBuy {
  duka('duka', 'Duka'),
  supermarket('supermarket', 'Supermarket'),
  market('market', 'Market'),
  wholesaler('wholesaler', 'Wholesaler'),
  poshoMill('posho_mill', 'Posho mill'),
  direct('direct', 'Direct');

  const WhereTheyBuy(this.code, this.label);
  final String code;
  final String label;

  static WhereTheyBuy? fromCode(String? code) =>
      values.where((w) => w.code == code).firstOrNull;
}

/// 4.6 Intercept — switch trigger.
enum SwitchTrigger {
  price('price', 'Price'),
  availability('availability', 'Availability'),
  quality('quality', 'Quality'),
  promotion('promotion', 'Promotion'),
  recommendation('recommendation', 'Recommendation');

  const SwitchTrigger(this.code, this.label);
  final String code;
  final String label;

  static SwitchTrigger? fromCode(String? code) =>
      values.where((t) => t.code == code).firstOrNull;
}

/// 4.6 Intercept — would they try a new brand?
enum WouldTryNewBrand {
  yes('yes', 'Yes'),
  no('no', 'No'),
  maybe('maybe', 'Maybe');

  const WouldTryNewBrand(this.code, this.label);
  final String code;
  final String label;

  static WouldTryNewBrand? fromCode(String? code) =>
      values.where((w) => w.code == code).firstOrNull;
}

/// 4.5 Visit outcome — the SOP six. Every submitted visit carries exactly
/// one. Codes are uppercase wire values; legacy lowercase codes from older
/// builds are remapped on read (see Visit.fromJson).
enum VisitOutcome {
  complete('COMPLETE', 'Complete', 'Observed, recorded, questions answered'),
  partial('PARTIAL', 'Partial', 'Some questions declined'),
  refused('REFUSED', 'Refused', 'No questions answered, observation kept'),
  closed('CLOSED', 'Closed', 'Shut today, flagged for revisit'),
  notAnOutlet('NOT_AN_OUTLET', 'Not an outlet', 'Residence, office, empty premises'),
  unsafe('UNSAFE', 'Unsafe', 'You stood down, tell your lead today');

  const VisitOutcome(this.code, this.label, this.description);
  final String code;
  final String label;
  final String description;

  static VisitOutcome? fromCode(String? code) {
    if (code == null) return null;
    switch (code) {
      case 'completed':
      case 'COMPLETE':
        return complete;
      case 'partial':
      case 'PARTIAL':
        return partial;
      case 'refused':
      case 'duplicate_refusal':
      case 'REFUSED':
        return refused;
      case 'closed':
      case 'CLOSED':
        return closed;
      case 'owner_absent':
        return partial; // owner absent == questions declined (SOP)
      case 'NOT_AN_OUTLET':
        return notAnOutlet;
      case 'UNSAFE':
        return unsafe;
    }
    return null;
  }

  /// Refusal-family outcomes still preserve observation data.
  bool get preservesObservation =>
      this == refused || this == notAnOutlet || this == unsafe || this == closed;

  /// Outcomes that permit the full question set.
  bool get allowsQuestions => this == complete || this == partial;
}

/// 4.5 Refusal reason.
enum RefusalReason {
  busy('busy', 'Busy / no time'),
  notInterested('not_interested', 'Not interested'),
  dataPrivacy('data_privacy', 'Data privacy concerns'),
  sawUsBefore('saw_us_before', 'Saw us before'),
  other('other', 'Other');

  const RefusalReason(this.code, this.label);
  final String code;
  final String label;
}

/// 4.1 Operating days (multi-select).
enum OperatingDay {
  monday('mon', 'Mon'),
  tuesday('tue', 'Tue'),
  wednesday('wed', 'Wed'),
  thursday('thu', 'Thu'),
  friday('fri', 'Fri'),
  saturday('sat', 'Sat'),
  sunday('sun', 'Sun');

  const OperatingDay(this.code, this.label);
  final String code;
  final String label;
}

/// 5. Data-quality flags raised by [QualityService].
enum QualityFlag {
  gpsGate('gps_gate', 'GPS accuracy > 15 m — capture rejected'),
  proximity('proximity', 'Check-in > 50 m from outlet GPS'),
  photoMandatory('photo_mandatory', 'No storefront photo on submission'),
  oneVisitRule('one_visit_rule', 'Census already captured for this outlet today'),
  speedFlag('speed_flag', 'Visit under 4 minutes — flag for back-check'),
  straightlining('straightlining', 'Identical answer patterns across outlets');

  const QualityFlag(this.code, this.label);
  final String code;
  final String label;
}
