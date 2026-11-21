# Dictionary

[Back to the README](../README.md)

- [How a lookup works](#how-a-lookup-works)
- [When nothing is found](#when-nothing-is-found)
- [Read and Spell](#read-and-spell)
- [Why Wiktionary](#why-wiktionary)
- [Your own endpoint](#your-own-endpoint)

## How a lookup works

1. **Double-clicking a word opens its definition.** Selecting a word any other
   way (dragging across it, Shift + arrow keys) shows a **Define** button next
   to it, and nothing is requested until that button is pressed. Phrases,
   single letters and anything over 40 characters are ignored.
2. **The word is requested.** Wiktionary titles are case-sensitive, so more
   than one spelling is tried:
   - a word that is merely capitalised (`Sanctuary`, `This`) is tried in lower
     case first, then as written, so a sentence-initial word finds the common
     word and not an obscure proper noun
   - an acronym or mixed-case word (`NASA`, `iPhone`) is tried as written
     first, then in lower case
3. **The first readable entry is shown** in a popover: a search box holding
   the word, one definition line such as **this (determiner)**: The thing
   here., then **Read** and **Spell**. A word with more than one sense gets a
   **‹ 1 of 10 ›** pager, up to ten senses. The page's `<html lang>` picks the
   language section, falling back to English.
4. **A definition that only points at another word** ("plural of invitation")
   is replaced by that word's meaning, matched by part of speech. If that
   second request fails, the pointer is shown as it is.

Typing a word into the search box and pressing Enter looks that word up.

The popover closes on Escape, when the page scrolls, or on a click elsewhere.
Clicking, typing or selecting text inside it keeps it open.

## When nothing is found

| Situation | Message |
| --- | --- |
| Every spelling is a 404, or the response has no definitions | *No definition found.* |
| The service answers with a 5xx, a rate limit or any other error | *The dictionary could not be reached.* |
| The network fails, or there is no answer within 8 seconds | *The dictionary could not be reached.* |

A request with no answer after 1.5 seconds is sent again alongside the first,
and a server or network error is retried at once. The first real answer wins
and the rest are cancelled, with up to three attempts inside the 8-second
limit. A 404 is an answer and is never retried. A newer lookup cancels an older
one still in flight, so a slow answer never overwrites a newer definition.

## Read and Spell

Both use the browser's own speech synthesis, and both are left out where the
browser cannot speak. They pick a voice that runs on the device, so the text
stays on the device. If the device has no voice for the language, the
browser's default is used, and in some browsers that is a network voice.

- **Read** says the word, its part of speech and the definition showing, at
  the reading speed chosen in the panel.
- **Spell** says the word one letter at a time, in the page's language.
  Letters are spoken in lower case, because speech engines announce an
  upper-case letter as "capital T". Hyphens and apostrophes are named.
- The button that is speaking shows as pressed, and pressing it again stops.
  Starting the other one, paging, looking up another word or closing the
  popover also stops speech.

## Why Wiktionary

It sends `Access-Control-Allow-Origin`, needs no key and has dependable
uptime. Definitions arrive as HTML and are stripped to plain text before being
written with `textContent`. Network content is never treated as markup.

## Your own endpoint

Set `dictionary-url` (or `data-dictionary-url`) to any URL that the word can be
appended to. The widget requests `<dictionary-url><word>`, URL-encoded, with
`Accept: application/json`, and understands either response shape:

```jsonc
// Wiktionary REST
{ "en": [ { "partOfSpeech": "Noun", "definitions": [ { "definition": "A place of refuge." } ] } ] }

// dictionaryapi.dev
[ { "word": "sanctuary", "meanings": [ { "partOfSpeech": "noun", "definitions": [ { "definition": "A place of refuge." } ] } ] } ]
```

An endpoint must send `Access-Control-Allow-Origin` for the sites that use the
widget, return 404 for an unknown word so the next spelling is tried, and
keep other error statuses for real failures.
