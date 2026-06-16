import type { ElementType } from "react";
import {
  Play,
  FileText,
  Headphones,
  HeartStraight,
  HouseLine,
  SunHorizon,
  PawPrint,
  Tree,
  Lightning,
  Flame,
} from "@phosphor-icons/react/dist/ssr";

// Lesson-type coding — mirrors the real app's icon/colour system.
// Rood = video · groen = lezen · blauw = audio · terracotta = gezondheid.
// The swatch colours are functional (not brand accents), so they live as
// literal hex here rather than as --ld-* tokens.
export type LessonType = "video" | "lezen" | "audio" | "health";

export const LESSON_TYPES: Record<
  LessonType,
  { icon: ElementType; label: string; bg: string; fg: string }
> = {
  video: { icon: Play, label: "Video", bg: "#FBE3DB", fg: "#B5482B" },
  lezen: { icon: FileText, label: "Lezen", bg: "#E6ECE3", fg: "#46603C" },
  audio: { icon: Headphones, label: "Audio", bg: "#E3ECF6", fg: "#2F5C86" },
  health: { icon: HeartStraight, label: "Gezondheid", bg: "#F3DAD3", fg: "#7A2A2A" },
};

export type Phase = {
  id: string;
  key: string;
  title: string;
  weeks: string;
  age: string;
  blurb: string;
  icon: ElementType;
  lessons: [LessonType, string][];
};

// Curriculum — four phases, copy verbatim from the design handoff. The
// lesson→phase mapping is the handoff's best-guess; accuracy is a pre-merge
// content check against the real curriculum (see plan / handoff note).
export const PHASES: Phase[] = [
  {
    id: "voor",
    key: "01",
    title: "Vóór de komst",
    weeks: "Bij de fokker",
    age: "Pup 0–8 weken",
    blurb:
      "De voorbereidingsfase, terwijl je pup nog bij de fokker is. Je maakt je huis klaar en weet precies wat je nodig hebt.",
    icon: HouseLine,
    lessons: [
      ["lezen", "Wat heb je nodig? De complete aanschaflijst"],
      ["lezen", "Hoe maak je je huis puppyproof?"],
      ["lezen", "Halsband of tuigje, wat kies je?"],
      ["health", "Giftige stoffen voor honden"],
      ["video", "Videoles: de eerste nacht voorbereiden"],
    ],
  },
  {
    id: "eerste",
    key: "02",
    title: "De eerste week thuis",
    weeks: "Week 1",
    age: "Pup 8–9 weken",
    blurb:
      "Je pup komt thuis. Een rustig dagschema, de eerste nachten en de start van zindelijkheids- en benchtraining.",
    icon: SunHorizon,
    lessons: [
      ["lezen", "Ophalen pup & meeneemlijst"],
      ["lezen", "Dag 1 in huis en het dagschema"],
      ["audio", "Audiomeditatie: de eerste nachten"],
      ["video", "Videoles: zindelijkheids- & benchtraining"],
      ["health", "Vaccineren & ontwormen"],
      ["video", "Puppybijten en bijtremming aanleren"],
    ],
  },
  {
    id: "wennen",
    key: "03",
    title: "Wennen & socialiseren",
    weeks: "Week 2 t/m 4",
    age: "Pup 8–12 weken",
    blurb:
      "De eerste socialisatiefase. Je pup ontdekt zijn nieuwe wereld en leert o.a. de basiscommando's en stap voor stap eventjes alleen te zijn.",
    icon: PawPrint,
    lessons: [
      ["lezen", "Algemene trainingstips"],
      ["lezen", "Socialisatie: wat, wanneer en hoe"],
      ["video", "Basiscommando’s: touch, zit, kijk, los"],
      ["video", "Opspringen voorkomen"],
      ["audio", "Alleen zijn stapsgewijs aanleren"],
      ["lezen", "Wennen aan autorijden & losloopregels"],
    ],
  },
  {
    id: "ontdek",
    key: "04",
    title: "Ontdekken & groeien",
    weeks: "Week 5 t/m 12",
    age: "Pup 12–16 weken",
    blurb:
      "Je pup start met tandenwisselen. Hij wordt een stuk zelfstandiger en durft verder weg van jou te gaan. Maar kan ook ineens angstig reageren op prikkels.",
    icon: Tree,
    lessons: [
      ["lezen", "Doortrainen: vasthouden wat je hebt opgebouwd"],
      ["health", "Tanden wisselen"],
      ["video", "Wandelen & losloopregels"],
      ["lezen", "Blaffen bij pups"],
      ["audio", "De angstfase: waarom je pup nu schrikt"],
      ["lezen", "Zelfstandigheid opbouwen"],
    ],
  },
  {
    id: "pre-puber",
    key: "05",
    title: "Pre-puberteit",
    weeks: "Week 13 t/m 24",
    age: "Pup 16–24 weken",
    blurb:
      "De pre-puberteit. De hormonen komen op en je pup gaat grenzen testen, soms met sloopgedrag of 'even niet luisteren'. Jij blijft sturen met impulscontrole, terugkomen en zelfstandigheid.",
    icon: Lightning,
    lessons: [
      ["video", "Pre-pubertraining"],
      ["lezen", "Opkomst hormonen"],
      ["video", "Sloopgedrag"],
      ["video", "Introductie lange lijn / terugkomen"],
      ["video", "Impulscontrole oefenen"],
      ["audio", "Ontwikkeling zelfstandigheid"],
      ["lezen", "Niet meer luisteren?! Wegloopfase"],
      ["audio", "Verwachtingen eigenaar — positief blijven"],
    ],
  },
  {
    id: "puber",
    key: "06",
    title: "Puberteit",
    weeks: "Maand 6 t/m 18",
    age: "Puber tot 18 maanden",
    blurb:
      "De puberteit. Lichaam en hormonen veranderen razendsnel, bij reu én teef. Je leert wat er speelt, van loopsheid en markeren tot castratie, en hoe je rustig en consequent bijstuurt.",
    icon: Flame,
    lessons: [
      ["video", "Pubertraining"],
      ["lezen", "Puberteit: wat gebeurt er? Hij doet het niet meer"],
      ["lezen", "Reu in de puberteit — tips"],
      ["lezen", "Teefje in de puberteit — tips"],
      ["health", "Eerste loopsheid & schijnzwangerschap"],
      ["video", "Markeergedrag — overal een plasje"],
      ["lezen", "Rijgedrag reu — géén dominantie!"],
      ["health", "Castratie / sterilisatie — do's & don'ts"],
    ],
  },
];

// App-screenshot metadata (native px → intrinsic ratio for CLS). Served via
// OptimizedImage from committed AVIF/WebP variants.
export const SHOTS = {
  agenda: {
    src: "/images/pa-agenda.png",
    width: 1091,
    height: 840,
    alt: "Puppyagenda app — weekoverzicht",
  },
  voortgang: {
    src: "/images/pa-voortgang.png",
    width: 1086,
    height: 939,
    alt: "Puppyagenda app — voortgangsdashboard",
  },
  tooltip: {
    src: "/images/pa-tooltip.png",
    width: 317,
    height: 290,
    alt: "Uitleg in de app: icoontjes en kleuren per lestype",
  },
} as const;
