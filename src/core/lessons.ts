import type { LayoutId } from "./layouts.ts"
import type { Result } from "./session.ts"

export interface Goal {
  /** Minimal speed, characters per minute. */
  readonly minCpm: number
  /** Minimal accuracy, percent. */
  readonly minAccuracy: number
}

export interface Lesson {
  readonly id: string
  readonly layout: LayoutId
  readonly title: string
  /** What to tell the student before the start. */
  readonly hint: string
  readonly text: string
  readonly goal: Goal
  /** Characters this lesson introduces (lower case); the text uses only these and the ones from earlier lessons. */
  readonly newKeys: string
}

/** Lessons that train one group of keys, e.g. the home row. */
export interface Unit {
  readonly id: string
  readonly layout: LayoutId
  readonly title: string
  readonly lessons: readonly Lesson[]
}

export interface Score {
  readonly passed: boolean
  /** 0–3: 1 for meeting the goal, +1 for 1.5× speed, +1 for 98% accuracy. */
  readonly stars: 0 | 1 | 2 | 3
}

const BONUS_SPEED = 1.5
const BONUS_ACCURACY = 98

/** Did the run meet the lesson goal, and how many stars it earns. */
export const score = (r: Result, goal: Goal): Score => {
  const passed = r.cpm >= goal.minCpm && r.accuracy >= goal.minAccuracy
  if (!passed) return { passed, stars: 0 }
  const fast = r.cpm >= goal.minCpm * BONUS_SPEED ? 1 : 0
  const accurate = r.accuracy >= BONUS_ACCURACY ? 1 : 0
  return { passed, stars: (1 + fast + accurate) as Score["stars"] }
}

const BEGINNER: Goal = { minCpm: 40, minAccuracy: 90 }
const HOME_ROW: Goal = { minCpm: 60, minAccuracy: 92 }
const ROWS: Goal = { minCpm: 70, minAccuracy: 92 }
const WORDS: Goal = { minCpm: 80, minAccuracy: 93 }
const SIGNS: Goal = { minCpm: 60, minAccuracy: 90 }
const TEXTS: Goal = { minCpm: 100, minAccuracy: 94 }

type LessonSpec = Omit<Lesson, "layout">

const unit = (id: string, layout: LayoutId, title: string, specs: readonly LessonSpec[]): Unit => ({
  id,
  layout,
  title,
  lessons: specs.map((s) => ({ ...s, layout }))
})

export const units: readonly Unit[] = [
  unit("uk-home", "uk", "Основний ряд", [
    {
      id: "uk-home-1",
      title: "Основний ряд: А і О",
      hint: "Поклади вказівні пальці на клавіші А і О: на них є горбики. Великий палець — на пробілі.",
      text: "ааа ооо ааа ооо ао оа ао оа аоа оао аа оо ао оа",
      goal: BEGINNER,
      newKeys: "ао "
    },
    {
      id: "uk-home-2",
      title: "Основний ряд: В і Л",
      hint: "Середні пальці лежать на В і Л. Після кожної літери повертай палець на місце.",
      text: "ввв ллл вл лв ава оло вал лав вола лава ало вал",
      goal: BEGINNER,
      newKeys: "вл"
    },
    {
      id: "uk-home-3",
      title: "Основний ряд: І і Д",
      hint: "Безіменні пальці лежать на І і Д.",
      text: "ііі ддд ід ді від дід віл дало вода лід далі ліва",
      goal: BEGINNER,
      newKeys: "ід"
    },
    {
      id: "uk-home-4",
      title: "Основний ряд: Ф і Ж",
      hint: "Мізинці лежать на Ф і Ж. Тепер усі вісім пальців на своїх місцях.",
      text: "ффф жжж фж жф жало вожді фал жвава ждала дожді",
      goal: BEGINNER,
      newKeys: "фж"
    },
    {
      id: "uk-home-pr",
      title: "Основний ряд: П і Р",
      hint: "П натискай лівим вказівним, Р — правим: палець робить маленький крок до центру й повертається.",
      text: "ппп ррр пр рп пара рада лапа ріпа пора жар пожар двір вправа парад",
      goal: BEGINNER,
      newKeys: "пр"
    },
    {
      id: "uk-home-ye",
      title: "Основний ряд: Є",
      hint: "Є — праворуч від Ж. Тягнися правим мізинцем, решта пальців лишається на місці.",
      text: "єєє жєж дає падає плаває віддає радіє жаліє воліє подає пропадає",
      goal: BEGINNER,
      newKeys: "є"
    },
    {
      id: "uk-home-words",
      title: "Слова з основного ряду",
      hint: "Друкуй рівно, не поспішай. Точність важливіша за швидкість.",
      text: "вода діло лава жвава лід дідові відділ вола ждала ліва фал",
      goal: HOME_ROW,
      newKeys: ""
    },
    {
      id: "uk-home-caps",
      title: "Великі літери",
      hint: "Shift натискай мізинцем іншої руки: для «О» — лівий Shift, для «В» — правий.",
      text: "Вода Лава Діло Ліда Віл Алла Ода Дід Вова Жало",
      goal: BEGINNER,
      newKeys: ""
    }
  ]),
  unit("uk-top", "uk", "Верхній ряд", [
    {
      id: "uk-top-kg",
      title: "Верхній ряд: К і Г",
      hint: "К — над А, натискай лівим вказівним. Г — над О, правим вказівним.",
      text: "ккк ггг кг гк гора кора крок рак гак лак кров дорога голова плакав гавкав",
      goal: ROWS,
      newKeys: "кг"
    },
    {
      id: "uk-top-en",
      title: "Верхній ряд: Е і Н",
      hint: "Е і Н — у самому центрі. Вказівні пальці тягнуться навскіс угору.",
      text: "еее ннн ен не поле перо нога вікно пенал дерево ранок жінка гнів пекар лелека",
      goal: ROWS,
      newKeys: "ен"
    },
    {
      id: "uk-top-ush",
      title: "Верхній ряд: У і Ш",
      hint: "У натискай лівим середнім пальцем, Ш — правим середнім.",
      text: "ууу шшш уш шу рука груша душа шапка вушко шкіра пошук друг лук дуже шкода",
      goal: ROWS,
      newKeys: "уш"
    },
    {
      id: "uk-top-tsshch",
      title: "Верхній ряд: Ц і Щ",
      hint: "Ц — лівий безіменний, Щ — правий безіменний.",
      text: "ццц щщщ цщ щц дощ кущ щука цукор цегла площа палац оцінка щедро цукерка щогла",
      goal: ROWS,
      newKeys: "цщ"
    },
    {
      id: "uk-top-yz",
      title: "Верхній ряд: Й і З",
      hint: "Й — лівий мізинець, З — правий мізинець.",
      text: "ййй ззз йз зй гай край гроза ваза лоза зірка зерно казка фазан дзвін гойдалка",
      goal: ROWS,
      newKeys: "йз"
    },
    {
      id: "uk-top-khyi",
      title: "Верхній ряд: Х, Ї і Ґ",
      hint: "Х, Ї і Ґ — у правому кінці ряду. Усі три натискає правий мізинець.",
      text: "ххх їїї ґґґ хор дух вухо горіх кожух їжак їжа їде гаї краї ґанок ґава",
      goal: ROWS,
      newKeys: "хїґ"
    },
    {
      id: "uk-top-words",
      title: "Слова з двох рядів",
      hint: "Після кожної літери пальці повертаються на основний ряд.",
      text: "на дереві горіх у полі зелене зерно на ґанку їжак друг шукає дорогу в гай",
      goal: WORDS,
      newKeys: ""
    }
  ]),
  unit("uk-bottom", "uk", "Нижній ряд", [
    {
      id: "uk-bottom-mytj",
      title: "Нижній ряд: М, И, Т і Ь",
      hint: "М і И натискає лівий вказівний, Т і Ь — правий вказівний. Пальці опускаються вниз і повертаються.",
      text: "ммм иии ттт ььь мама тато мати кіт кінь тінь день тиша миша дитина вітер літо",
      goal: ROWS,
      newKeys: "мить"
    },
    {
      id: "uk-bottom-sb",
      title: "Нижній ряд: С і Б",
      hint: "С — лівий середній палець, Б — правий середній.",
      text: "ссс ббб сб бс сад сова село небо хліб сонце брат батько собака стіл білка сміх",
      goal: ROWS,
      newKeys: "сб"
    },
    {
      id: "uk-bottom-chyu",
      title: "Нижній ряд: Ч і Ю",
      hint: "Ч — лівий безіменний, Ю — правий безіменний.",
      text: "ччч ююю чю юч ніч очі річка вечір чашка ключ юнак люди юшка читаю",
      goal: ROWS,
      newKeys: "чю"
    },
    {
      id: "uk-bottom-ya",
      title: "Нижній ряд: Я і крапка",
      hint: "Я — лівий мізинець. Крапка — праворуч від Ю, її натискає правий мізинець.",
      text: "яяя ... я. я. яблуко. земля. пісня. мрія. моя мама. я читаю. ясно.",
      goal: ROWS,
      newKeys: "я."
    },
    {
      id: "uk-bottom-words",
      title: "Речення з усіх літер",
      hint: "Тепер ти знаєш усі літери. Велика літера на початку речення — через Shift.",
      text: "Сонце сяє. Діти біжать до річки. Бабуся пече смачні пиріжки. Ми любимо свою школу.",
      goal: WORDS,
      newKeys: ""
    }
  ]),
  unit("uk-signs", "uk", "Знаки і цифри", [
    {
      id: "uk-signs-apostrophe",
      title: "Апостроф",
      hint: "Апостроф — ліворуч від цифри 1, натискай лівим мізинцем.",
      text: "''' м'яч сім'я п'ять дев'ять пір'я м'ята в'юн з'їв під'їзд ім'я",
      goal: SIGNS,
      newKeys: "'"
    },
    {
      id: "uk-signs-comma",
      title: "Кома",
      hint: "Кома — це Shift і клавіша крапки. Shift тисни лівим мізинцем.",
      text: "Мама, тато, брат і я. Раз, два, три. Тихо, тихо, не шуми. Сонце, вітер, дощ.",
      goal: SIGNS,
      newKeys: ","
    },
    {
      id: "uk-signs-digits",
      title: "Цифри",
      hint: "Цифри — у верхньому ряду. Кожну натискає той самий палець, що й літеру під нею.",
      text: "111 222 333 444 555 666 777 888 999 000 12 34 56 78 90 2026 рік, 5 клас, 30 учнів.",
      goal: SIGNS,
      newKeys: "1234567890"
    },
    {
      id: "uk-signs-punctuation",
      title: "Знак оклику, питання, двокрапка",
      hint: "! — Shift і 1, ? — Shift і 7, : — Shift і 6, ; — Shift і 4. Дефіс — праворуч від 0.",
      text: "Привіт! Як справи? Усе добре. Чи готовий ти? Так! Увага: старт; раз - два - три!",
      goal: SIGNS,
      newKeys: "!?:;-"
    }
  ]),
  unit("uk-texts", "uk", "Тексти", [
    {
      id: "uk-texts-proverbs",
      title: "Прислів'я",
      hint: "Друкуй без зупинок. Якщо помилився — просто натисни правильну клавішу.",
      text: "Без труда нема плода. Діло майстра величає. Що посієш, те й пожнеш. Вік живи - вік учись.",
      goal: TEXTS,
      newKeys: ""
    },
    {
      id: "uk-texts-earth",
      title: "Наша планета",
      hint: "Дивись на текст, а не на клавіатуру.",
      text: "Наша планета Земля обертається навколо Сонця. Один оберт триває рік. За добу Земля робить оберт навколо своєї осі.",
      goal: TEXTS,
      newKeys: ""
    },
    {
      id: "uk-texts-computer",
      title: "Як працює комп'ютер",
      hint: "Тримай рівний темп: краще повільно, але без помилок.",
      text: "Комп'ютер виконує команди дуже швидко. Але він не знає, що робити, поки людина не напише програму.",
      goal: TEXTS,
      newKeys: ""
    },
    {
      id: "uk-texts-rare",
      title: "Рідкісні літери",
      hint: "У цьому тексті є Ґ, Є, Ї та апостроф.",
      text: "Ґелґотять гуси біля ставу. Їжачок ніс яблуко на голках. Єнот з'їв усі горіхи і заснув.",
      goal: TEXTS,
      newKeys: ""
    }
  ]),
  unit("en-home", "en", "Home row", [
    {
      id: "en-home-1",
      title: "Home row: F and J",
      hint: "Поклади вказівні пальці на F і J: на них є горбики.",
      text: "fff jjj fj jf fjf jfj ff jj fj jf fjj jff",
      goal: BEGINNER,
      newKeys: "fj "
    },
    {
      id: "en-home-dk",
      title: "Home row: D and K",
      hint: "Середні пальці лежать на D і K.",
      text: "ddd kkk dk kd fdk jkd dj kf fjdk kdjf dkd kfk",
      goal: BEGINNER,
      newKeys: "dk"
    },
    {
      id: "en-home-sl",
      title: "Home row: S and L",
      hint: "Безіменні пальці лежать на S і L.",
      text: "sss lll sl ls sld lks sjl fls kls dls jls fsl",
      goal: BEGINNER,
      newKeys: "sl"
    },
    {
      id: "en-home-a",
      title: "Home row: A and ;",
      hint: "Мізинці лежать на A і ; (крапка з комою).",
      text: "aaa ;;; a; ;a ask; lad; sad; fad; all; fall; flask; salad;",
      goal: BEGINNER,
      newKeys: "a;"
    },
    {
      id: "en-home-gh",
      title: "Home row: G and H",
      hint: "G і H — у центрі. Вказівні пальці роблять крок до середини.",
      text: "ggg hhh gh hg gas has had hall shall gag flash glad dash",
      goal: BEGINNER,
      newKeys: "gh"
    },
    {
      id: "en-home-words",
      title: "Home row words",
      hint: "Усі вісім пальців на ASDF JKL;. Друкуй рівно.",
      text: "dad sad lad all fall ask flask salad alfalfa lads adds",
      goal: HOME_ROW,
      newKeys: ""
    }
  ]),
  unit("en-top", "en", "Top row", [
    {
      id: "en-top-ei",
      title: "Top row: E and I",
      hint: "E — лівий середній палець, I — правий середній.",
      text: "eee iii ei ie see fee lie like idea head field shield life slide hike",
      goal: ROWS,
      newKeys: "ei"
    },
    {
      id: "en-top-ru",
      title: "Top row: R and U",
      hint: "R — лівий вказівний, U — правий вказівний.",
      text: "rrr uuu ru ur rude fur rule red read hurl rug sugar user fire huge",
      goal: ROWS,
      newKeys: "ru"
    },
    {
      id: "en-top-ty",
      title: "Top row: T and Y",
      hint: "T і Y — у центрі ряду, вказівні пальці тягнуться навскіс угору.",
      text: "ttt yyy ty yt try the they yet day eyes tidy year thirty truly",
      goal: ROWS,
      newKeys: "ty"
    },
    {
      id: "en-top-wo",
      title: "Top row: W and O",
      hint: "W — лівий безіменний, O — правий безіменний.",
      text: "www ooo wo ow two owl low how word world wood show follow",
      goal: ROWS,
      newKeys: "wo"
    },
    {
      id: "en-top-qp",
      title: "Top row: Q and P",
      hint: "Q — лівий мізинець, P — правий мізинець.",
      text: "qqq ppp qp pq quiet quite queue pupil paper apple purple quality equip",
      goal: ROWS,
      newKeys: "qp"
    }
  ]),
  unit("en-bottom", "en", "Bottom row", [
    {
      id: "en-bottom-cvm",
      title: "Bottom row: C, V and M",
      hint: "C — лівий середній, V — лівий вказівний, M — правий вказівний.",
      text: "ccc vvv mmm cvm car vase map came move vivid cream music victory camp",
      goal: ROWS,
      newKeys: "cvm"
    },
    {
      id: "en-bottom-nb",
      title: "Bottom row: N and B",
      hint: "B — лівий вказівний, N — правий вказівний.",
      text: "nnn bbb nb bn ban bin nobody bean brown number banana bring",
      goal: ROWS,
      newKeys: "nb"
    },
    {
      id: "en-bottom-x",
      title: "Bottom row: X, comma and period",
      hint: "X — лівий безіменний, кома — правий середній, крапка — правий безіменний.",
      text: "xxx ,,, ... fox, box, six. next, mix. taxi, wax. text.",
      goal: ROWS,
      newKeys: "x,."
    },
    {
      id: "en-bottom-z",
      title: "Bottom row: Z and slash",
      hint: "Z — лівий мізинець, / — правий мізинець.",
      text: "zzz /// zoo zebra zero lazy fuzzy and/or yes/no a/b size",
      goal: ROWS,
      newKeys: "z/"
    },
    {
      id: "en-bottom-caps",
      title: "Capital letters",
      hint: "Shift натискай мізинцем іншої руки.",
      text: "Kyiv Lviv Odesa Anna Mark Monday July Ukraine London Paris",
      goal: SIGNS,
      newKeys: ""
    }
  ]),
  unit("en-texts", "en", "Texts", [
    {
      id: "en-texts-digits",
      title: "Digits",
      hint: "Цифри — у верхньому ряду. Кожну натискає той самий палець, що й літеру під нею.",
      text: "111 222 333 444 555 666 777 888 999 000 12 34 56 78 90 in 2026 we have 5 lessons.",
      goal: SIGNS,
      newKeys: "1234567890"
    },
    {
      id: "en-texts-practice",
      title: "Practice every day",
      hint: "Дивись на текст, а не на клавіатуру.",
      text: "Practice every day and your fingers will learn the way. Keep your eyes on the screen, not on the keys.",
      goal: TEXTS,
      newKeys: ""
    },
    {
      id: "en-texts-program",
      title: "What is a program",
      hint: "Тримай рівний темп: краще повільно, але без помилок.",
      text: "A computer follows instructions very fast. A program is a list of steps that tells it what to do.",
      goal: TEXTS,
      newKeys: ""
    }
  ])
]

/** All lessons in course order: Ukrainian first, then English. */
export const lessons: readonly Lesson[] = units.flatMap((u) => u.lessons)

/** Characters the student knows after this lesson: its own new keys and those of all earlier lessons of the layout. */
export const knownKeys = (lessonId: string): ReadonlySet<string> => {
  const target = lessons.find((l) => l.id === lessonId)
  if (!target) return new Set()
  const known = new Set<string>()
  for (const l of lessons) {
    if (l.layout !== target.layout) continue
    for (const c of l.newKeys) known.add(c)
    if (l.id === lessonId) break
  }
  return known
}
