// The villages of the two Mennonite mother colonies and where they are today, for the migration maps
// (2026-10-23: renamed villages like Chortitza, Blumengart and Neuendorf, map-only). OpenStreetMap doesn't know them by their German names and Wikidata knows few,
// so they're here. Names: ukwiki "Хортицький колоністський округ" / "Молочанський менонітський округ"
// tables (their "Rosenhart" and "Neuenberg" are Rosengart and Neuenburg); points: Wikidata P625 of the
// ukwiki article, after redirects. Blumengart and Eichenfeld (Chortitza), and Muntau, Margenau,
// Alexandertal, Franztal, Nikolaidorf, Paulsheim, Alexanderkrone and Steinfeld (Molotschna) have no
// point anywhere found, so they stay on the colony's dot; Neu-Halbstadt, now part of Molochansk, takes
// Halbstadt's. Elisabethtal's link was to a namesake 620 km off. Villages that merged share a point
// (Ohrloff, Tiege, Blumenort and Rosenort are Orlove).
//
// [German name, [lon, lat], other spellings]; the comment is today's village and its Wikidata item.
export const CHORTITZA_VILLAGES = [
  ["Adelsheim", [34.9687, 48.0846], ""], // Dolynivka, Q4164996
  ["Burwalde", [35.0622, 47.805], "Bärwalde"], // Baburka, Q4074542
  ["Insel Chortitza", [35.1175, 47.85], "Chortitza Island, Khortitsa Island"], // Zaporizhzhia, Q157835
  ["Kronsweide", [35.0936, 47.9325], ""], // Великий Луг (Запоріжжя), Q12088335
  ["Kronsthal", [34.9432, 47.7883], ""], // Dolynske, Q4165026
  ["Neuhorst", [34.8525, 47.9551], ""], // Zelenyi Hai, Q4190855
  ["Neuenburg", [34.9915, 47.939], "Neuenberg"], // Malyshivka, Q4279328
  ["Neuendorf", [34.9013, 47.9114], ""], // Shyroke, Q4524429
  ["Osterwick", [34.9432, 47.7883], "Neu-Osterwick"], // Dolynske, Q4165026
  ["Nieder-Chortitza", [35.1314, 47.7703], "Niederchortitza"], // Nyzhnia Khortytsia, Q4319440
  ["Rosengart", [35.0098, 47.8106], "Rosengard, Rosenhart"], // Novoslobidka, Q4325535
  ["Rosenthal", [35.0147, 47.8551], ""], // Rosental, Q12148407
  ["Franzfeld", [35.3317, 48.2007], ""], // Varvarivka, Q4103633
  ["Chortitza", [35.0116, 47.8615], ""], // Verkhnya Khortytsia, Q4109008
  ["Schöneberg", [34.9734, 47.7578], "Schönberg"], // Smoliane, Q4425145
  ["Schönhorst", [34.8839, 47.8819], ""], // Ruchaivka, Q4401262
  ["Einlage", [35.05, 47.85], "Kitschkas, Kichkas"], // Kichkas, Q4222596
];
export const MOLOTSCHNA_VILLAGES = [
  ["Halbstadt", [35.5985, 47.2038], ""], // Molochansk, Q1006629
  // (no point of its own: it's part of Molochansk now, so Halbstadt's; 2026-10-23)
  ["Neu-Halbstadt", [35.5985, 47.2038], "Neuhalbstadt"], // Molochansk, Q1006629
  ["Schönau", [35.5615, 47.151], ""], // Dolyna, Q4164917
  ["Fischau", [35.5407, 47.1261], ""], // Rybalivka, Q4401452
  ["Lindenau", [35.5272, 47.1107], ""], // Liubymivka, Q4271557
  ["Lichtenau", [35.5103, 47.0831], ""], // Svitlodolynske, Q4410401
  ["Blumstein", [35.497, 47.0664], ""], // Kamianske, Q4211416
  ["Münsterberg", [35.4769, 47.0413], ""], // Prylukivka, Q4378589
  ["Altonau", [35.4724, 47.0128], ""], // Travneve, Q4461702
  ["Ladekopp", [35.7058, 47.2514], ""], // Tokmak, Q760235
  ["Schönsee", [35.8389, 47.2468], ""], // Snihurivka, Q4425452
  ["Petershagen", [35.6371, 47.223], ""], // Petershahen, Q7246776
  ["Tiegenhagen", [35.5762, 47.1761], ""], // Levadne, Q4256193
  ["Ohrloff", [35.5809, 47.0681], "Orloff, Orlov"], // Orlove, Q4336835
  ["Tiege", [35.5809, 47.0681], ""], // Orlove, Q4336835
  ["Blumenort", [35.5809, 47.0681], ""], // Orlove, Q4336835
  ["Rosenort", [35.5809, 47.0681], ""], // Orlove, Q4336835
  ["Fürstenau", [35.7735, 47.2478], ""], // Luhivka, Q4268030
  ["Rückenau", [35.7937, 47.1085], ""], // Kozoluhivka, Q4226997
  ["Lichtfelde", [35.8159, 47.0489], ""], // Hrushivka, Q4150886
  ["Neukirch", [35.862, 47.0449], ""], // Udarnyk, Q4469305
  ["Schardau", [36.1106, 47.0173], ""], // Iline, Q4344397
  ["Pordenau", [36.1106, 47.0173], ""], // Iline, Q4344397
  ["Marienthal", [36.1106, 47.0173], ""], // Iline, Q4344397
  ["Rudnerweide", [36.1651, 47.0642], ""], // Rozivka, Q4396673
  ["Alexanderwohl", [35.8367, 47.15], ""], // Svitle, Q4410426
  ["Fürstenwerder", [35.8172, 47.1307], ""], // Balkove, Q4076694
  ["Gnadenheim", [35.8696, 47.1572], ""], // Balashivka, Q4076507
  ["Tiegerweide", [35.7431, 47.1055], ""], // Mostove, Q4304677
  ["Liebenau", [35.8957, 47.2541], ""], // Ostrykivka, Q4338728
  ["Wernersdorf", [35.8957, 47.2541], ""], // Ostrykivka, Q4338728
  ["Friedensdorf", [35.899, 47.1639], ""], // Khmelnytske, Q4498489
  ["Prangenau", [35.862, 47.0449], ""], // Udarnyk, Q4469305
  ["Sparrau", [36.1221, 47.1141], ""], // Dovhe, Q4164618
  ["Konteniusfeld", [36.1221, 47.1141], "Kontenius"], // Dovhe, Q4164618
  ["Gnadenfeld", [36.0479, 47.1058], ""], // Bohdanivka, Q4089380
  ["Waldheim", [36.0047, 47.1659], ""], // Vladivka, Q4113354
  ["Landskrone", [35.9361, 47.1682], ""], // Lankove, Q4253956
  ["Hierschau", [36.0047, 47.1659], "Hirschau"], // Vladivka, Q4113354
  ["Kleefeld", [35.7513, 47.0533], ""], // Rozkishne, Q4397789
  ["Mariawohl", [35.9608, 47.1009], ""], // Zelenyi Yar, Q4190938
  ["Friedensruh", [35.862, 47.0449], "Friedensruhe"], // Udarnyk, Q4469305
  ["Gnadenthal", [35.9042, 47.1289], ""], // Blahodatne, Q4087861
  ["Hamberg", [36.0193, 47.2285], ""], // Kamianka, Q4211013
  ["Klippenfeld", [36.0909, 47.2218], ""], // Stulneve, Q4444657
  ["Fabrikerwiese", [35.8061, 47.2472], ""], // Fabrychne, Q4480357
  ["Grossweide", [36.2166, 47.0894], ""], // Prostore, Q4381532
  ["Pastwa", [36.2888, 47.0939], ""], // Kvitkove, Q4218726
];
