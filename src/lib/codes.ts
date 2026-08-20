import { customAlphabet } from "nanoid";

// No 0/O/1/I to avoid ambiguity when read off a screen.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const generateJoinCode = customAlphabet(ALPHABET, 6);
export const generateId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  20
);
