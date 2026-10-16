/**
 * English names for the vocabulary (#25): what an English-speaking shopper
 * types, and what the page shows them for an item it wrote itself.
 *
 * The first name is the one shown; any after it are read as well. American
 * first, British accepted (zucchini, courgette). A plain English description
 * where there is one ("smoked sausage" for rookworst); the Dutch word only
 * where English has none (hagelslag), with a description read as well. The
 * Dutch names stay readable whatever the page's language.
 *
 * test/english.test.ts checks that every Ingredient and Variant has a name
 * here and that none of them reads as another Ingredient or Variant.
 */

import { FLAVOURS, VOCABULARY } from "./vocabulary.ts";

/** [shown, ...also read]. */
type Names = readonly [string, ...string[]];
export type Translation = Names | { readonly names: Names; readonly variants: Readonly<Record<string, Names>> };

export const ENGLISH: Readonly<Record<string, Translation>> = {
  // ── Potatoes
  aardappelen: { names: ["potatoes", "potato"], variants: {
    kriel: ["baby potatoes", "new potatoes"], vastkokend: ["waxy potatoes", "firm potatoes"],
    kruimig: ["starchy potatoes", "floury potatoes", "mealy potatoes"] } },
  "zoete aardappelen": { names: ["sweet potatoes", "sweet potato", "yams"], variants: { gesneden: ["diced sweet potatoes", "sweet potato cubes"], heel: ["whole sweet potatoes"] } },
  friet: ["fries", "french fries"],
  aardappelpuree: ["mashed potatoes", "mashed potato", "potato mash", "instant mashed potatoes"],

  // ── Vegetables
  wortelen: ["carrots", "carrot"],
  uien: { names: ["onions", "onion"], variants: {
    rode: ["red onions", "red onion"], gele: ["yellow onions", "yellow onion", "brown onions"],
    gesneden: ["chopped onions", "sliced onions", "diced onions"], heel: ["whole onions"] } },
  bosui: ["green onions", "green onion", "scallions", "scallion", "spring onions"],
  sjalotten: ["shallots", "shallot"],
  zilveruitjes: ["pearl onions", "cocktail onions", "silverskin onions"],
  knoflook: ["garlic"],
  prei: { names: ["leeks", "leek"], variants: { gesneden: ["sliced leeks", "chopped leeks"], heel: ["whole leeks"] } },
  courgette: ["zucchini", "zucchinis", "courgettes"],
  komkommer: ["cucumber", "cucumbers"],
  snoepkomkommers: ["mini cucumbers", "snack cucumbers", "baby cucumbers"],
  paprika: { names: ["bell peppers", "bell pepper", "sweet peppers"], variants: {
    rood: ["red bell peppers", "red bell pepper", "red peppers"], geel: ["yellow bell peppers", "yellow bell pepper", "yellow peppers"],
    groen: ["green bell peppers", "green bell pepper", "green peppers"] } },
  puntpaprika: ["pointed peppers", "sweet pointed peppers", "romano peppers"],
  tomaten: { names: ["tomatoes", "tomato"], variants: {
    snoep: ["cherry tomatoes", "cherry tomato", "grape tomatoes"], tros: ["vine tomatoes", "tomatoes on the vine", "truss tomatoes"],
    roma: ["roma tomatoes", "plum tomatoes"], vlees: ["beefsteak tomatoes"] } },
  tomatenblokjes: ["diced tomatoes", "chopped tomatoes"],
  "gepelde tomaten": ["whole peeled tomatoes", "peeled tomatoes"],
  passata: ["passata", "strained tomatoes", "sieved tomatoes"],
  tomatenpuree: ["tomato paste", "tomato concentrate", "tomato puree"],
  broccoli: { names: ["broccoli"], variants: { gesneden: ["broccoli florets"], heel: ["whole broccoli", "broccoli crowns"] } },
  bloemkool: { names: ["cauliflower"], variants: { gesneden: ["cauliflower florets"], heel: ["whole cauliflower"] } },
  spinazie: ["spinach"],
  andijvie: { names: ["endive", "escarole"], variants: { gesneden: ["chopped endive", "shredded endive"], heel: ["whole endive"] } },
  boerenkool: { names: ["kale", "curly kale"], variants: { gesneden: ["chopped kale"], heel: ["whole kale"] } },
  zuurkool: ["sauerkraut"],
  spruiten: ["brussels sprouts", "brussels sprout", "sprouts"],
  sperziebonen: ["green beans", "string beans", "french beans"],
  snijbonen: ["runner beans", "flat beans", "romano beans"],
  peultjes: ["snow peas", "mangetout", "sugar snap peas"],
  doperwten: ["peas", "pea", "green peas", "garden peas"],
  "doperwten en wortelen": ["peas and carrots"],
  mais: ["corn", "sweet corn", "sweetcorn", "corn on the cob"],
  champignons: { names: ["mushrooms", "mushroom"], variants: {
    kastanje: ["cremini mushrooms", "chestnut mushrooms", "brown mushrooms", "baby bella mushrooms"],
    wit: ["white mushrooms", "button mushrooms"],
    gesneden: ["sliced mushrooms"], heel: ["whole mushrooms"] } },
  paddenstoelen: ["specialty mushrooms", "exotic mushrooms", "oyster mushrooms", "shiitake", "portobello"],
  aubergine: ["eggplant", "eggplants", "aubergines"],
  pompoen: { names: ["pumpkin", "squash", "butternut squash"], variants: { gesneden: ["diced pumpkin", "pumpkin chunks"], heel: ["whole pumpkin"] } },
  knolselderij: ["celery root", "celeriac"],
  bleekselderij: ["celery", "celery sticks"],
  venkel: ["fennel"],
  "rode kool": ["red cabbage"],
  "witte kool": { names: ["green cabbage", "white cabbage"], variants: { gesneden: ["shredded cabbage", "shredded white cabbage"], heel: ["whole white cabbage"] } },
  spitskool: { names: ["pointed cabbage", "sweetheart cabbage", "hispi cabbage"], variants: { gesneden: ["shredded pointed cabbage"], heel: ["whole pointed cabbage"] } },
  "chinese kool": ["napa cabbage", "chinese cabbage"],
  paksoi: ["bok choy", "pak choi"],
  witlof: ["belgian endive", "chicory", "witloof"],
  koolrabi: ["kohlrabi"],
  "rode bieten": { names: ["beets", "beet", "beetroot", "red beets"], variants: { gesneden: ["diced beets", "grated beets"], heel: ["whole beets"] } },
  radijs: ["radishes", "radish"],
  pastinaak: ["parsnips", "parsnip"],
  asperges: ["asparagus"],
  avocado: ["avocados"],
  "taugé": ["bean sprouts"],
  ijsbergsla: { names: ["iceberg lettuce", "iceberg"], variants: { gesneden: ["shredded lettuce", "shredded iceberg"], heel: ["whole iceberg lettuce"] } },
  kropsla: ["butter lettuce", "butterhead lettuce", "boston lettuce", "round lettuce"],
  sla: ["lettuce", "salad greens", "mixed greens"],
  rucola: ["arugula", "rocket"],
  veldsla: ["mâche", "mache", "lamb's lettuce", "corn salad"],
  rauwkost: ["coleslaw", "slaw", "shredded vegetables"],
  roerbakgroente: ["stir-fry vegetables", "stir-fry mix", "wok vegetables"],
  soepgroente: ["soup vegetables", "soup greens"],
  stamppotgroente: ["stamppot vegetables"],
  gember: ["ginger"],
  "rode peper": ["chili peppers", "chili pepper", "chilies", "chiles", "red chili", "hot peppers", "chili"],

  // ── Fresh herbs
  peterselie: ["parsley"],
  koriander: ["cilantro", "coriander"],
  basilicum: ["basil"],
  bieslook: ["chives"],
  dille: ["dill"],
  munt: ["mint"],
  tijm: ["thyme"],
  rozemarijn: ["rosemary"],

  // ── Fruit
  appels: { names: ["apples", "apple"], variants: {
    elstar: ["elstar apples"], jonagold: ["jonagold apples"], goudrenet: ["goudrenet apples", "reinette apples"],
    granny: ["granny smith apples"], braeburn: ["braeburn apples"] } },
  peren: { names: ["pears", "pear"], variants: { stoof: ["cooking pears", "stewing pears"], hand: ["eating pears", "dessert pears"] } },
  bananen: ["bananas", "banana"],
  sinaasappels: ["oranges", "orange"],
  mandarijnen: ["mandarins", "mandarin", "clementines", "tangerines"],
  citroenen: ["lemons", "lemon"],
  limoenen: ["limes", "lime"],
  grapefruit: ["grapefruits"],
  druiven: ["grapes", "grape"],
  aardbeien: ["strawberries", "strawberry"],
  "blauwe bessen": ["blueberries", "blueberry"],
  frambozen: ["raspberries", "raspberry"],
  kersen: ["cherries", "cherry"],
  "kiwi's": ["kiwis", "kiwifruit"],
  mango: { names: ["mangoes", "mangos"], variants: { gesneden: ["mango chunks", "diced mango"], heel: ["whole mango"] } },
  ananas: { names: ["pineapple", "pineapples"], variants: { gesneden: ["pineapple chunks", "diced pineapple"], heel: ["whole pineapple"] } },
  meloen: { names: ["melon", "melons", "cantaloupe"], variants: { gesneden: ["melon chunks", "cut melon"], heel: ["whole melon"] } },
  pruimen: ["plums", "plum"],
  nectarines: ["nectarine"],
  granaatappel: ["pomegranate", "pomegranates"],
  fruitsalade: ["fruit salad"],
  appelmoes: ["applesauce", "apple sauce"],
  rozijnen: ["raisins"],
  dadels: ["dates"],

  // ── Meat
  gehakt: { names: ["ground meat", "minced meat", "mince"], variants: {
    "half-om-half": ["ground beef and pork", "beef and pork mince", "mixed ground meat"],
    rund: ["ground beef", "minced beef", "beef mince"], varken: ["ground pork", "minced pork", "pork mince"],
    kip: ["ground chicken", "minced chicken", "chicken mince"] } },
  gehaktballen: ["meatballs", "meatball"],
  hamburgers: ["burgers", "burger", "burger patties"],
  kipfilet: { names: ["chicken breast", "chicken breasts", "chicken fillet", "chicken breast fillet"], variants: {
    heel: ["whole chicken breasts", "whole chicken breast"], blokjes: ["diced chicken", "chicken pieces", "chicken chunks"] } },
  kipdijfilet: ["chicken thighs", "chicken thigh", "boneless chicken thighs", "chicken thigh fillet"],
  kippenpoten: ["chicken drumsticks", "chicken legs"],
  kipvleugels: ["chicken wings", "wings"],
  "hele kip": ["whole chicken"],
  kalkoenfilet: ["turkey breast", "turkey fillet"],
  speklappen: ["pork belly slices", "pork belly"],
  spekblokjes: ["diced bacon", "bacon bits", "lardons"],
  ontbijtspek: ["bacon", "bacon strips", "breakfast bacon"],
  varkenshaas: ["pork tenderloin", "pork fillet"],
  karbonade: ["pork chops", "pork chop"],
  schnitzels: ["schnitzel", "pork schnitzel"],
  varkensvlees: ["pork"],
  biefstuk: ["steak", "steaks", "beef steak", "sirloin steak"],
  stoofvlees: ["stew beef", "stewing beef", "beef stew meat", "braising steak"],
  "rundvlees reepjes": ["beef strips", "stir-fry beef"],
  rookworst: ["smoked sausage", "smoked sausages"],
  braadworst: ["bratwurst", "frying sausage"],
  shoarma: ["shawarma meat", "shawarma"],
  lamsvlees: ["lamb"],

  // ── Fish
  zalm: { names: ["salmon"], variants: { gerookt: ["smoked salmon"], vers: ["salmon fillet", "fresh salmon"] } },
  kabeljauw: ["cod", "cod fillet"],
  pangasius: ["basa", "swai"],
  koolvis: ["pollock", "pollack", "coley", "saithe"],
  tilapia: ["tilapia"],
  vissticks: ["fish sticks", "fish fingers"],
  garnalen: ["shrimp", "shrimps", "prawns"],
  mosselen: ["mussels", "mussel"],
  haring: ["herring"],
  makreel: ["mackerel"],
  tonijn: ["tuna"],
  kibbeling: ["kibbeling", "battered fish bites", "fried cod bites"],
  surimi: ["surimi", "crab sticks", "imitation crab"],
  sardines: ["sardine"],

  // ── Vegetarian
  tofu: ["tofu"],
  tempeh: ["tempeh"],
  "vegetarisch gehakt": ["vegetarian ground meat", "veggie mince", "vegetarian mince", "vegan mince", "plant-based ground meat"],

  falafel: ["falafel"],
  // ── Dairy and eggs
  melk: { names: ["milk"], variants: {
    lactosevrij: ["lactose-free milk"], halfvol: ["low-fat milk", "semi-skimmed milk", "reduced-fat milk"],
    vol: ["whole milk", "full-fat milk"], mager: ["skim milk", "skimmed milk", "fat-free milk"] } },
  karnemelk: ["buttermilk"],
  chocolademelk: ["chocolate milk"],
  koffiemelk: ["evaporated milk", "coffee creamer"],
  havermelk: ["oat milk", "oat drink"],
  sojamelk: ["soy milk", "soya milk", "soy drink"],
  amandelmelk: ["almond milk", "almond drink"],
  kokosmelk: ["coconut milk"],
  yoghurt: { names: ["yogurt"], variants: {
    grieks: ["greek yogurt", "greek yoghurt"], skyr: ["skyr"], gewoon: ["regular yogurt"], mager: ["nonfat yogurt", "fat-free yogurt", "fat-free yoghurt"],
    halfvol: ["low-fat yogurt", "low-fat yoghurt"], vol: ["whole milk yogurt", "full-fat yogurt", "full-fat yoghurt"],
    "10%": ["yogurt 10%", "10% yogurt"], "5%": ["yogurt 5%", "5% yogurt"], "2%": ["yogurt 2%", "2% yogurt"] } },
  kwark: { names: ["quark"], variants: { mager: ["nonfat quark", "fat-free quark"], half: ["low-fat quark"], vol: ["full-fat quark"] } },
  toetje: { names: ["dessert", "desserts", "dessert cups"], variants: {
    pudding: ["pudding"], mousse: ["mousse"], rijst: ["rice pudding"], griesmeel: ["semolina pudding"], tiramisu: ["tiramisu"] } },
  vla: ["custard"],
  slagroom: ["whipping cream", "heavy cream", "double cream", "whipped cream"],
  kookroom: ["cooking cream"],
  "crème fraîche": ["crème fraîche"],
  "zure room": ["sour cream"],
  roomboter: { names: ["butter"], variants: { ongezouten: ["unsalted butter"], gezouten: ["salted butter"] } },
  margarine: ["margarine"],
  "bak- en braadboter": ["frying butter", "cooking butter", "frying margarine"],
  eiwit: { names: ["egg whites", "egg white", "liquid egg whites"], variants: {} },
  eieren: { names: ["eggs", "egg"], variants: {
    bio: ["organic eggs"], scharrel: ["cage-free eggs", "barn eggs"], "vrije uitloop": ["free-range eggs"] } },

  // ── Cheese
  kaas: { names: ["cheese"], variants: {
    "extra belegen": ["extra mature cheese", "extra aged cheese"], "jong belegen": ["semi-mature cheese"],
    belegen: ["mature cheese", "matured cheese"], oud: ["aged cheese", "old cheese"], jong: ["young cheese"] } },
  "geraspte kaas": ["shredded cheese", "grated cheese"],
  geitenkaas: ["goat cheese", "goat's cheese"],
  mozzarella: ["mozzarella"],
  feta: ["feta"],
  "parmezaanse kaas": ["parmesan", "parmesan cheese"],
  roomkaas: ["cream cheese"],
  brie: ["brie"],
  halloumi: ["halloumi"],

  ricotta: ["ricotta"],
  // ── Cold cuts and spreads
  ham: { names: ["ham"], variants: { rauw: ["cured ham", "raw ham"], gekookt: ["cooked ham"] } },
  "kipfilet beleg": ["sliced chicken breast", "sliced chicken", "chicken cold cuts"],
  salami: ["salami"],
  cervelaat: ["cervelat", "cervelat sausage"],
  "filet americain": ["filet americain", "steak tartare spread"],
  leverworst: ["liverwurst", "liver sausage"],
  hummus: ["hummus"],
  knakworst: ["hot dogs", "hot dog sausages", "frankfurters", "wieners"],
  grillworst: ["grill sausage"],
  boterhamworst: ["luncheon meat", "bologna"],

  // ── Bread
  brood: { names: ["bread"], variants: {
    volkoren: ["whole wheat bread", "wholemeal bread"], meergranen: ["multigrain bread"],
    bruin: ["brown bread", "wheat bread"], wit: ["white bread"] } },
  stokbrood: ["baguette", "baguettes", "french bread"],
  afbakbroodjes: ["bake-at-home rolls", "part-baked rolls"],
  bolletjes: ["bread rolls", "rolls", "buns"],
  "tortilla's": ["tortillas"],
  pitabroodjes: ["pita bread", "pitas", "pita", "naan bread"],
  croissants: ["croissant"],
  beschuit: ["rusks", "dutch rusks"],
  crackers: ["cracker"],
  roggebrood: ["rye bread", "dark rye bread", "pumpernickel"],

  // ── Pantry
  rijst: { names: ["rice"], variants: {
    basmati: ["basmati rice"], pandan: ["jasmine rice", "pandan rice"], zilvervlies: ["brown rice"],
    risotto: ["risotto rice", "arborio rice"], langgraan: ["long-grain rice"] } },
  pasta: { names: ["pasta"], variants: {
    spaghetti: ["spaghetti"], penne: ["penne"], macaroni: ["macaroni"], fusilli: ["fusilli"], tagliatelle: ["tagliatelle"],
    lasagne: ["lasagna noodles", "lasagna sheets", "lasagne sheets"], tortellini: ["tortellini"] } },
  mie: ["noodles", "egg noodles"],
  couscous: ["couscous"],
  quinoa: ["quinoa"],
  havermout: ["oats", "rolled oats", "oatmeal", "porridge oats"],
  muesli: ["muesli"],
  cornflakes: ["cornflakes"],
  bloem: ["flour", "all-purpose flour", "plain flour", "wheat flour"],
  "zelfrijzend bakmeel": ["self-rising flour", "self-raising flour"],
  pannenkoekmix: ["pancake mix"],
  maizena: ["cornstarch", "cornflour", "corn starch"],
  paneermeel: ["breadcrumbs", "bread crumbs", "panko"],
  suiker: { names: ["sugar"], variants: {
    kristal: ["granulated sugar"], basterd: ["brown sugar", "soft brown sugar"],
    poeder: ["powdered sugar", "icing sugar", "confectioners sugar"], riet: ["cane sugar"] } },
  vanillesuiker: ["vanilla sugar"],
  bakpoeder: ["baking powder"],
  gist: ["yeast"],
  olijfolie: { names: ["olive oil"], variants: {
    "extra vierge": ["extra virgin olive oil"], mild: ["mild olive oil", "light olive oil"] } },
  zonnebloemolie: ["sunflower oil"],
  azijn: ["vinegar"],
  mayonaise: ["mayonnaise", "mayo"],
  ketchup: ["ketchup"],
  mosterd: ["mustard"],
  sojasaus: ["soy sauce", "kecap manis"],
  pindasaus: ["peanut sauce", "satay sauce"],
  pesto: ["pesto"],
  pastasaus: ["pasta sauce", "marinara sauce", "spaghetti sauce"],
  bouillon: ["broth", "stock", "stock cubes", "bouillon cubes"],
  zout: ["salt"],
  "zwarte peper": ["black pepper", "ground black pepper"],
  pindakaas: { names: ["peanut butter"], variants: {
    stukjes: ["crunchy peanut butter", "chunky peanut butter"], naturel: ["smooth peanut butter", "creamy peanut butter"] } },
  jam: ["jam", "preserves"],
  hagelslag: ["hagelslag", "chocolate sprinkles", "sprinkles"],
  honing: ["honey"],
  chocoladepasta: ["chocolate spread"],
  currysaus: ["curry ketchup", "curry sauce"],
  kidneybonen: ["kidney beans"],
  "bruine bonen": ["brown beans"],
  "witte bonen": ["white beans", "navy beans", "cannellini beans"],
  kikkererwten: ["chickpeas", "chickpea", "garbanzo beans"],
  linzen: ["lentils"],
  augurken: ["pickles", "gherkins", "pickled cucumbers"],
  olijven: ["olives"],
  "pinda's": ["peanuts"],
  noten: ["nuts", "mixed nuts"],
  kerrie: ["curry powder"],
  paprikapoeder: ["paprika powder", "ground paprika"],
  kaneel: ["cinnamon"],
  sambal: ["sambal", "chili paste", "sambal oelek"],
  "zwarte bonen": ["black beans"],
  sesamzaad: ["sesame seeds"],
  oregano: ["oregano", "dried oregano"],
  nootmuskaat: ["nutmeg", "mace"],
  bladerdeeg: ["puff pastry"],
  sriracha: ["sriracha", "sriracha sauce"],
  knoflooksaus: ["garlic sauce"],
  appelstroop: ["apple syrup", "apple butter"],

  // ── Drinks
  koffie: { names: ["coffee"], variants: {
    bonen: ["coffee beans", "whole bean coffee"], pads: ["coffee pads"], cups: ["coffee capsules", "coffee pods"],
    oplos: ["instant coffee"], filter: ["ground coffee", "filter coffee"] } },
  thee: ["tea"],
  sinaasappelsap: ["orange juice"],
  appelsap: ["apple juice"],
  drinkyoghurt: ["drinking yogurt", "yogurt drink"],
  ijsthee: ["iced tea"],
  cola: { names: ["cola", "coke"], variants: { zero: ["diet cola", "diet coke", "coke zero"], regular: ["regular cola", "regular coke"] } },
  limonadesiroop: ["lemonade syrup", "cordial"],
  bier: { names: ["beer"], variants: { alcoholvrij: ["alcohol-free beer", "non-alcoholic beer"], pils: ["lager", "pilsner"] } },
  water: { names: ["water"], variants: { bruisend: ["sparkling water", "carbonated water"], plat: ["still water"] } },
  vruchtensap: { names: ["fruit juice", "juice", "juices"], variants: { nectar: ["fruit nectar", "nectar"], vers: ["fresh juice", "freshly squeezed juice"] } },
  frisdrank: { names: ["soft drink", "soft drinks", "fizzy drink", "lemonade"], variants: {
    energie: ["energy drink", "energy drinks"], sport: ["sports drink", "sports drinks"], zero: ["diet soda", "sugar-free soda"], gewoon: ["regular soda"] } },
  tonic: ["tonic water", "tonic"],

  // ── Meal kits
  maaltijdpakket: { names: ["meal kit", "meal kits", "meal box"], variants: { vers: ["fresh meal kit"], houdbaar: ["dry meal kit", "boxed meal kit"] } },

  // ── Diet and sports food
  dieetvoeding: { names: ["diet food", "sports nutrition", "protein"], variants: {
    reep: ["protein bar", "protein bars"], drank: ["protein shake", "protein drink"], poeder: ["protein powder", "whey"] } },

  // ── Pets
  kattenvoer: { names: ["cat food"], variants: { snack: ["cat treats"], nat: ["wet cat food"], droog: ["dry cat food", "cat kibble"] } },
  hondenvoer: { names: ["dog food"], variants: { snack: ["dog treats", "dog chews"], nat: ["wet dog food"], droog: ["dry dog food", "dog kibble"] } },

  // ── Snacks, biscuits and sweets
  chips: { names: ["chips", "crisps", "potato chips"], variants: { paprika: ["paprika chips"], naturel: ["salted chips", "plain chips", "ready salted crisps"] } },
  zoutjes: ["savory snacks", "salty snacks", "snack mix", "pretzels"],
  popcorn: ["popcorn"],
  kroepoek: ["prawn crackers", "shrimp chips", "krupuk"],
  drop: ["licorice", "liquorice"],
  kauwgom: ["chewing gum", "gum", "bubble gum"],
  winegums: ["wine gums", "gummies", "gummy candy"],
  chocolade: { names: ["chocolate", "chocolate bar"], variants: { puur: ["dark chocolate"], wit: ["white chocolate"], melk: ["milk chocolate"] } },
  koekjes: ["cookies", "biscuits", "cookie"],
  stroopwafels: ["stroopwafels", "syrup waffles", "caramel waffles"],
  speculaas: ["speculoos", "windmill cookies"],
  ontbijtkoek: ["breakfast cake", "dutch spice cake", "gingerbread"],

  // ── Ready to heat
  pizza: { names: ["pizza", "pizzas"], variants: { diepvries: ["frozen pizza"], gekoeld: ["fresh pizza", "chilled pizza"] } },
  "saté": { names: ["satay", "satay skewers"], variants: { kip: ["chicken satay"], varken: ["pork satay"], vega: ["vegetarian satay", "vegan satay"] } },
  soep: { names: ["soup"], variants: { tomaat: ["tomato soup"], kip: ["chicken soup"], erwten: ["pea soup", "split pea soup"],
    champignon: ["mushroom soup"], uien: ["onion soup"], groente: ["vegetable soup"] } },
  frikandellen: ["frikandel", "frikandellen", "frikandel sausages"],
  kroketten: ["croquettes", "croquette", "kroket"],
  bitterballen: ["bitterballen", "bitterbal", "dutch meatballs"],
  "loempia's": ["spring rolls", "egg rolls", "loempia"],
  "mini loempia's": ["mini spring rolls", "mini egg rolls"],
  pannenkoeken: ["pancakes", "dutch pancakes"],
  poffertjes: ["poffertjes", "mini pancakes"],
  gnocchi: ["gnocchi"],
  ijs: ["ice cream"],
};

/**
 * An Ingredient's names in English, and each of its Variants', or null where
 * none is given. A flavour named nowhere above is its flavour's English word
 * before the Ingredient's name: "strawberry yogurt".
 */
export function englishOf(id: string): { names: Names; variants: Readonly<Record<string, Names>> } | null {
  const t = ENGLISH[id];
  if (!t) return null;
  const own = "names" in t ? t : { names: t as Names, variants: {} };
  const flavours = (VOCABULARY.find((d) => d.id === id)?.variants ?? []).filter((v) => v.aspect === "smaak" && !own.variants[v.id]);
  if (!flavours.length) return own;
  return { names: own.names, variants: { ...own.variants, ...Object.fromEntries(flavours.map((v) => [v.id, [`${FLAVOURS[v.id]!.en} ${own.names[0]}`] as Names])) } };
}
