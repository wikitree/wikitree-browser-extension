// Birthplaces in states that no longer exist, for the migration maps (2026-10-23). Mennonite
// ancestors born in "…, Yekaterinoslav, Russian Empire" weren't on the map. The world outlines and
// OpenStreetMap know only today's countries, so the dot had no country and every lookup found nothing;
// even "Riga, Livonia, Russian Empire" did. Map only: Genie's answers still say "Russian Empire", as
// the profiles do (getCountryFromLocation is unchanged).
//
// The state and its province (governorate, crown land, vilayet…) give today's country and a dot
// for the province, used until the town is found and kept when it isn't; the town is looked up in
// today's country, inside the state and near the province (chat_geocode). Also when today's country
// was written for an old province: "…, Yekaterinoslav, Russia" is in Ukraine, "…, West Prussia,
// Germany" in Poland.

import { CHORTITZA_VILLAGES, MOLOTSCHNA_VILLAGES } from "./chat_colony_villages";

const DEFAULT_KM = 300;

// [name, today's country ("" when it's now in more than one), [lon, lat] (null: the country's own dot),
// other spellings, how far a town may be from that point in km (default DEFAULT_KM)]
const RUSSIAN_GOVERNORATES = [
  ["Yekaterinoslav", "Ukraine", [36, 48.1], "Ekaterinoslav, Ekaterinoslaw, Jekaterinoslaw, Jekaterinoslav, Katerinoslav, Katerynoslav"],
  ["Taurida", "Ukraine", [34.5, 46.2], "Tauride, Tavrida, Tavria, Tavriya, Taurien, Tauria, Tavricheskaya"],
  ["Kherson", "Ukraine", [31.8, 47.3], "Cherson"],
  ["Kiev", "Ukraine", [30.5, 49.7], "Kyiv, Kiew, Kijow"],
  ["Podolia", "Ukraine", [28, 48.8], "Podolien, Podillia, Podolye, Podole"],
  ["Volhynia", "Ukraine", [27, 50.7], "Volyn, Volynia, Wolhynien, Wolynien, Wolhynia, Volhynien, Wołyń"],
  ["Poltava", "Ukraine", [33.5, 49.6], "Pultava"],
  ["Chernigov", "Ukraine", [32.5, 51.5], "Chernihiv, Tschernigow, Czernihow"],
  ["Kharkov", "Ukraine", [36.4, 49.7], "Kharkiv, Charkow, Kharkow, Charkiw, Sloboda Ukraine"],
  ["Crimea", "Ukraine", [34.2, 45.3], "Krim, Krym"],
  // (the Mennonite colonies, written like provinces: "Blumengart Village, Chortitza Mennonite Colony, Yekaterinoslav, …")
  // (Chortitza's dot is the village, Verkhnia Khortytsia: chat_colony_villages)
  ["Chortitza", "Ukraine", [35.0116, 47.8615], "Chortiza, Chortitz, Khortitsa, Khortitza, Khortytsia", 60],
  ["Molotschna", "Ukraine", [35.5, 47.15], "Molochna, Molotchna, Molochnaya, Molotschnaja", 70],
  ["Bessarabia", "Moldova", [28.6, 46.9], "Bessarabien, Basarabia"],
  ["Minsk", "Belarus", [27.5, 53.3], ""],
  ["Mogilev", "Belarus", [30, 53.6], "Mohilev, Mohilew, Mogilew, Mahilyow, Mahiliou"],
  ["Vitebsk", "", [28.8, 55.8], "Vitsebsk, Witebsk"],
  ["Grodno", "", [24.5, 52.9], "Hrodna, Hrodno"],
  ["Vilna", "", [26, 54.6], "Vilnius, Wilna, Wilno, Vilno"],
  ["Kovno", "Lithuania", [23.8, 55.5], "Kaunas, Kowno"],
  ["Courland", "Latvia", [23, 56.8], "Kurland, Kurzeme, Curland"],
  ["Livonia", "", [25.5, 57.8], "Livland, Lifland, Liefland"],
  ["Saint Petersburg", "Russia", [30.3, 59.4], "St Petersburg, Sankt Petersburg, Sankt-Peterburg, Petersburg, Petrograd, Ingria, Ingermanland"],
  ["Moscow", "Russia", [37.6, 55.6], "Moskva, Moskau, Moscou"],
  ["Novgorod", "Russia", [33, 58.7], "Nowgorod"],
  ["Pskov", "Russia", [29, 57.3], "Pleskau"],
  ["Tver", "Russia", [35, 57.2], "Twer"],
  ["Smolensk", "Russia", [33, 54.8], ""],
  ["Kaluga", "Russia", [35.5, 54.3], ""],
  ["Tula", "Russia", [37.6, 53.9], ""],
  ["Ryazan", "Russia", [40.5, 54.3], "Rjasan, Riazan"],
  ["Vladimir", "Russia", [40.5, 56.1], ""],
  ["Yaroslavl", "Russia", [39.3, 57.8], "Jaroslawl, Iaroslavl"],
  ["Kostroma", "Russia", [43, 58.3], ""],
  ["Nizhny Novgorod", "Russia", [44, 55.8], "Nizhni Novgorod, Nizhniy Novgorod, Nischni Nowgorod"],
  ["Kazan", "Russia", [49.5, 55.6], "Kasan"],
  ["Simbirsk", "Russia", [47.5, 54.2], ""],
  ["Penza", "Russia", [44.5, 53.2], ""],
  ["Tambov", "Russia", [41.5, 52.7], "Tambow"],
  ["Voronezh", "Russia", [39.8, 51], "Woronesch"],
  ["Kursk", "Russia", [36.3, 51.6], ""],
  ["Oryol", "Russia", [36, 52.8], "Orel, Orjol, Oriol"],
  ["Samara", "Russia", [50.5, 53], "", 400],
  ["Saratov", "Russia", [45.5, 51.5], "Saratow", 400],
  ["Volga", "Russia", [46.5, 51.5], "Volga region, Wolga", 500],
  ["Orenburg", "Russia", [56, 52.5], "", 450],
  ["Ufa", "Russia", [56, 55], "", 400],
  ["Astrakhan", "Russia", [47, 47.2], "Astrachan", 400],
  ["Don Host", "Russia", [41, 48.5], "Don Cossack Host, Oblast of the Don Host, Don Cossacks, Land of the Don Cossacks, Don Voisko", 350],
  ["Kuban", "Russia", [39.5, 45], ""],
  ["Stavropol", "Russia", [43, 45.2], ""],
  ["Terek", "Russia", [45, 43.5], ""],
  ["Vyatka", "Russia", [50, 58.3], "Wjatka, Viatka", 400],
  ["Perm", "Russia", [57.5, 58.5], "", 450],
  ["Vologda", "Russia", [42, 59.8], "Wologda", 500],
  ["Olonets", "Russia", [34.5, 61.8], "Olonetz", 400],
  ["Arkhangelsk", "Russia", [42, 64.5], "Archangel, Archangelsk, Arkhangel", 900],
  ["Siberia", "Russia", [85, 57], "Sibirien", 2500],
  ["Tobolsk", "Russia", [68, 58.2], "", 1200],
  ["Tomsk", "Russia", [84, 56.5], "", 1200],
  ["Yeniseysk", "Russia", [92, 58], "Yeniseisk, Jenissejsk", 1500],
  ["Irkutsk", "Russia", [104.3, 52.3], "", 900],
  ["Tiflis", "Georgia", [44.8, 41.7], "Tbilisi"],
  ["Kutais", "Georgia", [42.7, 42.25], "Kutaisi"],
  ["Erivan", "Armenia", [44.5, 40.2], "Yerevan, Eriwan"],
  ["Elisabethpol", "Azerbaijan", [46.4, 40.7], "Elizavetpol, Elisavetpol, Yelisavetpol, Ganja"],
  ["Baku", "Azerbaijan", [49, 40.4], ""],
  ["Kars", "Turkey", [43.1, 40.6], ""],
];

// Congress Poland's governorates (in the Russian Empire, 1815–1915)
const POLISH_GOVERNORATES = [
  ["Warsaw", "Poland", [20.9, 52.3], "Warszawa, Warschau, Varshava"],
  ["Kalisz", "Poland", [18.1, 51.8], "Kalisch"],
  ["Kielce", "Poland", [20.6, 50.8], ""],
  ["Łomża", "Poland", [22.1, 53.2], "Lomza"],
  ["Lublin", "Poland", [22.6, 51.1], ""],
  ["Piotrków", "Poland", [19.7, 51.3], "Piotrkow, Petrikau"],
  ["Płock", "Poland", [19.8, 52.8], "Plotzk"],
  ["Radom", "Poland", [21.2, 51.3], ""],
  ["Siedlce", "Poland", [22.5, 52.2], "Sedlez"],
  ["Suwałki", "", [22.9, 54], ""],
  ["Chełm", "Poland", [23.5, 51.1], "Kholm, Cholm"],
];

const PRUSSIAN_PROVINCES = [
  ["East Prussia", "", [21, 54], "Ostpreussen, Prusy Wschodnie"],
  ["West Prussia", "Poland", [18.5, 53.6], "Westpreussen, Prusy Zachodnie, Royal Prussia"],
  ["Pomerania", "", [15.5, 53.8], "Pommern, Pomorze"],
  ["Posen", "Poland", [17, 52.4], "Poznań"],
  ["Silesia", "", [17, 51], "Schlesien, Śląsk, Lower Silesia, Upper Silesia, Niederschlesien, Oberschlesien"],
  ["Brandenburg", "Germany", [13.5, 52.4], "Mark Brandenburg"],
  ["Neumark", "Poland", [15.2, 52.8], ""],
  ["Saxony", "Germany", [11.7, 52], "Sachsen"],
  ["Westphalia", "Germany", [7.8, 51.7], "Westfalen"],
  ["Rhine Province", "Germany", [7, 50.5], "Rhineland, Rheinprovinz, Rheinland, Rhenish Prussia, Rhine Prussia"],
  ["Hanover", "Germany", [9.7, 52.6], "Hannover"],
  ["Hesse-Nassau", "Germany", [9, 50.7], "Hessen-Nassau"],
  ["Schleswig-Holstein", "", [9.8, 54.3], "Schleswig, Holstein"],
  ["Hohenzollern", "Germany", [9.1, 48.3], ""],
  ["Memel", "Lithuania", [21.4, 55.5], "Memelland, Memel Territory, Klaipėda"],
];

const GERMAN_STATES = [
  ["Bavaria", "Germany", [11.5, 48.9], "Bayern"],
  ["Saxony", "Germany", [13.2, 51], "Sachsen"],
  ["Württemberg", "Germany", [9.2, 48.6], "Wuerttemberg, Wurtemberg"],
  ["Baden", "Germany", [8.4, 48.3], ""],
  ["Hesse", "Germany", [8.9, 50.3], "Hessen, Hesse-Darmstadt, Hessen-Darmstadt, Hesse-Kassel, Hesse-Cassel, Hessen-Kassel, Kurhessen, Electoral Hesse"],
  ["Palatinate", "Germany", [7.9, 49.4], "Pfalz, Rheinpfalz, Kurpfalz, Electoral Palatinate, Rhenish Palatinate, Pfalz-Zweibrücken, Zweibrücken"],
  ["Mecklenburg", "Germany", [12.3, 53.6], "Mecklenburg-Schwerin, Mecklenburg-Strelitz"],
  ["Oldenburg", "Germany", [8.2, 53], ""],
  ["Brunswick", "Germany", [10.5, 52.2], "Braunschweig"],
  ["Thuringia", "Germany", [11, 50.9], "Thüringen, Saxe-Weimar, Sachsen-Weimar, Saxe-Weimar-Eisenach, Saxe-Coburg, Saxe-Coburg and Gotha, Sachsen-Coburg, Saxe-Gotha, Saxe-Meiningen, Saxe-Altenburg, Schwarzburg, Reuss"],
  ["Anhalt", "Germany", [11.9, 51.8], ""],
  ["Lippe", "Germany", [8.9, 51.95], "Lippe-Detmold, Schaumburg-Lippe"],
  ["Waldeck", "Germany", [8.9, 51.2], "Waldeck-Pyrmont"],
  ["Nassau", "Germany", [8, 50.3], ""],
  ["Swabia", "Germany", [9.8, 48.3], "Schwaben"],
  ["Franconia", "Germany", [10.8, 49.6], "Franken"],
  ["Alsace-Lorraine", "France", [7, 48.6], "Elsass-Lothringen, Reichsland Elsass-Lothringen, Reichsland"],
  ["Alsace", "France", [7.5, 48.3], "Elsass"],
  ["Lorraine", "France", [6.4, 48.9], "Lothringen"],
];

// The Habsburg crown lands (the Austrian Empire, then Austria-Hungary)
const AUSTRIAN_LANDS = [
  ["Bohemia", "Czechia", [14.5, 49.9], "Böhmen, Čechy"],
  ["Moravia", "Czechia", [16.9, 49.4], "Mähren, Morava"],
  ["Austrian Silesia", "Czechia", [17.8, 49.9], "Silesia, Schlesien, Österreichisch-Schlesien, Czech Silesia"],
  ["Galicia", "", [22.5, 49.8], "Galizien, Galicja, Halychyna, Galitzien, Galicia and Lodomeria"],
  ["Bukovina", "", [25.6, 48], "Bukowina, Bucovina, Bukowyna"],
  ["Transylvania", "Romania", [24.5, 46.5], "Siebenbürgen, Erdély, Transilvania, Ardeal"],
  ["Banat", "", [21.3, 45.6], "Temes"],
  ["Slavonia", "Croatia", [17.8, 45.4], "Croatia-Slavonia, Kroatien-Slawonien, Slawonien"],
  ["Dalmatia", "Croatia", [16.4, 43.6], "Dalmatien, Dalmacija"],
  ["Carniola", "Slovenia", [14.6, 46], "Krain, Kranjska"],
  ["Styria", "Austria", [15.3, 47.2], "Steiermark, Štajerska"],
  ["Carinthia", "Austria", [14, 46.7], "Kärnten, Koroška"],
  ["Tyrol", "Austria", [11.4, 47.2], "Tirol"],
  ["South Tyrol", "Italy", [11.3, 46.5], "Südtirol, Trentino, Alto Adige, Welschtirol"],
  ["Upper Austria", "Austria", [14, 48.1], "Oberösterreich, Austria above the Enns"],
  ["Lower Austria", "Austria", [15.7, 48.3], "Niederösterreich, Austria below the Enns"],
  ["Salzburg", "Austria", [13.1, 47.4], ""],
  ["Vorarlberg", "Austria", [9.8, 47.25], ""],
  ["Austrian Littoral", "", [13.8, 45.6], "Littoral, Küstenland, Istria, Istrien, Gorizia, Görz, Trieste, Triest"],
  ["Bosnia and Herzegovina", "Bosnia and Herzegovina", [17.8, 44.2], "Bosnia, Herzegovina, Bosnia-Herzegovina, Bosnien"],
  ["Upper Hungary", "Slovakia", [19.5, 48.7], "Felvidék, Oberungarn"],
  ["Vojvodina", "Serbia", [20, 45.4], "Voivodina, Woiwodina, Bačka, Bácska, Batschka, Syrmia, Srem"],
  ["Burgenland", "Austria", [16.5, 47.5], ""],
  ["Carpathian Ruthenia", "Ukraine", [23.2, 48.4], "Ruthenia, Subcarpathian Ruthenia, Subcarpathia, Podkarpatská Rus, Transcarpathia, Zakarpattia, Kárpátalja"],
];

const OTTOMAN_PROVINCES = [
  ["Constantinople", "Turkey", [28.97, 41.01], "Istanbul, Konstantinopel, Stamboul"],
  ["Mount Lebanon", "Lebanon", [35.8, 33.95], "Jabal Lubnan, Mont Liban"],
  ["Beirut", "Lebanon", [35.5, 33.9], "Beyrouth"],
  ["Aleppo", "Syria", [37.2, 36.2], "Halab"],
  ["Damascus", "Syria", [36.3, 33.5], ""],
  ["Palestine", "", [35.1, 31.8], "Jerusalem, Holy Land"],
  ["Baghdad", "Iraq", [44.4, 33.3], "Bagdad"],
  ["Basra", "Iraq", [47.8, 30.5], "Basrah"],
  ["Mosul", "Iraq", [43.1, 36.3], ""],
  ["Mesopotamia", "Iraq", [44, 33], "", 500],
  ["Salonica", "Greece", [22.9, 40.65], "Thessaloniki, Selanik, Saloniki, Salonika"],
  ["Macedonia", "", [22, 41.2], "Makedonia"],
  ["Crete", "Greece", [24.9, 35.2], "Candia, Kreta, Girit"],
  ["Janina", "", [20.5, 39.9], "Ioannina, Yanya, Epirus"],
  ["Adrianople", "", [26.5, 41.8], "Edirne, Thrace"],
  ["Western Armenia", "Turkey", [41.3, 39.3], "Turkish Armenia, Ottoman Armenia"],
  ["Erzurum", "Turkey", [41.3, 39.9], "Erzerum, Erzeroum"],
  ["Van", "Turkey", [43.4, 38.5], ""],
  ["Bitlis", "Turkey", [42.1, 38.4], ""],
  ["Diyarbakır", "Turkey", [40.2, 37.9], "Diyarbekir, Diarbekir"],
  ["Harput", "Turkey", [39.2, 38.7], "Kharpert, Kharput, Mamuret-ul-Aziz, Mamuretülaziz, Elazığ"],
  ["Sivas", "Turkey", [37, 39.75], "Sebastia"],
  ["Trebizond", "Turkey", [39.7, 41], "Trabzon, Trapezunt"],
  ["Aidin", "Turkey", [27.4, 38.3], "Aydın, Smyrna, İzmir"],
  ["Adana", "Turkey", [35.3, 37], "Cilicia"],
  ["Anatolia", "Turkey", [33, 39], "Anadolu, Asia Minor", 600],
  ["Rumelia", "", [24, 41.6], "Rumeli, Roumelia, Eastern Rumelia", 400],
];

const SOVIET_REPUBLICS = [
  ["Russian SFSR", "Russia", null, "Russian, RSFSR"],
  ["Ukrainian SSR", "Ukraine", null, "Ukrainian, UkrSSR"],
  ["Byelorussian SSR", "Belarus", null, "Byelorussian, Belorussian, Belarusian, BSSR"],
  ["Lithuanian SSR", "Lithuania", null, "Lithuanian"],
  ["Latvian SSR", "Latvia", null, "Latvian"],
  ["Estonian SSR", "Estonia", null, "Estonian"],
  ["Moldavian SSR", "Moldova", null, "Moldavian"],
  ["Georgian SSR", "Georgia", null, "Georgian"],
  ["Armenian SSR", "Armenia", null, "Armenian"],
  ["Azerbaijan SSR", "Azerbaijan", null, "Azerbaijani"],
  ["Kazakh SSR", "Kazakhstan", null, "Kazakh"],
  ["Uzbek SSR", "Uzbekistan", null, "Uzbek"],
  ["Turkmen SSR", "Turkmenistan", null, "Turkmen"],
  ["Kirghiz SSR", "Kyrgyzstan", null, "Kirghiz, Kyrgyz"],
  ["Tajik SSR", "Tajikistan", null, "Tajik"],
  ["Karelo-Finnish SSR", "Russia", [33, 63], "Karelo-Finnish, Karelian, Karelia", 400],
];

const CZECHOSLOVAK_LANDS = [
  ["Bohemia", "Czechia", [14.5, 49.9], "Böhmen, Čechy"],
  ["Moravia", "Czechia", [16.9, 49.4], "Mähren, Morava"],
  ["Czech Silesia", "Czechia", [17.8, 49.9], "Silesia, Moravian Silesia, Moravia-Silesia"],
  ["Carpathian Ruthenia", "Ukraine", [23.2, 48.4], "Ruthenia, Subcarpathian Ruthenia, Subcarpathia, Podkarpatská Rus, Transcarpathia"],
];

const YUGOSLAV_LANDS = [
  ["Vojvodina", "Serbia", [20, 45.4], "Voivodina, Woiwodina, Bačka, Batschka, Syrmia, Srem"],
  ["Dalmatia", "Croatia", [16.4, 43.6], "Dalmatien, Dalmacija"],
  ["Slavonia", "Croatia", [17.8, 45.4], "Slawonien"],
];

// Today's countries as they're written: an old state's part that is one of these is in it.
// (the names are the map's: world-atlas, or chat_migration_map's ATLAS_NAMES)
const COUNTRY_SPELLINGS = {
  Russia: "Russland, Rossiya, Россия",
  Ukraine: "Ukraina, The Ukraine, Україна",
  Belarus: "Byelorussia, Belorussia, White Russia, Weißrussland",
  Poland: "Polska, Polen",
  Lithuania: "Litauen, Lietuva",
  Latvia: "Lettland, Latvija",
  Estonia: "Estland, Esthonia, Eesti",
  Finland: "Suomi, Finnland",
  Moldova: "Moldavia",
  Georgia: "",
  Armenia: "",
  Azerbaijan: "",
  Kazakhstan: "",
  Uzbekistan: "",
  Turkmenistan: "",
  Kyrgyzstan: "Kirghizia",
  Tajikistan: "",
  Germany: "Deutschland",
  Austria: "Österreich, Oesterreich",
  Hungary: "Magyarország, Ungarn",
  Czechia: "Czech Republic, Czech Lands, Česko, Tschechien",
  Slovakia: "Slovensko, Slowakei",
  Romania: "România, Rumania, Roumania, Rumänien",
  Croatia: "Hrvatska, Kroatien",
  Slovenia: "Slovenija",
  "Bosnia and Herzegovina": "Bosnia, Herzegovina, Bosnia-Herzegovina",
  Serbia: "Srbija, Serbien",
  Montenegro: "Crna Gora",
  "North Macedonia": "Macedonia",
  Kosovo: "Kosova",
  Italy: "Italia, Italien",
  France: "Frankreich",
  Denmark: "Danmark, Dänemark",
  Netherlands: "The Netherlands, Holland, Nederland",
  Belgium: "België, Belgique, Belgien",
  Luxembourg: "",
  Switzerland: "Schweiz, Suisse, Svizzera",
  Liechtenstein: "",
  Turkey: "Türkiye",
  Greece: "Hellas",
  Bulgaria: "",
  Albania: "",
  Syria: "",
  Lebanon: "",
  Israel: "",
  Palestine: "",
  Jordan: "",
  Iraq: "",
  "Saudi Arabia": "",
  Yemen: "",
  Egypt: "",
  Libya: "",
  Cyprus: "",
};

const RUSSIA = "Russia";
const GERMANY = "Germany";
const AUSTRIA = "Austria";
const HUNGARY = "Hungary";
const TURKEY = "Turkey";
const TODAY_RUSSIAN_EMPIRE = ["Russia", "Ukraine", "Belarus", "Poland", "Lithuania", "Latvia", "Estonia", "Finland", "Moldova", "Georgia", "Armenia", "Azerbaijan", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan"];
const TODAY_HABSBURG = ["Austria", "Hungary", "Czechia", "Slovakia", "Poland", "Ukraine", "Romania", "Croatia", "Slovenia", "Bosnia and Herzegovina", "Serbia", "Montenegro", "Italy"];

// name: the dot's name; country: today's ("" when it's now several); point: the dot's [lon, lat];
// box: [west, south, east, north], where its towns are looked for; names: how it's written; today:
// countries of today someone may have written for it; provinces: later tables win a shared name.
const STATES = [
  {
    name: "Russian Empire",
    country: "",
    point: [36, 53.5],
    box: [17, 35, 180, 78],
    names: "Russian Empire, Russia Empire, Empire of Russia, Imperial Russia, Tsarist Russia, Czarist Russia, Russisches Reich, Russisches Kaiserreich, Kaiserreich Russland, Rossiyskaya Imperiya, Rossiiskaia Imperiia, Российская империя, Imperium Rosyjskie, Rosyjskie Imperium, Empire russe",
    today: [RUSSIA],
    provinces: [RUSSIAN_GOVERNORATES, POLISH_GOVERNORATES],
    countries: TODAY_RUSSIAN_EMPIRE,
  },
  {
    name: "Soviet Union",
    country: "",
    point: [36, 53.5],
    box: [19, 35, 180, 78],
    names: "Soviet Union, USSR, U.S.S.R., Union of Soviet Socialist Republics, СССР, CCCP, UdSSR, Sowjetunion",
    today: [RUSSIA],
    provinces: [RUSSIAN_GOVERNORATES, SOVIET_REPUBLICS],
    countries: TODAY_RUSSIAN_EMPIRE.filter((country) => country !== "Poland" && country !== "Finland"),
  },
  {
    // (the Mennonites' name for the Black Sea steppe: Yekaterinoslav, Taurida, Kherson)
    name: "South Russia",
    country: "Ukraine",
    point: [34, 47.3],
    box: [26, 43.5, 41, 50.5],
    names: "South Russia, Southern Russia, Süd-Russland, Südrussland",
    provinces: [RUSSIAN_GOVERNORATES],
    countries: ["Ukraine", "Russia", "Moldova"],
  },
  {
    name: "Kingdom of Poland",
    country: "Poland",
    point: [20, 52],
    box: [14, 49, 24.5, 55.5],
    names: "Kingdom of Poland, Congress Poland, Congress Kingdom of Poland, Królestwo Polskie, Królestwo Kongresowe, Kongresspolen, Vistula Land, Russian Poland, Russisch-Polen, Privislinsky Krai",
    provinces: [POLISH_GOVERNORATES],
    countries: ["Poland", "Lithuania"],
  },
  {
    name: "Polish–Lithuanian Commonwealth",
    country: "",
    point: [24, 52.8],
    box: [14, 45.5, 36.5, 59],
    names: "Polish–Lithuanian Commonwealth, Poland Lithuanian Commonwealth, Poland-Lithuania, Commonwealth of Both Nations, Commonwealth of Poland, Rzeczpospolita, Rzeczpospolita Obojga Narodów, Polen-Litauen",
    provinces: [POLISH_GOVERNORATES],
    countries: ["Poland", "Lithuania", "Belarus", "Ukraine", "Latvia", "Russia"],
  },
  {
    name: "Grand Duchy of Finland",
    country: "Finland",
    point: [26, 62.5],
    box: [19, 59.5, 33, 70.5],
    names: "Grand Duchy of Finland, Suomen suuriruhtinaskunta, Storfurstendömet Finland, Großfürstentum Finnland",
    provinces: [],
    countries: ["Finland"],
  },
  {
    name: "Prussia",
    country: "",
    point: [13.4, 52.5],
    box: [5.8, 49, 23, 56],
    names: "Prussia, Kingdom of Prussia, Free State of Prussia, Preußen, Königreich Preußen, Freistaat Preußen, Prusy",
    today: [GERMANY],
    provinces: [PRUSSIAN_PROVINCES],
    countries: ["Germany", "Poland", "Russia", "Lithuania", "Denmark"],
  },
  {
    name: "German Empire",
    country: "",
    point: [10.4, 51.2],
    box: [5.8, 47.2, 23, 56],
    names: "German Empire, Deutsches Reich, Deutsches Kaiserreich, Imperial Germany, Kaiserreich, German Reich, Greater German Reich, Großdeutsches Reich, Weimar Republic, Third Reich, Nazi Germany",
    today: [GERMANY],
    provinces: [PRUSSIAN_PROVINCES, GERMAN_STATES],
    countries: ["Germany", "Poland", "France", "Russia", "Lithuania", "Denmark"],
  },
  {
    name: "Holy Roman Empire",
    country: "",
    point: [10.5, 50.3],
    box: [2, 43.5, 20, 55.5],
    names: "Holy Roman Empire, Holy Roman Empire of the German Nation, Heiliges Römisches Reich, Heiliges Römisches Reich Deutscher Nation, Sacrum Imperium Romanum, Saint Empire romain germanique, HRE",
    today: [GERMANY, AUSTRIA],
    provinces: [AUSTRIAN_LANDS, PRUSSIAN_PROVINCES, GERMAN_STATES],
    countries: ["Germany", "Austria", "Czechia", "Netherlands", "Belgium", "Luxembourg", "Switzerland", "Italy", "France", "Slovenia", "Poland", "Liechtenstein"],
  },
  {
    name: "Austria-Hungary",
    country: "",
    point: [18.5, 47.8],
    box: [8.5, 42, 27, 51.5],
    names: "Austria-Hungary, Austro-Hungarian Empire, Austro-Hungarian Monarchy, Austro-Hungary, Austria-Hungary Empire, Austrian-Hungarian Empire, Austrian Empire, Austrian Monarchy, Empire of Austria, Habsburg Monarchy, Habsburg Empire, Hapsburg Empire, Dual Monarchy, Österreich-Ungarn, Kaisertum Österreich, Kaiserthum Oesterreich, Donaumonarchie, Rakousko-Uhersko, Austro-Węgry, Osztrák–Magyar Monarchia",
    today: [AUSTRIA, HUNGARY],
    provinces: [AUSTRIAN_LANDS],
    countries: TODAY_HABSBURG,
  },
  {
    name: "Kingdom of Hungary",
    country: "",
    point: [20, 47.3],
    box: [16, 44.3, 26.7, 49.7],
    names: "Kingdom of Hungary, Magyar Királyság, Königreich Ungarn, Lands of the Crown of Saint Stephen",
    today: [HUNGARY],
    provinces: [AUSTRIAN_LANDS],
    countries: ["Hungary", "Slovakia", "Romania", "Serbia", "Croatia", "Austria", "Ukraine"],
  },
  {
    name: "Ottoman Empire",
    country: "",
    point: [32.5, 39.3],
    box: [15, 12, 50, 46.5],
    names: "Ottoman Empire, Ottoman Turkey, Turkish Empire, Osmanlı İmparatorluğu, Devlet-i Aliyye, Osmanisches Reich, Empire ottoman, Sublime Porte",
    today: [TURKEY],
    provinces: [OTTOMAN_PROVINCES],
    countries: ["Turkey", "Greece", "Bulgaria", "Albania", "North Macedonia", "Serbia", "Kosovo", "Bosnia and Herzegovina", "Montenegro", "Romania", "Syria", "Lebanon", "Israel", "Palestine", "Jordan", "Iraq", "Saudi Arabia", "Yemen", "Egypt", "Libya", "Cyprus"],
  },
  {
    name: "Czechoslovakia",
    country: "",
    point: [17, 49.3],
    box: [12, 47.7, 24.7, 51.1],
    names: "Czechoslovakia, Czecho-Slovakia, Czechoslovak Republic, Czechoslovak Socialist Republic, ČSR, ČSSR, CSSR, Československo, Tschechoslowakei, Czechosłowacja",
    provinces: [CZECHOSLOVAK_LANDS],
    countries: ["Czechia", "Slovakia", "Ukraine"],
  },
  {
    name: "Yugoslavia",
    country: "",
    point: [19, 44],
    box: [13.3, 40.8, 23.1, 46.9],
    // ("Kingdom of Serbs, Croats and Slovenes" arrives in two parts; the last is "Croats and Slovenes")
    names: "Yugoslavia, Jugoslavia, Jugoslavija, Jugoslawien, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia, Federal People's Republic of Yugoslavia, Federal Republic of Yugoslavia, SFR Yugoslavia, SFRY, SFRJ, Kingdom of Serbs Croats and Slovenes, Croats and Slovenes, Kingdom of SCS, Југославија",
    provinces: [YUGOSLAV_LANDS],
    countries: ["Serbia", "Croatia", "Slovenia", "Bosnia and Herzegovina", "Montenegro", "North Macedonia", "Kosovo"],
  },
];

/** For matching: "Preußen" → "preussen", "Osmanlı İmparatorluğu" → "osmanli imparatorlugu" (Cyrillic kept). */
export function plainName(text) {
  return String(text || "")
    .replace(/ß/g, "ss")
    .replace(/[łŁ]/g, "l")
    .replace(/[ıİ]/g, "i")
    .replace(/[đĐ]/g, "d")
    .replace(/[øØ]/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, " ")
    .trim();
}

// "Governorate of Yekaterinoslav", "Ukrainian SSR", "Provinz Posen": the name alone.
const PREFIX =
  /^(?:the )?(?:(?:kingdom|grand duchy|duchy|archduchy|principality|electorate|margraviate|landgraviate|province|governorate|government|gubernia|guberniya|vilayet|eyalet|mutasarrifate|crown land|free state|oblast|land) of (?:the )?|(?:konigreich|grossherzogtum|herzogtum|erzherzogtum|kurfurstentum|furstentum|markgrafschaft|provinz|freistaat|gouvernement) )/;
const SUFFIX =
  / (?:governorate|gubernia|guberniya|guberniia|gubernya|government|province|provinz|oblast|vilayet|eyalet|mutasarrifate|voivodeship|crown land|kronland|a?ssr|sfsr|soviet (?:federative )?socialist republic|(?:mennonite )?(?:colony|settlement))$/;
const provinceName = (text) => plainName(text).replace(PREFIX, "").replace(SUFFIX, "");

const spellings = (list) => String(list || "").split(",").map((name) => name.trim()).filter(Boolean);

const STATE_BY_NAME = new Map();
// a country of today's name → {country, states}
const TODAY_BY_NAME = new Map();
STATES.forEach((state) => {
  spellings(state.names).forEach((name) => STATE_BY_NAME.set(plainName(name), state));
  state.provinceByName = new Map();
  // (today's countries first, so a province of the same name wins: "Lebanon" is a country, "Mount Lebanon" a province)
  state.countries.forEach((country) =>
    [country, ...spellings(COUNTRY_SPELLINGS[country])].forEach((name) => state.provinceByName.set(provinceName(name), { name: country, country, point: null }))
  );
  state.provinces.forEach((table) =>
    table.forEach(([name, country, point, other, km]) => {
      const province = { name, country, point, ...(km ? { km } : {}) };
      [name, ...spellings(other)].forEach((spelling) => state.provinceByName.set(provinceName(spelling), province));
    })
  );
  (state.today || []).forEach((country) =>
    [country, ...spellings(COUNTRY_SPELLINGS[country])].forEach((name) => {
      const key = plainName(name);
      if (!TODAY_BY_NAME.has(key)) TODAY_BY_NAME.set(key, { country, states: [] });
      TODAY_BY_NAME.get(key).states.push(state);
    })
  );
});

// Provinces that stand for their state when they're written last ("Danzig, West Prussia"): only
// names that were never anything else.
const ALONE = ["West Prussia", "East Prussia", "Yekaterinoslav", "Taurida", "Bessarabia", "Volhynia", "Podolia", "Livonia", "Courland", "Chortitza", "Molotschna"];
const STATE_OF_PROVINCE = new Map();
STATES.forEach((state) =>
  state.provinces.forEach((table) =>
    table
      .filter(([name]) => ALONE.includes(name))
      .forEach(([name, , , other]) =>
        [name, ...spellings(other)].forEach((spelling) => {
          if (!STATE_OF_PROVINCE.has(provinceName(spelling))) STATE_OF_PROVINCE.set(provinceName(spelling), state);
        })
      )
  )
);

// Today's countries in their own languages: "Polen" → "Poland".
const ENGLISH_COUNTRY = new Map();
Object.entries(COUNTRY_SPELLINGS).forEach(([country, other]) => spellings(other).forEach((name) => ENGLISH_COUNTRY.set(plainName(name), country)));

/** "Polen" → "Poland", "Россия" → "Russia"; "" when it isn't another name of one of today's countries. */
export function englishCountry(name) {
  return ENGLISH_COUNTRY.get(plainName(name)) || "";
}

// For matching a village however it's spelt: Kronstal is Kronsthal, Schoenhorst Schönhorst, Ladekop
// Ladekopp, Neu Osterwick Neu-Osterwick.
const looseName = (text) =>
  plainName(text)
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/ae/g, "a")
    .replace(/th/g, "t")
    .replace(/(.)\1+/g, "$1")
    .replace(/ /g, "");

const VILLAGE_KM = 10;
// [the colony (a RUSSIAN_GOVERNORATES row), its governorate, its villages by loose name]
const COLONIES = [
  ["Chortitza", "Yekaterinoslav", CHORTITZA_VILLAGES],
  ["Molotschna", "Taurida", MOLOTSCHNA_VILLAGES],
].map(([colony, governorate, villages]) => {
  const byName = new Map();
  villages.forEach(([name, point, other]) => {
    // (the village the colony is named after is the colony's dot: one place)
    const village = { key: name === colony ? colony : `${name} (${colony})`, point };
    [name, ...spellings(other)].forEach((spelling) => byName.set(looseName(spelling), village));
  });
  return { colony, governorate, byName };
});
// (the states a colony may be written in with no province: "Blumengart, South Russia")
const COLONY_STATES = ["Russian Empire", "South Russia"];

// A village of one of the mother colonies ({key, point}), when it's written in that colony or its
// governorate (or in Russia with no province): "Rosenthal, Hesse, Germany" isn't Chortitza's.
function colonyVillage(town, province, state) {
  const name = looseName(town);
  const colonies = province
    ? COLONIES.filter(({ colony, governorate }) => province.name === colony || province.name === governorate)
    : COLONY_STATES.includes(state.name)
      ? COLONIES
      : [];
  const found = colonies.map(({ byName }) => byName.get(name)).filter(Boolean);
  return found.length === 1 ? found[0] : null;
}

// The province called `name` in the innermost state that has one: [province, state] or null.
function findProvince(states, name) {
  const key = provinceName(name);
  for (let index = states.length - 1; index >= 0; index -= 1) {
    const province = states[index].provinceByName.get(key);
    if (province) return [province, states[index]];
  }
  return null;
}

/**
 * A birthplace in a state that no longer exists, for the map, or null:
 * {key, country, point, query, box, near, km, town}. key: the dot's name (the province, else the state;
 * today's country when that's all it says); country: today's ("" when the province is now split);
 * point: the dot's [lon, lat] (null: the country's own); query: the town to look up, in today's
 * country when that's known ("chortitza, ukraine"; "" when there's no town); box: the state's
 * [west, south, east, north]; near and km: the town must be within km of that point (or null);
 * town: as written, lower case ("" when there's none). A village of the Mennonite mother colonies
 * is its own dot, with nothing to look up: "Neuendorf (Chortitza)".
 */
export function historicalPlace(location) {
  const parts = String(location || "")
    .replace(/\([^)]*\)/g, " ")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  let at = parts.length - 1;
  let states = [];
  let today = null;
  const last = plainName(parts[at]);
  if (STATE_BY_NAME.has(last)) states.push(STATE_BY_NAME.get(last));
  else if (TODAY_BY_NAME.has(last)) {
    today = TODAY_BY_NAME.get(last);
    states = [...today.states];
  } else if (STATE_OF_PROVINCE.has(provinceName(parts[at]))) {
    states.push(STATE_OF_PROVINCE.get(provinceName(parts[at])));
    // (and the province is read below)
    at += 1;
  } else return null;
  at -= 1;
  let province = null;
  let provinceState = null;
  let wroteState = !today;
  let provinceParts = 0;
  for (; at >= 0; at -= 1) {
    const state = STATE_BY_NAME.get(plainName(parts[at]));
    if (state) {
      states.push(state);
      wroteState = true;
      continue;
    }
    const found = findProvince(states, parts[at]);
    if (!found) break;
    [province, provinceState] = found;
    provinceParts += 1;
  }
  // ("Kiev, Kiev, Russian Empire": the first is the town; "Chortitza Mennonite Colony, Yekaterinoslav, …" has none)
  if (at < 0 && provinceParts > 1 && plainName(parts[0]) === provinceName(parts[0])) at = 0;
  // (today's country, and nothing in it that's elsewhere now: "Kolomna, Moscow, Russia")
  if (!wroteState && (!province || province.country === today.country)) return null;
  const state = provinceState || states[states.length - 1];
  const target = province || state;
  // ("Neuendorf Village, Chortitza Mennonite Colony, …": Neuendorf)
  const town = at >= 0 ? parts[0].replace(/\s+village$/i, "").toLowerCase() : "";
  const village = town ? colonyVillage(town, province, state) : null;
  if (village) {
    return {
      key: village.key,
      country: "Ukraine",
      point: village.point,
      query: "",
      box: state.box,
      near: village.point,
      km: VILLAGE_KM,
      town,
    };
  }
  return {
    // (a republic with no dot of its own is its country's dot: "Ukrainian SSR" and "Ukraine" are one place)
    key: target.point ? target.name : target.country,
    country: target.country,
    point: target.point,
    query: town ? [town, target.country.toLowerCase()].filter(Boolean).join(", ") : "",
    box: state.box,
    near: province?.point || null,
    km: province?.km || DEFAULT_KM,
    town,
  };
}
