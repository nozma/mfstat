export type RuleOption = {
  value: "singles_fever_on" | "singles_fever_off" | "doubles_fever_on" | "doubles_fever_off";
  label: string;
  isDoubles: boolean;
  hasFeverRacket: boolean;
};

export const RULE_OPTIONS: RuleOption[] = [
  {
    value: "singles_fever_on",
    label: "Singles / F+",
    isDoubles: false,
    hasFeverRacket: true
  },
  {
    value: "singles_fever_off",
    label: "Singles / F-",
    isDoubles: false,
    hasFeverRacket: false
  },
  {
    value: "doubles_fever_on",
    label: "Doubles / F+",
    isDoubles: true,
    hasFeverRacket: true
  },
  {
    value: "doubles_fever_off",
    label: "Doubles / F-",
    isDoubles: true,
    hasFeverRacket: false
  }
];

export const STAGE_OPTIONS = [
  "スタジアム グラス",
  "スタジアム ハード",
  "スタジアム クレイ",
  "アカデミー ウッド",
  "アカデミー クレイ",
  "アカデミー ブロック",
  "アカデミー カーペット",
  "アカデミー キノコ",
  "アカデミー サンド",
  "アカデミー アイス",
  "飛行船コート",
  "フォレストコート",
  "ワルイージピンボール",
  "ラケットファクトリー",
  "ワンダーコート"
];

export const SCORE_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];

export const RATE_BAND_OPTIONS = [
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S-",
  "S",
  "S+"
];

export const CHARACTER_OPTIONS = [
  { value: "Mario", label: "マリオ" },
  { value: "Luigi", label: "ルイージ" },
  { value: "Peach", label: "ピーチ" },
  { value: "Daisy", label: "デイジー" },
  { value: "Rosalina", label: "ロゼッタ" },
  { value: "Pauline", label: "ポリーン" },
  { value: "Wario", label: "ワリオ" },
  { value: "Waluigi", label: "ワルイージ" },
  { value: "Toad", label: "キノピオ" },
  { value: "Toadette", label: "キノピコ" },
  { value: "Luma", label: "チコ" },
  { value: "Yoshi", label: "ヨッシー" },
  { value: "Bowser", label: "クッパ" },
  { value: "Bowser Jr.", label: "クッパJr." },
  { value: "Donkey Kong", label: "ドンキーコング" },
  { value: "Boo", label: "テレサ" },
  { value: "Shy Guy", label: "ヘイホー" },
  { value: "Koopa Troopa", label: "ノコノコ" },
  { value: "Kamek", label: "カメック" },
  { value: "Spike", label: "ガボン" },
  { value: "Diddy Kong", label: "ディディーコング" },
  { value: "Chain Chomp", label: "ワンワン" },
  { value: "Birdo", label: "キャサリン" },
  { value: "Koopa Paratroopa", label: "パタパタ" },
  { value: "Petey Piranha", label: "ボスパックン" },
  { value: "Piranha Plant", label: "パックンフラワー" },
  { value: "Boom Boom", label: "ブンブン" },
  { value: "Blooper", label: "ゲッソー" },
  { value: "Dry Bowser", label: "ほねクッパ" },
  { value: "Dry Bones", label: "カロン" },
  { value: "Baby Mario", label: "ベビィマリオ" },
  { value: "Baby Luigi", label: "ベビィルイージ" },
  { value: "Baby Peach", label: "ベビィピーチ" },
  { value: "Wiggler", label: "ハナチャン" },
  { value: "Nabbit", label: "トッテン" },
  { value: "Goomba", label: "クリボー" },
  { value: "Baby Wario", label: "ベビィワリオ" },
  { value: "Baby Waluigi", label: "ベビィワルイージ" }
];

export const RACKET_OPTIONS = [
  "マイラケット",
  "ファイアラケット",
  "アイスラケット",
  "サンダーラケット",
  "ビューゴーラケット",
  "ドロドロラケット",
  "マメキノコラケット",
  "ファイアフラワーラケット",
  "アイスフラワーラケット",
  "スターラケット",
  "たつまきラケット",
  "サンボラケット",
  "シャドウラケット",
  "ファイアバーラケット",
  "フリーズラケット",
  "ビリキューラケット",
  "カーブラケット",
  "インクラケット",
  "バナナラケット",
  "かざんラケット",
  "おばけラケット",
  "ダッシュラケット",
  "ブルラケット",
  "トゲゾーラケット",
  "マジックラケット",
  "キラーラケット",
  "ドッスンラケット",
  "オシダシーラケット",
  "メタルラケット",
  "ハテナラケット"
];
