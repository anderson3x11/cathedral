// Playthrough sheets: what a player tracks during a Persona run (social links, social stats, collectibles,
// requests, equipment). Content lists are per game; progress is saved in the browser by the Playthrough view.
// Started from the owner's own Google Sheets for P5R, P4G and P3R.

export interface Checklist { title: string; groups: { name: string; items: string[] }[] }
export interface SheetDef {
  links: [string, string][];     // [arcana, character]; names stay hidden until met (spoilers)
  linkMax: number;
  stats: string[];
  statRanks: number;
  rankNames: { [stat: string]: string[] };  // in-game name of each rank, lowest first
  lists: Checklist[];            // fixed checklists (books, locations, games, requests...)
  freeRequests: boolean;         // players add their own requests (no fixed list for this game yet)
  gear: { lead: string; slots: string[] };  // only the protagonist is listed: party members are added by the player (no spoilers)
}

export const SHEETS: { [id: string]: SheetDef } = {
  p5r: {
    links: [
      ['Fool', 'Igor'], ['Magician', 'Morgana'], ['Priestess', 'Makoto'], ['Empress', 'Haru'], ['Emperor', 'Yusuke'],
      ['Hierophant', 'Sojiro'], ['Lovers', 'Ann'], ['Chariot', 'Ryuji'], ['Justice', 'Akechi'], ['Hermit', 'Futaba'],
      ['Fortune', 'Chihaya'], ['Strength', 'Caroline and Justine'], ['Hanged Man', 'Iwai'], ['Death', 'Takemi'],
      ['Temperance', 'Kawakami'], ['Devil', 'Ohya'], ['Tower', 'Shinya'], ['Star', 'Hifumi'], ['Moon', 'Mishima'],
      ['Sun', 'Yoshida'], ['Judgement', 'Sae'], ['Councillor', 'Maruki'], ['Faith', 'Kasumi'],
    ],
    linkMax: 10,
    stats: ['Knowledge', 'Guts', 'Proficiency', 'Kindness', 'Charm'],
    statRanks: 5,
    rankNames: {
      Knowledge: ['Oblivious', 'Learned', 'Scholarly', 'Encyclopedic', 'Erudite'],
      Guts: ['Milquetoast', 'Bold', 'Staunch', 'Dauntless', 'Lionhearted'],
      Proficiency: ['Bumbling', 'Decent', 'Skilled', 'Masterful', 'Transcendent'],
      Kindness: ['Inoffensive', 'Considerate', 'Empathetic', 'Selfless', 'Angelic'],
      Charm: ['Existent', 'Head-Turning', 'Suave', 'Charismatic', 'Debonair'],
    },
    lists: [
      { title: 'Books', groups: [
        { name: 'Leblanc', items: ['Yoncha Wanderer 04', 'On Modern Social'] },
        { name: 'From requests', items: ['Chinese Sweets', 'Theme Park Escort', 'Shita-machi Reborn'] },
        { name: 'Sakai Trader', items: ['Factorization Guide'] },
        { name: 'Shibuya bookstore', items: ['Playing the Game', 'Wise Men\'s Words', 'Ghost Encounters', 'The Art of Charm', 'Buchiko\'s Story',
          'Medjed Menace', 'Weekend Parks', 'Fishpond Spotter', 'Aquarium-a-Day', 'Vague', 'Nightlife Hotspots', 'Musty Pages',
          'Museum of Stars', 'Tokyo Shrines', 'Tidying the Heart'] },
        { name: 'Shibuya sports shop', items: ['Expert Billiards'] },
        { name: 'Library', items: ['The Great Thief', 'Pirate Legend', 'Zorro the Outlaw', 'The Alluring Dancer', 'The Gallant Rogue',
          'The Illusory Popess', 'Cry of Cthulu', 'Woman in the Dark', 'Dressed in Ashes', 'The Hero with a Bow', 'Speed Reader'] },
        { name: 'Shinjuku bookstore', items: ['Flowerpedia', 'Batting Science', 'Essence of Fishing', 'The Craft of Cinema', 'Game Secrets',
          'Learn PRO Darts', 'The ABCs of Crafting'] },
        { name: 'Jinbocho bookstore', items: ['Master Swordsman', 'Call Me Chief', 'Reckless Casanova', 'Heroic Revelations', 'The Art of Automata',
          'Knowing the Heart', 'Speed Reading'] },
      ] },
      { title: 'Locations', groups: [
        { name: 'Places to visit', items: ['Wilton Buffet (Shibuya)', 'Ramen shop (Ogikubo)', 'Monjayaki (Tsukishima)', 'Inokashira Park', 'Seaside Park (Odaiba)',
          'Dome Town (Suidobashi)', 'Red-light district (Shinjuku)', 'Takenoko (Harajuku)', 'Aquarium (Shinagawa)', 'Promenade (Kichijoji)',
          'Meiji Shrine', 'Akihabara', 'Nakano', 'Art museum (Ueno)', 'Nakamise (Asakusa)', 'Church (Kanda)', 'Theme park (Maihama)',
          'Planetarium (Ikebukuro)', 'Jinbocho', 'Chinatown', 'Fishing pond (Ichigaya)', 'Sushi (Ginza)'] },
      ] },
      { title: 'Video games', groups: [
        { name: 'Second-hand shop', items: ['Star Forneus', 'Gambla'] },
        { name: 'Akihabara', items: ['Punch Ouch', 'Train of Life', 'Power Intuition', 'Featherman', 'Golfer'] },
      ] },
      { title: 'Mementos requests', groups: [
        { name: 'Requests', items: ['Beware the Clingy Ex-boyfriend', 'The Bark and Bite of a Bully', 'One Who Bullies Bullies',
          'If Cats Disappeared from the City', 'An Elderly\'s Meaning of Life', 'Phantom Thieves VS Burglary Ring', 'Sadism Is Just a Sign of Love',
          'Part-time Job, Full-time Hell', 'Bad Medicine', 'Ending the Boyfriend\'s Abuse', 'A Teacher Maid to Suffer',
          'The Lovesick Cyberstalking Girl', 'Calling for Justice for Cats', 'Debunking the Psychic!', 'Shady Deal in the Shadows',
          'Who\'s Been Assaulting People?', 'We Aren\'t Just Your Slaves', 'Fighting for Truth in Journalism', 'Who\'s Muscling in Yongen-Jaya?',
          'Man of Many Faces and Debts', 'Winners Don\'t Use Cheats', 'Upstaging the Stage Mother', 'The Killer Who Cleans Up Trash',
          'The Money-grubbing Uncle', 'Daughter\'s Just a Meal Ticket', 'A Mother\'s Aggression', 'Swindling Old Folk is Pretty Low',
          'Lady-Killer\'s Ballad', 'The Head Honcho in Showbiz', 'A Small Cry for Help', 'O My Young Sister, I Cry For You',
          'An Idol and a Unicorn', 'Fake-Man Show'] },
      ] },
    ],
    freeRequests: false,
    gear: { lead: 'Joker', slots: ['Melee', 'Gun', 'Protector', 'Accessory'] },
  },
  p4g: {
    links: [
      ['Fool', 'Investigation Team'], ['Magician', 'Yosuke'], ['Priestess', 'Yukiko'], ['Empress', 'Margaret'], ['Emperor', 'Kanji'],
      ['Hierophant', 'Dojima'], ['Lovers', 'Rise'], ['Chariot', 'Chie'], ['Justice', 'Nanako'], ['Hermit', 'Fox'], ['Fortune', 'Naoto'],
      ['Strength', 'Sports club'], ['Hanged Man', 'Naoki'], ['Death', 'Hisano'], ['Temperance', 'Eri'], ['Devil', 'Sayoko'],
      ['Tower', 'Shu'], ['Star', 'Teddie'], ['Moon', 'Ai'], ['Sun', 'Culture club'], ['Judgement', 'Seekers of Truth'],
      ['Aeon', 'Marie'], ['Jester', 'Adachi'],
    ],
    linkMax: 10,
    stats: ['Courage', 'Diligence', 'Understanding', 'Expression', 'Knowledge'],
    statRanks: 5,
    rankNames: {
      Courage: ['Average', 'Reliable', 'Brave', 'Daring', 'Heroic'],
      Diligence: ['Callow', 'Persistent', 'Strong', 'Thorough', 'Rock Solid'],
      Understanding: ['Basic', 'Kindly', 'Generous', 'Motherly', 'Saintly'],
      Expression: ['Rough', 'Eloquent', 'Persuasive', 'Touching', 'Enthralling'],
      Knowledge: ['Aware', 'Informed', 'Expert', 'Professor', 'Sage'],
    },
    lists: [],
    freeRequests: true,
    gear: { lead: 'Protagonist', slots: ['Weapon', 'Armor', 'Footwear', 'Accessory'] },
  },
  p3r: {
    links: [
      ['Fool', 'SEES'], ['Magician', 'Kenji'], ['Priestess', 'Fuuka'], ['Empress', 'Mitsuru'], ['Emperor', 'Hidetoshi'],
      ['Hierophant', 'Bunkichi and Mitsuko'], ['Lovers', 'Yukari'], ['Chariot', 'Kazushi'], ['Justice', 'Chihiro'], ['Hermit', 'Maya'],
      ['Fortune', 'Keisuke'], ['Strength', 'Yuko'], ['Hanged Man', 'Maiko'], ['Death', 'Pharos'], ['Temperance', 'Bebe'],
      ['Devil', 'Tanaka'], ['Tower', 'Mutatsu'], ['Star', 'Mamoru'], ['Moon', 'Nozomi'], ['Sun', 'Akinari'],
      ['Judgement', 'Nyx Annihilation Team'], ['Aeon', 'Aigis'],
    ],
    linkMax: 10,
    stats: ['Academics', 'Charm', 'Courage'],
    statRanks: 6,
    rankNames: {
      Academics: ['Slacker', 'Average', 'Above Average', 'Smart', 'Intelligent', 'Genius'],
      Charm: ['Plain', 'Unpolished', 'Confident', 'Smooth', 'Popular', 'Charismatic'],
      Courage: ['Timid', 'Ordinary', 'Determined', 'Tough', 'Fearless', 'Badass'],
    },
    lists: [],
    freeRequests: true,
    gear: { lead: 'Protagonist', slots: ['Weapon', 'Armor', 'Footwear', 'Accessory'] },
  },
};
