export const PSEUDONYM_TO_EMOJI: { [name: string]: string } = {
  "Anonymous Monkey": "🐒",
  "Anonymous Bear": "🐻",
  "Anonymous Duck": "🦆",
  "Anonymous Owl": "🦉",
  "Anonymous Horse": "🐴",
  "Anonymous Bee": "🐝",
  "Anonymous Worm": "🪱",
  "Anonymous Butterfly": "🦋",
  "Anonymous Snail": "🐌",
  "Anonymous Turtle": "🐢",
  "Anonymous Lizard": "🦎",
  "Anonymous Frog": "🐸",
  "Anonymous T. Rex": "🦖",
  "Anonymous Octopus": "🐙",
  "Anonymous Shrimp": "🦐",
  "Anonymous Crab": "🦀",
  "Anonymous Fish": "🐟",
  "Anonymous Dolphin": "🐬",
  "Anonymous Whale": "🐳",
  "Anonymous Zebra": "🦓",
  "Anonymous Orangutan": "🦧",
  "Anonymous Elephant": "🐘",
  "Anonymous Camel": "🐫",
  "Anonymous Giraffe": "🦒",
  "Anonymous Kangaroo": "🦘",
  "Anonymous Cow": "🐄",
  "Anonymous Sheep": "🐑",
  "Anonymous Cat": "🐈",
  "Anonymous Chicken": "🐓",
  "Anonymous Parrot": "🦜",
  "Anonymous Flamingo": "🦩",
  "Anonymous Skunk": "🦨",
  "Anonymous Raccoon": "🦝",
  "Anonymous Sloth": "🦥",
  "Anonymous Mouse": "🐀",
  "Anonymous Hedgehog": "🦔",
  "Anonymous Log": "🪵",
  "Anonymous Mushroom": "🍄",
  "Anonymous Cactus": "🌵",
  "Anonymous Sunflower": "🌻",
  "Anonymous Corn": "🌽",
  "Anonymous Peanut": "🥜",
  "Anonymous Baguette": "🥖",
  "Anonymous Canoe": "🛶",
  "Anonymous Yam": "🍠",
  "Anonymous Pumpkin": "🎃",
  "Anonymous Moon": "🌚"
};

export function bigIntToPseudonymEmoji(input: bigint): string {
  const key = Number(input % BigInt(Object.keys(PSEUDONYM_TO_EMOJI).length));
  return Object.values(PSEUDONYM_TO_EMOJI)[key];
}

export function bigIntToPseudonymName(input: bigint): string {
  const key = Number(input % BigInt(Object.keys(PSEUDONYM_TO_EMOJI).length));
  return Object.keys(PSEUDONYM_TO_EMOJI)[key];
}

/** Converts a given number, such as a nullifier hash, to a pseudonym. */
export function bigintToPseudonym(input: bigint): string {
  return `${bigIntToPseudonymEmoji(input)} ${bigIntToPseudonymName(input)}`;
}
