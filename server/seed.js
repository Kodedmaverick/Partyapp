// Seed data from the organiser's original setup (see SPEC.md §12).
// [iso2, isoNumeric, name, lat, lon, visited]
export const COUNTRIES = [
  // Been there (the organiser's list, in their order)
  ['US','840','United States',39.8,-98.6,true],['GB','826','United Kingdom',54.0,-2.76,true],['MY','458','Malaysia',4.2,101.9,true],
  ['OM','512','Oman',20.59,56.06,true],['KE','404','Kenya',0.2,37.9,true],['IT','380','Italy',42.8,12.6,true],
  ['AR','032','Argentina',-38.4,-63.6,true],['PA','591','Panama',8.5,-80.8,true],['BE','056','Belgium',50.5,4.5,true],
  ['RU','643','Russia',61.5,105.3,true],['MX','484','Mexico',23.6,-102.6,true],['VG','092','British Virgin Islands',18.42,-64.64,true],
  ['KN','659','St Kitts and Nevis',17.3,-62.7,true],['LC','662','St Lucia',13.9,-60.98,true],['TR','792','Turkey',39.0,35.2,true],
  ['GE','268','Georgia',42.3,43.4,true],['UG','800','Uganda',1.4,32.3,true],['FR','250','France',46.6,2.4,true],
  ['NL','528','Netherlands',52.1,5.3,true],['GH','288','Ghana',7.9,-1.0,true],['BJ','204','Benin',9.3,2.3,true],
  ['TG','768','Togo',8.6,0.8,true],['QA','634','Qatar',25.3,51.2,true],['SK','703','Slovakia',48.7,19.7,true],
  ['CZ','203','Czech Republic',49.8,15.5,true],['AT','040','Austria',47.5,14.6,true],
  // Not been
  ['ES','724','Spain',40.4,-3.7,false],['PT','620','Portugal',39.6,-8.0,false],['DE','276','Germany',51.2,10.4,false],
  ['GR','300','Greece',39.1,21.8,false],['CH','756','Switzerland',46.8,8.2,false],['IE','372','Ireland',53.4,-8.2,false],
  ['BR','076','Brazil',-14.2,-51.9,false],['CL','152','Chile',-35.7,-71.5,false],['CR','188','Costa Rica',9.7,-83.8,false],
  ['JM','388','Jamaica',18.1,-77.3,false],['BB','052','Barbados',13.19,-59.54,false],['EG','818','Egypt',26.8,30.8,false],
  ['ZA','710','South Africa',-30.6,22.9,false],['TZ','834','Tanzania',-6.4,34.9,false],['TH','764','Thailand',15.9,101.0,false],
  ['SG','702','Singapore',1.35,103.8,false],['JP','392','Japan',36.2,138.3,false],['AE','784','United Arab Emirates',23.4,53.8,false],
  ['AM','051','Armenia',40.1,45.0,false]
];
export const SEED_VERSION = 2;

export const QUESTIONS = [
  ['food','What would you order for your first meal there?'],['food',"What's a snack you'd bring home in your suitcase?"],
  ['food','Where would you go for breakfast on a slow morning?'],['food',"What's a dish you'd tell us to try, even if it sounds odd?"],
  ['transport',"Describe how you'd get from the airport to where you're staying."],['transport',"What's the best way to get around once you're there?"],
  ['transport',"Tell us about the longest journey you'd take inside the country."],['arrival',"What's the first thing you'd notice stepping off the plane?"],
  ['arrival',"What would the weather be like the week you'd go?"],['arrival','What would you do on your first evening?'],
  ['atmosphere',"What's one thing that would surprise a first-time visitor?"],['atmosphere','What does a busy street there sound like?'],
  ['atmosphere','How do people greet each other there?'],['atmosphere','What time of day does the place really come alive?'],
  ['places','Which place would you tell a friend to visit first?'],['places','Where would you go for the best view?'],
  ['places',"What's one popular spot you'd skip, and why?"],['places','Where would you buy a gift for someone back home?'],
  ['stories','Tell us about a small moment you remember from being there.'],['stories',"Who's the most interesting person you'd expect to meet?"],
  ['stories',"What's a local phrase you'd want to know before arriving?"],['stories',"Describe a photo you'd take there."],
  ['packing','What would you pack differently for another trip?'],['packing',"What's one thing you'd be glad you brought?"],
  ['packing','What would you wear for a night out there?'],['packing','How would you pay for things day to day?']
];
