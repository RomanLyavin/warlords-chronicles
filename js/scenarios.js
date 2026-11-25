(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};

  WL.SCENARIOS = [
    {
      id: 'valley',
      name: 'Долина Начала',
      subtitle: 'Первые шаги',
      desc: 'Небольшая долина на границе двух королевств. Шесть городов, древние курганы и храм. Идеально для знакомства с войной.',
      w: 24, h: 16, seed: 7331,
      factions: ['aquilonia', 'mordheim'],
      cities: [
        { x: 3, y: 12, name: 'Ривенделл', tier: 2, owner: 0 },
        { x: 20, y: 13, name: 'Тёмный Шпиль', tier: 2, owner: 1 },
        { x: 21, y: 3, name: 'Морвейн', tier: 1, owner: 1 },
        { x: 7, y: 8, name: 'Мостовая', tier: 1, owner: -1 },
        { x: 11, y: 4, name: 'Сосновый Бор', tier: 2, owner: -1 },
        { x: 14, y: 11, name: 'Кремневая Падь', tier: 1, owner: -1 },
        { x: 18, y: 7, name: 'Ветроград', tier: 2, owner: -1 }
      ],
      sites: [
        { kind: 'mine', x: 6, y: 3, name: 'Медный рудник' },
        { kind: 'mine', x: 17, y: 13, name: 'Золотая жила' },
        { kind: 'ruin', x: 9, y: 13, name: 'Курган Аш-Нара' },
        { kind: 'ruin', x: 16, y: 4, name: 'Башня Забвения' },
        { kind: 'temple', x: 12, y: 8, name: 'Храм Света' }
      ]
    },
    {
      id: 'marches',
      name: 'Спорные Земли',
      subtitle: 'Три короны',
      desc: 'Плодородные равнины, за которые бьются три народа. Одиннадцать городов, богатые рудники и крепость в самом сердце земель.',
      w: 30, h: 20, seed: 19427,
      factions: ['aquilonia', 'mordheim', 'stone'],
      cities: [
        { x: 4, y: 16, name: 'Орлиное Гнездо', tier: 2, owner: 0 },
        { x: 26, y: 4, name: 'Ночной Предел', tier: 2, owner: 1 },
        { x: 26, y: 15, name: 'Железный Чертог', tier: 2, owner: 2 },
        { x: 8, y: 12, name: 'Тихий Брод', tier: 1, owner: -1 },
        { x: 13, y: 16, name: 'Серебряный Ключ', tier: 2, owner: -1 },
        { x: 5, y: 7, name: 'Вересковый Холм', tier: 1, owner: -1 },
        { x: 12, y: 6, name: 'Совиная Башня', tier: 2, owner: -1 },
        { x: 18, y: 10, name: 'Корона Пустошей', tier: 3, owner: -1 },
        { x: 21, y: 3, name: 'Северный Пост', tier: 1, owner: -1 },
        { x: 20, y: 16, name: 'Соляной Тракт', tier: 1, owner: -1 },
        { x: 15, y: 11, name: 'Развилка', tier: 1, owner: -1 }
      ],
      sites: [
        { kind: 'mine', x: 10, y: 9, name: 'Самоцветный рудник' },
        { kind: 'mine', x: 23, y: 8, name: 'Золотой рудник' },
        { kind: 'mine', x: 6, y: 3, name: 'Оловянные штольни' },
        { kind: 'ruin', x: 16, y: 4, name: 'Руины Ксара' },
        { kind: 'ruin', x: 9, y: 17, name: 'Затонувший храм' },
        { kind: 'ruin', x: 24, y: 12, name: 'Костяная башня' },
        { kind: 'temple', x: 17, y: 14, name: 'Храм Зари' },
        { kind: 'temple', x: 2, y: 11, name: 'Скит Отшельника' }
      ]
    },
    {
      id: 'crown',
      name: 'Кровавая Корона',
      subtitle: 'Война всех против всех',
      desc: 'Четыре народа сошлись у древней короны. Четырнадцать городов, драконьи сокровища и сильные гарнизоны. Победит только один.',
      w: 34, h: 22, seed: 90210,
      factions: ['aquilonia', 'mordheim', 'stone', 'kharg'],
      cities: [
        { x: 4, y: 18, name: 'Аквилон', tier: 2, owner: 0 },
        { x: 30, y: 3, name: 'Морвейн', tier: 2, owner: 1 },
        { x: 31, y: 18, name: 'Каменный Круг', tier: 2, owner: 2 },
        { x: 17, y: 3, name: 'Кхарг', tier: 2, owner: 3 },
        { x: 10, y: 14, name: 'Сломанный Мост', tier: 2, owner: -1 },
        { x: 15, y: 18, name: 'Пепельная Падь', tier: 1, owner: -1 },
        { x: 8, y: 8, name: 'Зелёный Дол', tier: 2, owner: -1 },
        { x: 13, y: 4, name: 'Волчья Гряда', tier: 1, owner: -1 },
        { x: 18, y: 9, name: 'Цитадель Теней', tier: 3, owner: -1 },
        { x: 23, y: 5, name: 'Грозовой Пик', tier: 2, owner: -1 },
        { x: 24, y: 14, name: 'Три Дороги', tier: 1, owner: -1 },
        { x: 20, y: 19, name: 'Южный Форт', tier: 1, owner: -1 },
        { x: 27, y: 9, name: 'Сторожевая', tier: 1, owner: -1 },
        { x: 6, y: 12, name: 'Криница', tier: 1, owner: -1 }
      ],
      sites: [
        { kind: 'mine', x: 12, y: 19, name: 'Серебряные штольни' },
        { kind: 'mine', x: 28, y: 12, name: 'Золотая жила' },
        { kind: 'mine', x: 19, y: 2, name: 'Копи Кхарга' },
        { kind: 'mine', x: 3, y: 8, name: 'Гномьи шахты' },
        { kind: 'ruin', x: 16, y: 12, name: 'Руины Мор-Тана' },
        { kind: 'ruin', x: 26, y: 18, name: 'Проклятый курган' },
        { kind: 'ruin', x: 9, y: 3, name: 'Башня Пепла' },
        { kind: 'ruin', x: 22, y: 20, name: 'Кости Дракона' },
        { kind: 'temple', x: 11, y: 8, name: 'Храм Луны' },
        { kind: 'temple', x: 24, y: 10, name: 'Святилище Грома' }
      ]
    }
  ];
})();
