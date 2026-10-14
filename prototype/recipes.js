// The recipes (#20), as data: see docs/adr/0007-recipes-are-ours-or-wikibooks.md.
//
// Each Requirement is written as a shopper would type it and read through the
// Ingredient vocabulary, so the page costs a recipe like a Basket, and a
// Correction made on the list holds in every recipe that needs it. Every
// Requirement must name an Ingredient the vocabulary knows; test/recipes.test.ts
// checks that. Pantry basics are listed apart and not priced.
//
// `source` is "own" (written for mealdeal, reviewed by the project owner) or
// a Wikibooks Kookboek page adapted under CC BY-SA 4.0, with its title, URL and
// the revision adapted, which the page credits wherever the recipe is shown.
//
// A plain script, like catalogue.js, so the page still works opened from disk.
window.RECIPES = [
  { id: "andijvie", name: "Andijviestamppot met rookworst", persons: 4, minutes: 30, source: "own",
    requirements: ["1 kg kruimige aardappelen", "500 g andijvie", "275 g rookworst", "250 ml halfvolle melk", "500 g uien"],
    pantry: ["boter", "zout", "peper"],
    steps: [
      "Schil de aardappelen, snijd ze in gelijke stukken en kook ze in ongeveer 20 minuten gaar in water met een snuf zout.",
      "Leg intussen de rookworst 20 minuten in heet water dat net niet meer kookt.",
      "Snipper een ui en bak hem in een klontje boter in 5 minuten zacht en goudgeel.",
      "Was de andijvie, laat hem goed uitlekken en snijd hem fijn.",
      "Giet de aardappelen af en stamp ze fijn met de warme melk en een klontje boter.",
      "Schep de rauwe andijvie en de gebakken ui erdoor en breng op smaak met zout en peper. Serveer met de rookworst in plakken."] },

  { id: "boerenkool", name: "Boerenkoolstamppot met spekjes", persons: 4, minutes: 35, source: "own",
    requirements: ["1 kg kruimige aardappelen", "500 g boerenkool", "200 g spekblokjes", "275 g rookworst", "250 ml halfvolle melk"],
    pantry: ["boter", "zout", "peper", "mosterd"],
    steps: [
      "Schil de aardappelen en snijd ze in stukken. Leg ze in een grote pan, schep de boerenkool erbovenop en giet er water bij tot de aardappelen net onder staan.",
      "Breng aan de kook en laat met de deksel op de pan in 20 minuten gaar worden.",
      "Verwarm intussen de rookworst 20 minuten in heet water dat net niet kookt.",
      "Bak de spekblokjes in een droge koekenpan knapperig.",
      "Giet de aardappelen en boerenkool af en stamp alles fijn met de warme melk en een klontje boter.",
      "Schep de spekjes erdoor, breng op smaak met zout en peper en serveer met de rookworst en mosterd."] },

  { id: "hutspot", name: "Hutspot met speklappen", persons: 4, minutes: 40, source: "own",
    requirements: ["1 kg kruimige aardappelen", "1 kg wortelen", "500 g uien", "500 g speklappen"],
    pantry: ["boter", "zout", "peper"],
    steps: [
      "Schil de aardappelen en de wortelen en snijd ze in stukken. Pel de uien en snijd ze in parten.",
      "Doe aardappel, wortel en ui in een pan, giet er water bij tot alles net onder staat en kook het in 20 tot 25 minuten gaar.",
      "Bestrooi de speklappen met zout en peper en bak ze op middelhoog vuur in 10 tot 12 minuten bruin en knapperig, halverwege gekeerd.",
      "Giet de groente af en vang een kopje kookvocht op.",
      "Stamp alles grof met een klontje boter, met een scheutje kookvocht als het te droog is. Breng op smaak met zout en peper.",
      "Serveer de hutspot met de speklappen en het braadvet uit de pan."] },

  { id: "hachee", name: "Hachee met rode kool", persons: 4, minutes: 150, source: "own",
    requirements: ["750 g stoofvlees", "1 kg uien", "1 kg kruimige aardappelen", "500 g rode kool"],
    pantry: ["boter", "2 el bloem", "2 laurierblaadjes", "4 kruidnagels", "2 el azijn", "1 bouillonblokje", "zout", "peper"],
    steps: [
      "Snijd het stoofvlees in grote blokken, bestrooi met zout en peper en wentel het door de bloem.",
      "Bak het vlees in een braadpan met een flinke klont boter in porties rondom bruin. Haal het eruit.",
      "Snijd de uien in halve ringen en bak ze in dezelfde pan in 10 minuten bruin.",
      "Doe het vlees terug, met de laurier, kruidnagels, azijn, het bouillonblokje en 500 ml water. Laat met de deksel op de pan 2 uur heel zachtjes stoven.",
      "Kook de rode kool het laatste halfuur met een bodempje water en een klontje boter in ongeveer 20 minuten gaar.",
      "Schil de aardappelen en kook ze in 20 minuten gaar.",
      "Vis de laurier en kruidnagels uit de hachee en serveer met de aardappelen en de rode kool."] },

  { id: "zuurkool", name: "Zuurkoolstamppot met spekjes", persons: 4, minutes: 35, source: "own",
    requirements: ["1 kg kruimige aardappelen", "500 g zuurkool", "200 g spekblokjes", "250 ml halfvolle melk", "500 g uien"],
    pantry: ["boter", "zout", "peper"],
    steps: [
      "Schil de aardappelen, snijd ze in stukken en kook ze in 20 minuten gaar.",
      "Laat de zuurkool uitlekken en verwarm hem met een bodempje water in 15 minuten door.",
      "Snipper een ui en bak hem met de spekblokjes in 8 minuten goudbruin.",
      "Giet de aardappelen af en stamp ze met de warme melk en een klontje boter.",
      "Schep de zuurkool, de spekjes en de ui erdoor en breng op smaak met peper en een snuf zout."] },

  { id: "witlof", name: "Witlof met ham en kaas uit de oven", persons: 4, minutes: 50, source: "own",
    requirements: ["1 kg witlof", "200 g gekookte ham", "150 g geraspte kaas", "1 kg kruimige aardappelen", "250 ml halfvolle melk"],
    pantry: ["boter", "zout", "peper", "nootmuskaat"],
    steps: [
      "Verwarm de oven voor op 200 °C. Schil de aardappelen en kook ze in 20 minuten gaar.",
      "Snijd een dun plakje van de onderkant van elke witlofstronk en hol het harde kegeltje een beetje uit. Kook de stronken 8 minuten en laat ze goed uitlekken.",
      "Stamp de aardappelen met de warme melk en een klontje boter tot puree en breng op smaak met zout, peper en nootmuskaat.",
      "Rol elke witlofstronk in een plak ham.",
      "Schep de puree in een ingevette ovenschaal, leg de witlofrolletjes erop en strooi de kaas erover.",
      "Bak 20 minuten in de oven tot de kaas goudbruin is."] },

  { id: "spruitjes", name: "Spruitjes met gehaktbal en puree", persons: 4, minutes: 45, source: "own",
    requirements: ["750 g spruiten", "1 kg kruimige aardappelen", "500 g rundergehakt", "250 ml halfvolle melk"],
    pantry: ["boter", "zout", "peper", "1 ei", "paneermeel"],
    steps: [
      "Meng het gehakt met het ei, 2 eetlepels paneermeel, zout en peper en draai er 4 ballen van.",
      "Bak de gehaktballen rondom bruin in een flinke klont boter. Zet het vuur laag en laat ze met de deksel op de pan 20 minuten garen.",
      "Schil de aardappelen en kook ze in ongeveer 20 minuten gaar.",
      "Maak de spruiten schoon, snijd een kruisje in de steel en kook ze 8 tot 10 minuten.",
      "Giet de aardappelen af en stamp ze met de warme melk en een klontje boter tot een gladde puree.",
      "Serveer de puree met de spruiten, de gehaktballen en de jus uit de pan."] },

  { id: "bloemkool", name: "Bloemkool met kaassaus en aardappelen", persons: 4, minutes: 35, source: "own",
    requirements: ["1 bloemkool", "500 ml halfvolle melk", "150 g belegen kaas", "1 kg kruimige aardappelen"],
    pantry: ["30 g boter", "3 el bloem", "zout", "peper", "nootmuskaat"],
    steps: [
      "Schil de aardappelen en kook ze in ongeveer 20 minuten gaar.",
      "Snijd de bloemkool in roosjes en kook ze in 8 minuten beetgaar.",
      "Smelt de boter in een steelpan, roer de bloem erdoor en laat dit 1 minuut zachtjes garen.",
      "Voeg al roerend scheutje voor scheutje de melk toe tot je een gladde saus hebt.",
      "Rasp de kaas erin en laat smelten. Breng op smaak met zout, peper en een snufje nootmuskaat.",
      "Giet de kaassaus over de bloemkool en serveer met de aardappelen."] },

  { id: "zalm", name: "Zalm uit de oven met broccoli en krieltjes", persons: 4, minutes: 35, source: "own",
    requirements: ["500 g zalmfilet", "750 g krieltjes", "500 g broccoli", "1 citroen"],
    pantry: ["olijfolie", "zout", "peper", "gedroogde tijm"],
    steps: [
      "Verwarm de oven voor op 200 °C. Halveer de krieltjes, meng ze met een scheut olijfolie, zout, peper en tijm en verdeel ze over een bakplaat.",
      "Rooster de krieltjes 15 minuten.",
      "Snijd de broccoli in roosjes, schep ze met een beetje olie door de krieltjes en rooster nog 5 minuten.",
      "Leg de zalm tussen de groente, bestrooi met zout en peper en leg er een paar plakjes citroen op.",
      "Bak alles nog 12 tot 15 minuten, tot de zalm net gaar is en uit elkaar valt.",
      "Knijp de rest van de citroen erover uit voor het serveren."] },

  { id: "pesto", name: "Spaghetti pesto met broccoli", persons: 4, minutes: 20, source: "own",
    requirements: ["500 g spaghetti", "185 g pesto", "500 g broccoli", "150 g belegen kaas"],
    pantry: ["zout"],
    steps: [
      "Breng een grote pan water met een flinke snuf zout aan de kook en kook de spaghetti volgens de verpakking.",
      "Snijd de broccoli in kleine roosjes en kook ze de laatste 4 minuten mee met de pasta.",
      "Schep een kopje kookwater apart en giet de pasta en broccoli af.",
      "Meng de pesto erdoor, met een scheutje kookwater voor een smeuïge saus.",
      "Snijd de kaas in reepjes en strooi die over de pasta."] },

  { id: "bolognese", name: "Spaghetti bolognese", persons: 4, minutes: 45, source: "own",
    requirements: ["500 g spaghetti", "500 g rundergehakt", "500 g passata", "70 g tomatenpuree", "500 g wortelen", "500 g uien", "50 g parmezaanse kaas"],
    pantry: ["olijfolie", "2 tenen knoflook", "gedroogde oregano", "zout", "peper"],
    steps: [
      "Snipper een ui en de knoflook en rasp twee wortels grof.",
      "Bak het gehakt rul in een scheut olijfolie in een ruime pan. Bak ui, knoflook en wortel 5 minuten mee.",
      "Roer de tomatenpuree erdoor en bak 1 minuut, tot het donkerder wordt.",
      "Voeg de passata, een theelepel oregano en een half glas water toe en laat de saus 25 minuten zachtjes pruttelen. Breng op smaak met zout en peper.",
      "Kook intussen de spaghetti volgens de verpakking in water met zout.",
      "Serveer de saus over de spaghetti en rasp de parmezaanse kaas erover."] },

  { id: "lasagne", name: "Lasagne met gehakt en courgette", persons: 4, minutes: 75, source: "own",
    requirements: ["250 g lasagnebladen", "500 g half-om-half gehakt", "500 g passata", "1 courgette", "500 g uien", "500 ml halfvolle melk", "150 g geraspte kaas"],
    pantry: ["olijfolie", "40 g boter", "4 el bloem", "gedroogde oregano", "nootmuskaat", "zout", "peper"],
    steps: [
      "Verwarm de oven voor op 190 °C. Snipper een ui en snijd de courgette in kleine blokjes.",
      "Bak het gehakt rul in een scheut olijfolie, bak de ui en de courgette 5 minuten mee en voeg de passata en een theelepel oregano toe. Laat 10 minuten pruttelen en breng op smaak met zout en peper.",
      "Smelt de boter in een steelpan, roer de bloem erdoor en voeg al roerend de melk toe tot een gladde, dikke saus. Breng op smaak met zout en nootmuskaat.",
      "Schep een dun laagje gehaktsaus in een ovenschaal. Leg er lasagnebladen op, dan gehaktsaus, dan witte saus. Herhaal tot alles op is en eindig met witte saus.",
      "Strooi de geraspte kaas erover en bak de lasagne 35 minuten in de oven, tot de bladen gaar zijn en de bovenkant goudbruin is.",
      "Laat 5 minuten rusten voordat je hem aansnijdt."] },

  { id: "macaroni", name: "Macaroni met ham en kaas", persons: 4, minutes: 30, source: "own",
    requirements: ["400 g macaroni", "200 g gekookte ham", "400 g tomatenblokjes", "1 rode paprika", "500 g uien", "150 g geraspte kaas"],
    pantry: ["olie", "gedroogde Italiaanse kruiden", "zout", "peper"],
    steps: [
      "Kook de macaroni volgens de verpakking in water met zout.",
      "Snipper een ui, snijd de paprika in blokjes en de ham in reepjes.",
      "Bak de ui en de paprika 5 minuten in een scheutje olie. Voeg de tomatenblokjes en een theelepel kruiden toe en laat 5 minuten pruttelen.",
      "Roer de ham erdoor en breng de saus op smaak met zout en peper.",
      "Meng de saus met de afgegoten macaroni en strooi de kaas erover. Laat even staan tot de kaas smelt, of zet de pan 10 minuten in een oven van 200 °C."] },

  { id: "chili", name: "Chili con carne met rijst", persons: 4, minutes: 40, source: "own",
    requirements: ["500 g rundergehakt", "400 g kidneybonen", "400 g tomatenblokjes", "1 rode paprika", "300 g mais uit blik", "500 g uien", "300 g langgraanrijst"],
    pantry: ["olie", "2 tenen knoflook", "1 tl komijn", "1 tl paprikapoeder", "chilipoeder", "zout"],
    steps: [
      "Kook de rijst volgens de verpakking.",
      "Snipper een ui en de knoflook en snijd de paprika in blokjes.",
      "Bak het gehakt rul in een scheutje olie. Bak ui, knoflook en paprika 5 minuten mee, met de komijn, het paprikapoeder en chilipoeder naar smaak.",
      "Spoel de bonen en de mais af en laat ze uitlekken.",
      "Voeg tomatenblokjes, bonen en mais toe en laat 15 minuten zachtjes pruttelen. Breng op smaak met zout.",
      "Serveer de chili met de rijst."] },

  { id: "wraps", name: "Wraps met gehakt, paprika en avocado", persons: 4, minutes: 25, source: "own",
    requirements: ["8 tortilla's", "500 g rundergehakt", "500 g puntpaprika", "2 avocado's", "500 g uien"],
    pantry: ["olie", "zout", "peper", "paprikapoeder"],
    steps: [
      "Snipper een ui en snijd de puntpaprika in reepjes.",
      "Verhit een scheutje olie in een koekenpan en bak het gehakt rul. Breng op smaak met zout, peper en een theelepel paprikapoeder.",
      "Bak de ui en de paprika 5 minuten mee tot ze zacht zijn.",
      "Halveer de avocado's, haal de pit eruit en snijd het vruchtvlees in plakjes.",
      "Verwarm de tortilla's een halve minuut per stuk in een droge koekenpan.",
      "Vul de wraps met het gehaktmengsel en de avocado, vouw de onderkant om en rol ze op."] },

  { id: "nasi", name: "Nasi goreng met kip", persons: 4, minutes: 35, source: "own",
    requirements: ["300 g pandanrijst", "400 g kipfilet", "300 g prei", "500 g wortelen", "4 eieren"],
    pantry: ["olie", "3 el ketjap", "1 tl sambal", "2 tenen knoflook", "zout"],
    steps: [
      "Kook de rijst volgens de verpakking, spoel hem af met koud water en laat hem goed uitlekken. Rijst van een dag eerder is nog beter.",
      "Snijd de kip in blokjes, de prei in ringen en twee wortels in dunne reepjes.",
      "Bak de kip in een wok of ruime pan met een scheut olie in 5 minuten gaar. Haal hem eruit.",
      "Roerbak de knoflook, prei en wortel 4 minuten. Voeg de rijst toe en bak op hoog vuur 5 minuten mee.",
      "Schep de kip erdoor met de ketjap en sambal naar smaak en breng op smaak met zout.",
      "Bak de eieren in een koekenpan en leg op elk bord een gebakken ei op de nasi."] },

  { id: "kerrie", name: "Kip kerrie met sperziebonen", persons: 4, minutes: 35, source: "own",
    requirements: ["500 g kipdijfilet", "400 ml kokosmelk", "400 g sperziebonen", "500 g uien", "300 g basmatirijst"],
    pantry: ["olie", "2 el kerriepoeder", "1 bouillonblokje", "zout"],
    steps: [
      "Kook de rijst volgens de verpakking.",
      "Snijd de kip in stukken en een ui in halve ringen. Haal de puntjes van de sperziebonen en halveer ze.",
      "Bak de kip in een scheut olie rondom bruin. Bak de ui 3 minuten mee en roer de kerrie erdoor.",
      "Voeg de kokosmelk en het verkruimelde bouillonblokje toe en laat 10 minuten zachtjes koken.",
      "Kook intussen de sperziebonen in 6 tot 8 minuten beetgaar en schep ze door de kerrie.",
      "Breng op smaak met zout en serveer met de rijst."] },

  { id: "mie", name: "Mie met kip en roerbakgroente", persons: 4, minutes: 20, source: "own",
    requirements: ["250 g mie", "400 g kipdijfilet", "600 g roerbakgroente", "200 g pindasaus"],
    pantry: ["olie", "2 el sojasaus"],
    steps: [
      "Kook of week de mie volgens de verpakking en laat hem uitlekken.",
      "Snijd de kip in reepjes en roerbak ze in een wok met een scheut olie in 5 minuten gaar.",
      "Voeg de roerbakgroente toe en roerbak 3 tot 4 minuten op hoog vuur, zodat de groente knapperig blijft.",
      "Schep de mie en de sojasaus erdoor en bak nog 2 minuten.",
      "Verwarm de pindasaus met een scheutje water en serveer hem erbij."] },

  { id: "shakshuka", name: "Shakshuka met feta en brood", persons: 4, minutes: 30, source: "own",
    requirements: ["8 eieren", "800 g tomatenblokjes", "2 rode paprika", "500 g uien", "200 g feta", "1 stokbrood"],
    pantry: ["olijfolie", "2 tenen knoflook", "1 tl komijn", "1 tl paprikapoeder", "zout", "peper"],
    steps: [
      "Snipper een ui en de knoflook en snijd de paprika in reepjes.",
      "Bak ui, knoflook en paprika in een ruime koekenpan met een scheut olijfolie in 8 minuten zacht. Roer de komijn en het paprikapoeder erdoor.",
      "Voeg de tomatenblokjes toe en laat de saus 10 minuten indikken. Breng op smaak met zout en peper.",
      "Maak met een lepel 8 kuiltjes in de saus en breek in elk kuiltje een ei.",
      "Leg de deksel op de pan en laat de eieren 6 tot 8 minuten garen, tot het eiwit gestold is en de dooier nog zacht.",
      "Verkruimel de feta erover en eet het uit de pan met het stokbrood."] },

  { id: "risotto", name: "Risotto met champignons en prei", persons: 4, minutes: 40, source: "own",
    requirements: ["300 g risottorijst", "400 g kastanjechampignons", "300 g prei", "500 g uien", "75 g parmezaanse kaas"],
    pantry: ["olijfolie", "boter", "2 bouillonblokjes", "zout", "peper"],
    steps: [
      "Los de bouillonblokjes op in 1,2 liter heet water en houd de bouillon warm.",
      "Snipper een ui, snijd de prei in dunne ringen en de champignons in plakjes.",
      "Bak de champignons in een scheut olijfolie op hoog vuur bruin. Haal ze eruit.",
      "Fruit ui en prei 4 minuten in een klontje boter, voeg de rijst toe en roer tot de korrels glazig zijn.",
      "Voeg een soeplepel bouillon toe en roer tot hij is opgenomen. Herhaal ongeveer 20 minuten, tot de rijst romig en net gaar is.",
      "Roer de champignons, een klontje boter en de geraspte parmezaanse kaas erdoor en breng op smaak met zout en peper."] },

  { id: "groentecurry", name: "Groentecurry met kikkererwten en spinazie", persons: 4, minutes: 35, source: "own",
    requirements: ["500 g zoete aardappelen", "400 g kikkererwten", "400 ml kokosmelk", "400 g tomatenblokjes", "300 g spinazie", "500 g uien", "300 g zilvervliesrijst"],
    pantry: ["olie", "2 el kerriepoeder", "2 tenen knoflook", "zout"],
    steps: [
      "Kook de rijst volgens de verpakking.",
      "Schil de zoete aardappelen en snijd ze in blokjes van 2 cm. Snipper een ui en de knoflook.",
      "Fruit ui en knoflook in een scheut olie, roer de kerrie erdoor en bak 1 minuut.",
      "Voeg zoete aardappel, tomatenblokjes en kokosmelk toe en laat 15 minuten zachtjes koken tot de aardappel gaar is.",
      "Spoel de kikkererwten af en roer ze erdoor. Laat de spinazie in porties in de curry slinken.",
      "Breng op smaak met zout en serveer met de rijst."] },

  { id: "couscous", name: "Couscous met kip en geroosterde groente", persons: 4, minutes: 40, source: "own",
    requirements: ["300 g couscous", "400 g kipfilet", "1 courgette", "1 aubergine", "1 rode paprika", "500 g uien", "200 g feta"],
    pantry: ["olijfolie", "1 tl komijn", "1 tl paprikapoeder", "1 bouillonblokje", "zout", "peper"],
    steps: [
      "Verwarm de oven voor op 210 °C. Snijd courgette, aubergine, paprika en een rode ui in stukken van 2 cm.",
      "Meng de groente met een flinke scheut olijfolie, de komijn, zout en peper en rooster 25 minuten op een bakplaat, halverwege omgeschept.",
      "Snijd de kip in reepjes, bestrooi met paprikapoeder en zout en bak ze in 6 minuten gaar.",
      "Los het bouillonblokje op in 350 ml heet water, giet het over de couscous en laat 5 minuten afgedekt staan. Maak hem los met een vork.",
      "Schep de groente en de kip door de couscous en verkruimel de feta erover."] },

  { id: "pompoen", name: "Romige pompoensoep", persons: 4, minutes: 40, source: "own",
    requirements: ["1 pompoen", "500 g uien", "500 g wortelen", "250 ml kookroom"],
    pantry: ["olie", "2 bouillonblokjes", "zout", "peper"],
    steps: [
      "Halveer de pompoen, schep de pitten eruit en snijd hem in blokjes. Een oranje pompoen hoef je niet te schillen.",
      "Snipper een ui en snijd de wortelen in plakjes.",
      "Fruit de ui 3 minuten in een soeppan met een scheutje olie. Voeg pompoen en wortel toe en bak 5 minuten mee.",
      "Voeg 1 liter water en de bouillonblokjes toe en laat 25 minuten zachtjes koken.",
      "Pureer de soep glad met een staafmixer en roer de kookroom erdoor.",
      "Breng op smaak met zout en peper en warm nog even door."] },

  { id: "linzensoep", name: "Linzensoep met wortel en tomaat", persons: 4, minutes: 40, source: "own",
    requirements: ["250 g linzen", "500 g wortelen", "500 g uien", "400 g tomatenblokjes", "1 stokbrood"],
    pantry: ["olijfolie", "2 tenen knoflook", "1 tl komijn", "2 bouillonblokjes", "zout", "peper"],
    steps: [
      "Snipper een ui en de knoflook en snijd drie wortels in kleine blokjes.",
      "Fruit ui, knoflook en wortel 5 minuten in een soeppan met een scheut olijfolie. Roer de komijn erdoor.",
      "Spoel de linzen af in een zeef en voeg ze toe met de tomatenblokjes, de bouillonblokjes en 1,2 liter water.",
      "Laat 25 minuten zachtjes koken, tot de linzen zacht zijn.",
      "Pureer de soep half, zodat er nog stukjes in zitten, en breng op smaak met zout en peper. Serveer met het stokbrood."] },

  { id: "pannenkoeken", name: "Pannenkoeken met spek en appel", persons: 4, minutes: 40, source: "own",
    requirements: ["400 g zelfrijzend bakmeel", "750 ml halfvolle melk", "3 eieren", "200 g ontbijtspek", "500 g appels"],
    pantry: ["boter", "zout", "stroop of poedersuiker"],
    steps: [
      "Doe het meel met een snuf zout in een kom, maak een kuiltje en breek de eieren erin.",
      "Klop met een garde de helft van de melk erdoor tot een glad beslag en roer dan de rest erdoor. Laat 15 minuten rusten.",
      "Schil de appels, haal het klokhuis eruit en snijd ze in dunne plakjes.",
      "Smelt een klontje boter in een koekenpan, leg er een paar plakjes spek of appel in en bak ze 1 minuut.",
      "Giet er een dun laagje beslag over en bak de pannenkoek tot de bovenkant droog is. Keer hem en bak de andere kant goudbruin.",
      "Houd de pannenkoeken warm onder een deksel tot alles op is en eet ze met stroop of poedersuiker."] },

  // Adapted from Wikibooks (CC BY-SA 4.0): the adapted text of these two, and
  // only it, is CC BY-SA 4.0 in turn. Wine and bonenkruid are not Ingredients
  // the vocabulary knows, so they moved to the pantry as optional.
  { id: "wittebonensoep", name: "Mediterrane witte bonensoep", persons: 6, minutes: 135,
    source: { kind: "wikibooks", title: "Mediterrane witte bonensoep", url: "https://nl.wikibooks.org/wiki/Kookboek/Mediterrane_witte_bonensoep", revision: 426938 },
    requirements: ["400 g stoofvlees", "100 g spekblokjes", "500 g uien", "4 rode paprika", "700 g tomaten", "800 g witte bonen", "1 stokbrood"],
    pantry: ["olijfolie", "3 tenen knoflook", "1 el paprikapoeder", "takje rozemarijn", "2 laurierblaadjes", "3 tl bonenkruid (als je het hebt)", "250 ml rode wijn (of extra bouillon)", "2 bouillonblokjes", "zout", "peper", "peterselie (als je het hebt)"],
    steps: [
      "Pel twee uien en snijd ze in grove stukken. Verwijder de zaadlijsten uit de paprika's en snijd ze in stukken. Ontvel de tomaten, haal de zaadjes eruit en snijd ze grof. Snijd de knoflook fijn.",
      "Bak de ui in een ruime pan met dikke bodem glazig in wat olijfolie en zet hem apart. Bak daarna de paprika kort aan en zet die ook apart.",
      "Bak het vlees in een beetje extra olie rondom bruin. Bak de spekblokjes en de knoflook even mee en blus af met de rode wijn, of met een scheut bouillon.",
      "Voeg de bouillonblokjes met 1 liter water, de tomaten, rozemarijn, laurier, bonenkruid en paprikapoeder toe en laat ruim een uur heel zachtjes sudderen.",
      "Voeg de ui toe en een kwartier later de paprika, en laat mee stoven. Als het vlees bijna gaar is, gaan de uitgelekte witte bonen erbij: nog 15 tot 20 minuten, zonder ze stuk te koken. Voeg wat water toe als de soep te dik is.",
      "Breng op smaak met peper en zout, bestrooi met peterselie en eet de soep gloeiend heet met het stokbrood."] },

  { id: "preitaart", name: "Preitaart met ham en spek", persons: 6, minutes: 65,
    source: { kind: "wikibooks", title: "Preitaart", url: "https://nl.wikibooks.org/wiki/Kookboek/Preitaart", revision: 426655 },
    requirements: ["200 g bloem", "100 g roomboter", "5 eieren", "100 g uien", "500 g prei", "65 g spekblokjes", "175 g gekookte ham", "375 ml zure room", "150 g geraspte kaas"],
    pantry: ["zout", "1 el olie", "nootmuskaat", "kerriepoeder", "peper"],
    steps: [
      "Verwarm de oven voor op 200 °C. Kneed de bloem, de zachte boter, 2 eieren en een kwart theelepel zout tot een brokkelig deeg.",
      "Druk het deeg in stukjes in een ingevette taartvorm, zodat bodem en rand dicht zijn. Vul gaatjes en kieren op met deeg.",
      "Snipper de ui, snijd de prei in ringen en de ham in reepjes. Bak ui, prei, ham en spekblokjes 1 minuut op hoog vuur in de olie.",
      "Klop de zure room met de andere 3 eieren, de kaas, een snuf nootmuskaat en kerrie, zout en peper.",
      "Schep het preimengsel in de taartvorm en giet het kaasmengsel erover.",
      "Bak de taart 35 minuten in de oven, tot de vulling gestold en goudbruin is."] },
];
