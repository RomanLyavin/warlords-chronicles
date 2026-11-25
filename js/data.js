(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};

  const T = { GRASS: 0, FOREST: 1, HILLS: 2, MOUNTAIN: 3, WATER: 4, SAND: 5 };

  const TERRAIN = {
    0: { id: 'grass', name: 'Луга', cost: 2, def: 0, passable: true },
    1: { id: 'forest', name: 'Лес', cost: 3, def: 0.10, passable: true },
    2: { id: 'hills', name: 'Холмы', cost: 3, def: 0.15, passable: true },
    3: { id: 'mountain', name: 'Горы', cost: 5, def: 0.25, passable: true },
    4: { id: 'water', name: 'Вода', cost: 0, def: 0, passable: false },
    5: { id: 'sand', name: 'Пустошь', cost: 3, def: 0, passable: true }
  };

  const UNITS = {
    militia: {
      id: 'militia', name: 'Ополчение', cost: 25, hp: 3, str: 2, ranged: 0,
      upkeep: 1, desc: 'Дешёвая пехота. Хороша числом.'
    },
    spearmen: {
      id: 'spearmen', name: 'Копейщики', cost: 45, hp: 4, str: 4, ranged: 0,
      upkeep: 2, desc: 'Крепкая пехота. Держит удар.'
    },
    archers: {
      id: 'archers', name: 'Лучники', cost: 55, hp: 3, str: 4, ranged: 1,
      upkeep: 2, desc: 'Стреляют до начала ближнего боя.'
    },
    cavalry: {
      id: 'cavalry', name: 'Кавалерия', cost: 80, hp: 5, str: 6, ranged: 0,
      upkeep: 3, desc: 'Сильный удар в поле, слаба в осаде.'
    },
    catapult: {
      id: 'catapult', name: 'Катапульта', cost: 110, hp: 4, str: 7, ranged: 2,
      upkeep: 4, siege: true, desc: 'Осадная машина. Игнорирует стены.'
    },
    healer: {
      id: 'healer', name: 'Лекарь', cost: 70, hp: 3, str: 1, ranged: 0,
      upkeep: 3, heal: 2, desc: 'Лечит союзников в бою.'
    },
    troll: {
      id: 'troll', name: 'Тролли', cost: 0, hp: 6, str: 6, ranged: 0,
      upkeep: 0, neutral: true, desc: 'Свирепые стражи пустошей.'
    },
    dragon: {
      id: 'dragon', name: 'Дракон', cost: 0, hp: 10, str: 10, ranged: 1,
      upkeep: 0, neutral: true, desc: 'Древний ужас, страж сокровищ.'
    }
  };

  const CITY_TIERS = {
    1: { name: 'Посёлок', prod: 12, income: 15, wall: 0.15, maxUnits: 5 },
    2: { name: 'Город', prod: 16, income: 25, wall: 0.25, maxUnits: 6 },
    3: { name: 'Крепость', prod: 20, income: 40, wall: 0.35, maxUnits: 6 }
  };

  const FACTIONS = {
    aquilonia: {
      id: 'aquilonia', name: 'Аквилония', title: 'Люди Короны',
      color: '#3f7fd4', dark: '#1d3f73', light: '#a9c8ff',
      crest: 'lion',
      desc: 'Сбалансированное королевство. +15% золота.',
      bonus: { goldMult: 1.15 },
      units: {
        militia: 'Ополчение', spearmen: 'Копейщики', archers: 'Лучники',
        cavalry: 'Рыцари', catapult: 'Требюше', healer: 'Монах'
      },
      heroes: ['Роланд', 'Эдрик', 'Бертран', 'Изабелла', 'Гавейн', 'Орвен']
    },
    mordheim: {
      id: 'mordheim', name: 'Морвейн', title: 'Тёмные Эльфы',
      color: '#9a5cf0', dark: '#4a1f7a', light: '#d3b0ff',
      crest: 'moon',
      desc: 'Народ ночи. Лучники сильнее на 25%, герои дешевле.',
      bonus: { archerStr: 1.25, heroCost: 0.8 },
      units: {
        militia: 'Тени', spearmen: 'Копья Ночи', archers: 'Тёмные стрелки',
        cavalry: 'Всадники Мглы', catapult: 'Баллиста', healer: 'Жрица'
      },
      heroes: ['Вейлорн', 'Низра', 'Иллирия', 'Дрейк', 'Морвен', 'Аэлир']
    },
    stone: {
      id: 'stone', name: 'Каменный Круг', title: 'Гномы',
      color: '#d08a3a', dark: '#6b3f14', light: '#f0c080',
      crest: 'anvil',
      desc: 'Мастера подземелий. +20% производства, копейщики крепче.',
      bonus: { prodMult: 1.2, spearmenHp: 1.2 },
      units: {
        militia: 'Стража', spearmen: 'Секироносцы', archers: 'Арбалетчики',
        cavalry: 'Горный патруль', catapult: 'Камнемёт', healer: 'Рунный жрец'
      },
      heroes: ['Тордин', 'Брунн', 'Хальдир', 'Гримма', 'Дурин', 'Балин']
    },
    kharg: {
      id: 'kharg', name: 'Орды Кхарга', title: 'Орки и Гоблины',
      color: '#7aa83a', dark: '#3d5a18', light: '#b8e070',
      crest: 'skull',
      desc: 'Дикие орды. Войска дешевле на 15%, но доход ниже.',
      bonus: { unitCostMult: 0.85, goldMult: 0.9 },
      units: {
        militia: 'Гоблины', spearmen: 'Орки-копейщики', archers: 'Лучники-гоблины',
        cavalry: 'Волчьи всадники', catapult: 'Осадный хлам', healer: 'Шаман'
      },
      heroes: ['Гхарз', 'Ургаш', 'Краг', 'Назга', 'Тхар', 'Морг']
    }
  };

  const DIFFICULTIES = {
    easy: {
      id: 'easy', name: 'Легко', short: 'Л',
      desc: 'ИИ осторожен, получает меньше золота и не нанимает героев.',
      aiIncome: 0.8, aiThreshold: 1.45, aiHero: false, extraStart: 0,
      aiVision: 9, thinkSkip: 0.18, aiWeights: { militia: 3, spearmen: 2, archers: 1.5, cavalry: 0.8, catapult: 0.2, healer: 0.2 }
    },
    normal: {
      id: 'normal', name: 'Нормально', short: 'Н',
      desc: 'Равные условия. ИИ воюет расчётливо и растит героев.',
      aiIncome: 1.0, aiThreshold: 1.1, aiHero: true, extraStart: 0,
      aiVision: 14, thinkSkip: 0, aiWeights: { militia: 1, spearmen: 2, archers: 2, cavalry: 2, catapult: 0.6, healer: 0.4 }
    },
    hard: {
      id: 'hard', name: 'Сложно', short: 'С',
      desc: 'ИИ агрессивен, богаче на 25%, начинает с усиленным гарнизоном.',
      aiIncome: 1.25, aiThreshold: 0.85, aiHero: true, extraStart: 1,
      aiVision: 99, thinkSkip: 0, aiWeights: { militia: 0.5, spearmen: 2, archers: 2, cavalry: 3, catapult: 1.5, healer: 0.6 }
    }
  };

  const Data = {
    T, TERRAIN, UNITS, CITY_TIERS, FACTIONS, DIFFICULTIES,
    unitMaxHp(type, factionKey) {
      let hp = UNITS[type].hp;
      if (factionKey === 'stone' && type === 'spearmen') hp = Math.round(hp * 1.2);
      return hp;
    },
    unitStr(type, factionKey) {
      let s = UNITS[type].str;
      if (factionKey === 'mordheim' && type === 'archers') s *= 1.25;
      return s;
    },
    unitCost(type, factionKey) {
      let c = UNITS[type].cost;
      const f = FACTIONS[factionKey];
      if (f && f.bonus.unitCostMult) c *= f.bonus.unitCostMult;
      return Math.round(c);
    },
    heroCost(factionKey) {
      const f = FACTIONS[factionKey];
      let c = 180;
      if (f && f.bonus.heroCost) c *= f.bonus.heroCost;
      return Math.round(c);
    },
    unitName(factionKey, type) {
      const f = FACTIONS[factionKey];
      if (f && f.units[type]) return f.units[type];
      return UNITS[type] ? UNITS[type].name : type;
    }
  };

  WL.Data = Data;
  WL.SCENARIOS = [];
})();
