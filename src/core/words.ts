import type { LayoutId } from "./layouts.ts"

/**
 * Common words for generated exercises and games. Lower case, letters only (and the
 * apostrophe in Ukrainian). A generator takes only the words made of keys the student knows.
 */
const UK_WORDS = `
а о і в у й та до на по за від під над біля вже ще так як де там тут хто що який
вода лава діло лід дід далі ліва пара рада лапа ріпа пора жар двір парад дає радіє
гора кора крок рак гак лак кров дорога голова поле перо нога вікно пенал дерево
ранок жінка гнів пекар лелека рука груша душа шапка вушко шкіра пошук друг лук
дуже шкода дощ кущ щука цукор цегла площа палац оцінка щедро гай край гроза ваза
лоза зірка зерно казка фазан дзвін хор дух вухо горіх кожух їжак їжа їде ґанок ґава
мама тато мати кіт кінь тінь день тиша миша дитина вітер літо сад сова село небо
хліб сонце брат батько собака стіл білка сміх ніч очі річка вечір чашка ключ юнак
люди юшка читаю яблуко земля пісня мрія моя твоя ясно сестра бабуся дідусь школа
клас урок учень учитель зошит книга ручка олівець парта дошка перерва дзвінок
весна осінь зима сніг дощик хмара вітерець травень червень липень серпень вересень
жовтень листопад грудень січень лютий березень квітень ранок обід вечеря сніданок
хата двері вікно кімната кухня ліжко шафа стілець лампа килим подушка ковдра
кіт пес кінь корова коза вівця гуска качка курка півень заєць вовк лисиця ведмідь
їжак білка сова орел лелека горобець синиця ластівка риба жаба метелик бджола
мурашка павук равлик дерево береза дуб клен верба калина сосна ялинка трава
квітка ромашка мак соняшник яблуня вишня груша слива малина суниця горіх гриб
хліб молоко сир масло каша суп борщ вареники пиріг сік чай вода цукор сіль мед
червоний синій жовтий зелений білий чорний сірий рожевий великий малий новий старий
добрий веселий швидкий тихий високий довгий теплий холодний смачний гарний
один два три чотири шість сім вісім десять сто
іти бігти стрибати читати писати малювати співати грати думати бачити чути знати
вчити любити жити робити сидіти стояти лежати спати їсти пити говорити слухати
комп'ютер клавіатура миша екран програма файл папка мережа інтернет сайт пароль
текст слово літера речення абзац рядок символ команда алгоритм робот модель
м'яч сім'я п'ять дев'ять пір'я м'ята ім'я з'їв під'їзд об'єкт
Україна Київ Львів Одеса Харків Дніпро
`

const EN_WORDS = `
a i the and to of in is it you he she we they at on for with as be was are
dad sad lad all fall ask flask salad has had hall shall glad dash gas
see fee lie like idea head field life slide hike red read rule sugar user fire huge
try they yet day eyes tidy year truly two owl low how word world wood show follow
quiet quite pupil paper apple purple car vase map came move cream music camp
ban bin bean brown number banana bring fox box six next mix taxi wax text zoo zebra
zero lazy size cat dog sun moon star tree leaf rain snow wind sea sky bird fish frog
horse cow duck hen bee ant mouse cake milk bread juice tea water egg rice soup
school class lesson teacher book pen pencil desk board bell break friend family
mother father sister brother home room door window table chair bed lamp
red blue green yellow white black pink grey big small new old good happy fast slow
one two three four five six seven eight nine ten hundred
run jump read write draw sing play think see hear know learn love live make sit
computer keyboard mouse screen program file folder network site password
letter word line symbol command robot model game level score start finish
spring summer autumn winter morning evening night today tomorrow
`

const parse = (bank: string): readonly string[] => [...new Set(bank.split(/\s+/).filter(Boolean))]

export const WORDS: Readonly<Record<LayoutId, readonly string[]>> = {
  uk: parse(UK_WORDS),
  en: parse(EN_WORDS)
}

/** Sentences for the speed test: whole thoughts, plain punctuation, no rare symbols. */
export const TEST_SENTENCES: Readonly<Record<LayoutId, readonly string[]>> = {
  uk: [
    "Сонце сходить на сході й заходить на заході.",
    "Восени листя на деревах жовтіє і падає на землю.",
    "Бджоли збирають нектар і роблять з нього мед.",
    "У нашому класі є двадцять вісім учнів.",
    "Друкувати швидко вчаться так само, як грати на піаніно: щодня потроху.",
    "Дніпро — найдовша річка в Україні.",
    "Комп'ютер зберігає дані у файлах, а файли лежать у папках.",
    "Хто багато читає, той багато знає.",
    "Взимку ми ліпимо сніговика і катаємося на санчатах.",
    "Програма — це послідовність команд для виконавця.",
    "Їжак згорнувся клубочком і заснув під листям.",
    "Пароль має бути довгим, і його не можна нікому казати.",
    "Ластівки повертаються додому навесні.",
    "Дружба допомагає долати будь-які труднощі.",
    "Щоб текст було легко читати, його ділять на абзаци.",
    "Ґудзик відірвався від куртки, і мама його пришила.",
    "Учитель пояснив задачу, а ми склали алгоритм.",
    "Вечорами в небі видно яскраві зорі.",
    "Земля обертається навколо Сонця за один рік.",
    "Не дивись на клавіші: пальці самі знають дорогу."
  ],
  en: [
    "The sun rises in the east and sets in the west.",
    "Bees collect nectar and turn it into honey.",
    "Practice a little every day and your speed will grow.",
    "A computer keeps data in files, and files live in folders.",
    "Keep your eyes on the screen, not on your hands.",
    "A good password is long and secret.",
    "In autumn the leaves turn yellow and fall to the ground.",
    "A program is a list of steps for the computer to follow.",
    "Reading every day makes you smarter.",
    "Birds fly south when the weather gets cold.",
    "Our class has twenty eight pupils.",
    "The river runs through the green valley to the sea.",
    "Friends help each other in hard times.",
    "Snow covers the hills and the children build a snowman.",
    "Every key has its own finger."
  ]
}

/** Words that use only the given characters, e.g. the keys a student has learned. */
export const wordsWithin = (layout: LayoutId, keys: ReadonlySet<string>): readonly string[] =>
  WORDS[layout].filter((w) => [...w.toLowerCase()].every((c) => keys.has(c)))
