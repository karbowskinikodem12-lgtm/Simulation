import type { IssueId } from '../engine/types';
import type { Lang } from '../i18n';

/** Phrase banks for the procedural platform writer. Buckets: very left, left, centre, right, very right. */
const PLATFORM_PHRASES_PL: Record<IssueId, [string[], string[], string[], string[], string[]]> = {
  economy: [
    ['Nowy Zielony Ład dla gospodarki: państwo jako główny inwestor i gwarant miejsc pracy.', 'Rozbicie monopoli Big Tech i korporacji, które dławią konkurencję.'],
    ['Inwestycje publiczne w infrastrukturę i przemysł przyszłości.', 'Gospodarka budowana od środka — od klasy średniej, nie od góry.'],
    ['Rozsądna równowaga między rynkiem a państwem, wsparcie dla małych firm.', 'Odpowiedzialny budżet i inwestycje tam, gdzie się zwracają.'],
    ['Deregulacja i mniej biurokracji, by firmy mogły rosnąć.', 'Wzrost gospodarczy napędzany przez sektor prywatny, nie urzędników.'],
    ['Likwidacja zbędnych agencji federalnych i radykalne cięcie regulacji.', 'Wolny rynek bez ingerencji Waszyngtonu.'],
  ],
  inflation: [
    ['Federalna kontrola cen żywności, czynszów i leków.', 'Podatek od nadmiarowych zysków koncernów windujących ceny.'],
    ['Walka z „chciwflacją”: kary za zmowy cenowe i dopłaty do czynszów.', 'Ulgi dla rodzin na koszty opieki nad dziećmi i energii.'],
    ['Obniżanie kosztów życia poprzez zwiększenie podaży mieszkań i energii.', 'Współpraca z Fed na rzecz stabilnych cen.'],
    ['Koniec z rozrzutnymi wydatkami, które napędzają inflację.', 'Tańsza energia z krajowych źródeł = niższe ceny w sklepach.'],
    ['Zrównoważony budżet zapisany w Konstytucji.', 'Drastyczne cięcie wydatków federalnych, by zdusić inflację.'],
  ],
  jobs: [
    ['Federalna gwarancja zatrudnienia i płaca minimalna 20 dolarów.', 'Pełne prawo do zrzeszania się w związkach zawodowych.'],
    ['Płaca minimalna 17 dolarów i wsparcie dla związków zawodowych.', 'Miejsca pracy w zielonej energii i przemyśle krajowym.'],
    ['Programy przekwalifikowania pracowników i ulgi dla firm zatrudniających lokalnie.', 'Ochrona amerykańskiego przemysłu przed nieuczciwą konkurencją.'],
    ['Ulgi podatkowe dla firm tworzących miejsca pracy w USA.', 'Ograniczenie przepisów, które utrudniają zatrudnianie.'],
    ['Prawo do pracy bez przymusu związkowego w całym kraju.', 'Likwidacja płacy minimalnej na poziomie federalnym.'],
  ],
  immigration: [
    ['Obywatelstwo dla wszystkich nieudokumentowanych imigrantów i likwidacja ICE.', 'Otwarte, humanitarne podejście do uchodźców.'],
    ['Ścieżka do obywatelstwa dla imigrantów przywiezionych do USA jako dzieci i ich rodzin.', 'Humanitarna reforma systemu azylowego.'],
    ['Kompleksowa reforma: bezpieczna granica i legalna droga dla pracowników.', 'Więcej sędziów imigracyjnych, szybsze procedury.'],
    ['Uszczelnienie granicy i dokończenie zapór.', 'Imigracja oparta na zasługach i potrzebach gospodarki.'],
    ['Masowe deportacje i koniec obywatelstwa z urodzenia.', 'Moratorium na imigrację do czasu pełnego zabezpieczenia granicy.'],
  ],
  taxes: [
    ['Podatek majątkowy od miliarderów i 70% stawka dla najbogatszych.', 'Koniec z rajami podatkowymi korporacji.'],
    ['Wyższe podatki dla zarabiających ponad 400 tys. dolarów rocznie.', 'Minimalny podatek od korporacji, by każdy płacił swoją część.'],
    ['Prostszy system podatkowy i ulgi dla klasy średniej.', 'Brak podwyżek podatków dla rodzin zarabiających poniżej 400 tys.'],
    ['Trwałe obniżki podatków dla rodzin i firm.', 'Niższy podatek od zysków kapitałowych, by pobudzić inwestycje.'],
    ['Podatek liniowy i likwidacja federalnego podatku od spadków.', 'Radykalne obniżenie wszystkich podatków federalnych.'],
  ],
  healthcare: [
    ['Medicare dla wszystkich — jednolity publiczny system zdrowia.', 'Darmowe leki na receptę dla wszystkich.'],
    ['Publiczna opcja ubezpieczenia i limit cen insuliny.', 'Rozszerzenie Obamacare i Medicaid.'],
    ['Naprawa Obamacare zamiast jej likwidacji, przejrzystość cen w szpitalach.', 'Obniżanie cen leków poprzez negocjacje.'],
    ['Więcej konkurencji wśród ubezpieczycieli i konta oszczędnościowe na zdrowie.', 'Zastąpienie Obamacare rozwiązaniami rynkowymi.'],
    ['Całkowite uchylenie Obamacare i deregulacja rynku zdrowia.', 'Opieka zdrowotna jako sprawa prywatna, nie federalna.'],
  ],
  security: [
    ['Przekierowanie funduszy policji na usługi społeczne.', 'Koniec masowego więzienictwa i wojny z narkotykami.'],
    ['Reforma policji, kamery na mundurach i powszechne sprawdzanie przeszłości przy zakupie broni.', 'Inwestycje w prewencję przemocy.'],
    ['Więcej funduszy dla policji połączone z odpowiedzialnością.', 'Bezpieczne ulice i sprawiedliwy wymiar sprawiedliwości.'],
    ['Pełne wsparcie dla policji i surowsze kary dla przestępców.', 'Obrona Drugiej Poprawki.'],
    ['Federalna ofensywa przeciw przestępczości i kartelom, z użyciem Gwardii Narodowej.', 'Brak jakichkolwiek ograniczeń w dostępie do broni.'],
  ],
  foreign: [
    ['Cięcie budżetu Pentagonu o połowę i koniec wojen za granicą.', 'Polityka zagraniczna oparta na prawach człowieka.'],
    ['Odbudowa sojuszy i przywództwo przez dyplomację.', 'Wspieranie demokracji we współpracy z partnerami z NATO.'],
    ['Silna armia i silne sojusze — pokój przez siłę i dyplomację.', 'Twarda, ale pragmatyczna postawa wobec Chin.'],
    ['Pokój przez siłę: modernizacja armii i twarde stanowisko wobec rywali.', '„Ameryka przede wszystkim” w handlu i dyplomacji.'],
    ['Wycofanie się z organizacji międzynarodowych i cła na wszystkich rywali.', 'Rekordowy budżet obronny i dominacja militarna.'],
  ],
  climate: [
    ['Zakaz szczelinowania i 100% czystej energii do 2035 r.', 'Klimatyczny stan wyjątkowy na poziomie federalnym.'],
    ['Ambitne cele klimatyczne i ulgi na pojazdy elektryczne.', 'Powrót do porozumienia paryskiego i inwestycje w OZE.'],
    ['„Wszystkie powyższe”: gaz, atom i odnawialne źródła energii.', 'Stopniowa transformacja bez uderzania w miejsca pracy.'],
    ['Niezależność energetyczna: wiercić, ile się da.', 'Koniec z regulacjami klimatycznymi duszącymi przemysł.'],
    ['Wyjście z porozumień klimatycznych i likwidacja EPA.', 'Pełne wsparcie dla węgla, ropy i gazu.'],
  ],
  social: [
    ['Kodyfikacja praw reprodukcyjnych i pełna ochrona osób LGBTQ+.', 'Reparacje i walka z systemowym rasizmem.'],
    ['Ochrona prawa do aborcji i równości małżeńskiej.', 'Walka z dyskryminacją w każdej formie.'],
    ['Szacunek dla różnych przekonań i umiarkowane podejście do sporów kulturowych.', 'Decyzje w sprawach sumienia pozostawione stanom.'],
    ['Obrona wolności religijnej i wartości rodzinnych.', 'Ograniczenie aborcji i ochrona praw rodziców.'],
    ['Federalny zakaz aborcji i ochrona tradycyjnego modelu rodziny.', 'Koniec z ideologizacją instytucji publicznych.'],
  ],
  education: [
    ['Darmowe studia publiczne i umorzenie wszystkich kredytów studenckich.', 'Powszechne przedszkola finansowane federalnie.'],
    ['Częściowe umorzenie długów studenckich i podwyżki dla nauczycieli.', 'Więcej funduszy dla szkół publicznych.'],
    ['Lepsze szkoły publiczne i rozwój szkolnictwa zawodowego.', 'Tańsze studia bez obciążania podatników.'],
    ['Wybór szkoły dla rodziców i rozwój szkół czarterowych.', 'Więcej kontroli lokalnej nad programem nauczania.'],
    ['Likwidacja Departamentu Edukacji i powszechne bony edukacyjne.', 'Pełna kontrola rodziców nad edukacją.'],
  ],
};

const PLATFORM_PHRASES_EN: Record<IssueId, [string[], string[], string[], string[], string[]]> = {
  economy: [
    ['A Green New Deal for the economy: government as lead investor and jobs guarantor.', 'Break up Big Tech and the corporations choking competition.'],
    ['Public investment in infrastructure and the industries of the future.', 'An economy built from the middle out, not the top down.'],
    ['A sensible balance between markets and government, with support for small business.', 'A responsible budget and investment where it pays off.'],
    ['Deregulation and less red tape so businesses can grow.', 'Growth driven by the private sector, not bureaucrats.'],
    ['Abolish unnecessary federal agencies and slash regulations.', 'A free market with no interference from Washington.'],
  ],
  inflation: [
    ['Federal price controls on food, rent and medicine.', 'A windfall tax on corporations driving up prices.'],
    ['Crack down on greedflation: penalties for price-fixing and rent support.', 'Tax credits for families on childcare and energy costs.'],
    ['Lower the cost of living by expanding housing and energy supply.', 'Work with the Fed for stable prices.'],
    ['End the reckless spending that fuels inflation.', 'Cheaper domestic energy means lower prices at the store.'],
    ['A balanced-budget amendment to the Constitution.', 'Drastic cuts to federal spending to crush inflation.'],
  ],
  jobs: [
    ['A federal jobs guarantee and a $20 minimum wage.', 'Full freedom to join a union.'],
    ['A $17 minimum wage and support for unions.', 'Jobs in clean energy and American manufacturing.'],
    ['Retraining programs and tax credits for hiring locally.', 'Protect American industry from unfair competition.'],
    ['Tax breaks for companies creating jobs in the USA.', 'Cut the rules that make hiring harder.'],
    ['Nationwide right-to-work laws.', 'Abolish the federal minimum wage.'],
  ],
  immigration: [
    ['Citizenship for all undocumented immigrants and abolish ICE.', 'An open, humane approach to refugees.'],
    ['A path to citizenship for Dreamers and immigrant families.', 'Humane reform of the asylum system.'],
    ['Comprehensive reform: a secure border and legal routes for workers.', 'More immigration judges, faster procedures.'],
    ['Secure the border and finish the barriers.', 'Merit-based immigration matched to the economy.'],
    ['Mass deportations and an end to birthright citizenship.', 'An immigration moratorium until the border is fully secure.'],
  ],
  taxes: [
    ['A wealth tax on billionaires and a 70% top rate.', 'End corporate tax havens.'],
    ['Higher taxes on incomes above $400,000.', 'A minimum corporate tax so everyone pays their share.'],
    ['A simpler tax code and relief for the middle class.', 'No tax hikes on families earning under $400,000.'],
    ['Permanent tax cuts for families and businesses.', 'Lower capital gains taxes to spur investment.'],
    ['A flat tax and abolishing the federal estate tax.', 'Radical cuts to all federal taxes.'],
  ],
  healthcare: [
    ['Medicare for All — a single public health system.', 'Free prescription drugs for everyone.'],
    ['A public option and a cap on insulin prices.', 'Expand Obamacare and Medicaid.'],
    ['Fix Obamacare instead of repealing it; hospital price transparency.', 'Lower drug prices through negotiation.'],
    ['More competition among insurers and health savings accounts.', 'Replace Obamacare with market-based solutions.'],
    ['Repeal Obamacare entirely and deregulate the health market.', 'Healthcare as a private matter, not a federal one.'],
  ],
  security: [
    ['Redirect police funding to social services.', 'End mass incarceration and the war on drugs.'],
    ['Police reform, body cameras and universal background checks.', 'Invest in violence prevention.'],
    ['More funding for police, paired with accountability.', 'Safe streets and a fair justice system.'],
    ['Full support for the police and tougher sentences.', 'Defend the Second Amendment.'],
    ['A federal offensive against crime and cartels using the National Guard.', 'No restrictions whatsoever on gun ownership.'],
  ],
  foreign: [
    ['Cut the Pentagon budget in half and end wars abroad.', 'A foreign policy grounded in human rights.'],
    ['Rebuild alliances and lead through diplomacy.', 'Support democracy together with NATO partners.'],
    ['A strong military and strong alliances — peace through strength and diplomacy.', 'A tough but pragmatic stance on China.'],
    ['Peace through strength: modernize the military and stand firm against rivals.', 'America First in trade and diplomacy.'],
    ['Withdraw from international organizations and tariff every rival.', 'A record defense budget and military dominance.'],
  ],
  climate: [
    ['Ban fracking and reach 100% clean energy by 2035.', 'A federal climate emergency.'],
    ['Ambitious climate targets and EV tax credits.', 'Rejoin the Paris Agreement and invest in renewables.'],
    ['All of the above: gas, nuclear and renewables.', 'A gradual transition that protects jobs.'],
    ['Energy independence: drill, baby, drill.', 'End the climate rules strangling industry.'],
    ['Exit climate agreements and abolish the EPA.', 'Full support for coal, oil and gas.'],
  ],
  social: [
    ['Codify reproductive rights and full protection for LGBTQ+ people.', 'Reparations and a fight against systemic racism.'],
    ['Protect abortion rights and marriage equality.', 'Fight discrimination in every form.'],
    ['Respect for different beliefs and a moderate approach to culture wars.', 'Leave matters of conscience to the states.'],
    ['Defend religious liberty and family values.', 'Limit abortion and protect parental rights.'],
    ['A federal abortion ban and protection of the traditional family.', 'End woke ideology in public institutions.'],
  ],
  education: [
    ['Free public college and cancel all student debt.', 'Federally funded universal pre-K.'],
    ['Partial student debt relief and raises for teachers.', 'More funding for public schools.'],
    ['Better public schools and more vocational training.', 'More affordable college without burdening taxpayers.'],
    ['School choice for parents and more charter schools.', 'More local control over curriculum.'],
    ['Abolish the Department of Education and universal vouchers.', 'Full parental control over education.'],
  ],
};

export const PLATFORM_PHRASES: Record<Lang, Record<IssueId, [string[], string[], string[], string[], string[]]>> = { pl: PLATFORM_PHRASES_PL, en: PLATFORM_PHRASES_EN };

/**
 * Complete campaign slogans by ideological lean. Both languages list the same slogans in the same
 * order, so a given seed picks the matching translation in either language.
 */
export const SLOGANS: Record<Lang, { left: string[]; center: string[]; right: string[] }> = {
  pl: {
    left: ['Ameryka dla wszystkich!', 'Sprawiedliwa Ameryka!', 'Razem po przyszłość!', 'Po stronie ludzi pracy!', 'Nikt nie zostaje w tyle!', 'Ameryka nadziei!', 'Naprzód, razem!', 'Odważnie po zmianę!'],
    center: ['Ameryka ponad podziałami!', 'Zdrowy rozsądek dla Ameryki!', 'Rząd, który działa!', 'Zjednoczona Ameryka!', 'Odnowić Amerykę!', 'Naprzód, nie w bok!', 'Mniej krzyku, więcej pracy!', 'Wspólny grunt, wspólna przyszłość!'],
    right: ['Silna i dumna Ameryka!', 'Bezpieczna Ameryka!', 'Wolność ponad wszystko!', 'Ameryka na pierwszym miejscu!', 'Bez kompromisów!', 'Prawo, porządek, dobrobyt!', 'Przywróćmy amerykańskie wartości!', 'Mniej państwa, więcej wolności!'],
  },
  en: {
    left: ['America for all!', 'A fair America!', 'Together for the future!', 'On the side of working families!', 'Leave no one behind!', 'An America of hope!', 'Forward, together!', 'Bold for change!'],
    center: ['America above party!', 'Common sense for America!', 'A government that works!', 'One America!', 'Renew America!', 'Forward, not sideways!', 'Less shouting, more working!', 'Common ground, common future!'],
    right: ['Strong and proud America!', 'A secure America!', 'Freedom above all!', 'America first!', 'No compromise!', 'Law, order, prosperity!', 'Restore American values!', 'Less government, more freedom!'],
  },
};

/**
 * Keyword lexicon used to infer issue positions from free text written by the player.
 * Patterns are matched against lowercase text (Polish stems + common English phrases).
 */
export const LEXICON: Record<IssueId, { re: RegExp; dir: number }[]> = {
  economy: [
    { re: /deregulac|wolny rynek|wolnego rynku|mniej biurokrac|free market|deregulat/, dir: 60 },
    { re: /inwestycj\w* publiczn|interwenc|rozbi\w* monopol|nacjonaliz|socjal|public invest|break up|antitrust/, dir: -60 },
  ],
  inflation: [
    { re: /kontrol\w* cen|zamrożeni\w* cen|chciwflac|price control|greedflation/, dir: -65 },
    { re: /ci[ęe]ci\w* wydatk|zrównoważon\w* budżet|balanced budget|spending cut/, dir: 60 },
  ],
  jobs: [
    { re: /płac\w* minimaln|związk\w* zawodow|union|minimum wage|gwarancj\w* zatrudni|jobs guarantee/, dir: -60 },
    { re: /prawo do pracy|right to work|ulg\w* dla firm|elastyczn\w* rynek/, dir: 55 },
  ],
  immigration: [
    { re: /deportac|mur\b|muru|zamkni\w* granic|uszczelni\w* granic|wall|deport|secure the border|close the border/, dir: 75 },
    { re: /obywatelstw\w* dla|amnesti|dreamers|ścieżk\w* do obywatelstwa|uchodźc|path to citizenship|amnesty|refugee/, dir: -65 },
  ],
  taxes: [
    { re: /obniż\w* podat|niższe podatki|niskie podatki|cięci\w* podatk|tax cut|cut taxes|lower taxes|podatek liniowy|flat tax/, dir: 70 },
    { re: /podat\w* (?:dla|od) (?:bogat|miliarder|najbogat|korporac)|podatek majątkowy|wyższe podatki|tax the rich|wealth tax/, dir: -70 },
  ],
  healthcare: [
    { re: /medicare for all|medicare dla wszystkich|publiczn\w* (?:system|ubezpiecz|opiek)|powszechn\w* opiek|single payer|universal health|darmow\w* (?:leczen|opiek)/, dir: -75 },
    { re: /uchyl\w* obamacare|prywatn\w* ubezpiecz|repeal|private insurance|rynkow\w* rozwiązan|market-based/, dir: 65 },
  ],
  security: [
    { re: /prawo i porządek|wsparci\w* (?:dla )?policji|surowsz\w* kar|druga poprawka|second amendment|law and order|back the blue/, dir: 65 },
    { re: /reform\w* policji|defund|police reform|ograniczeni\w* dostępu do broni|kontrol\w* broni|gun control|background check/, dir: -60 },
  ],
  foreign: [
    { re: /america first|ameryka przede wszystkim|pokój przez siłę|silna armia|strong military|budżet obronn|defense budget|peace through strength|cła|tariff/, dir: 55 },
    { re: /dyplomac|diplomac|sojusz|allian|nato|pokojow|wycofani\w* wojsk|prawa człowieka|human rights/, dir: -45 },
  ],
  climate: [
    { re: /zielon\w* (?:energi|transform|ład)|odnawialn|oze|neutralność klimat|green new deal|green energy|clean energy|renewable|zakaz szczelin/, dir: -70 },
    { re: /drill|wydobyci\w*|ropa|węgiel|paliw\w* kopaln|niezależność energetyczn|energy independence|fossil fuel|coal|fracking/, dir: 60 },
  ],
  social: [
    { re: /prawo do aborcji|prawa reprodukcyjn|reproductive rights|abortion rights|lgbt|równość małżeńsk|marriage equality|pro-choice|prawa kobiet/, dir: -70 },
    { re: /wartości rodzinn|family values|tradycyjn\w* wartości|traditional values|zakaz aborcji|abortion ban|pro-life|ochron\w* życia|wolność religijn|religious (?:liberty|freedom)/, dir: 70 },
  ],
  education: [
    { re: /darmow\w* studi|umorzeni\w* (?:długów|kredyt)|student debt|szkoł\w* publiczn|public school|free college/, dir: -65 },
    { re: /bon\w* edukacyjn|voucher|wybór szkoły|school choice|czarterow|charter school|prawa rodziców|parental rights/, dir: 65 },
  ],
};

export const ISSUE_MENTION: Record<IssueId, RegExp> = {
  economy: /gospodark|economy|wzrost|biznes/,
  inflation: /inflac|ceny|koszt\w* życia|drożyzn|prices|cost of living/,
  jobs: /prac[ay]|bezroboci|zatrudni|jobs|wage|płac/,
  immigration: /imigra|immigra|granic|migran|border/,
  taxes: /podat|tax/,
  healthcare: /zdrow|szpital|ubezpiecz|leki|health|hospital|insurance/,
  security: /bezpiecze|przestęp|policj|broń|broni|crime|police|gun/,
  foreign: /zagraniczn|chin|rosj|nato|armi|wojsk|foreign/,
  climate: /klimat|energi|ekolog|climate|energy/,
  social: /aborc|abortion|rodzin|famil|religi|lgbt|wartości|values/,
  education: /eduk|educat|szkoł|school|studi|college|nauczyc|teacher/,
};
