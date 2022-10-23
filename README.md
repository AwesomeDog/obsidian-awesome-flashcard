# Awesome Flashcard

Plugin to sync flashcards in your Obsidian notes to Anki.

## Design philosophy

- **Obsidian as the single source of truth**. Synchronizes flashcards only in one direction: from your Obsidian notes to
  Anki.
- **Standard Markdown as flashcard format**. Introduces zero private syntax.

## Features

- Synchronizes all flashcards in your vault to Anki, in one direction.
- Full Markdown syntax support: image, audio, video, code block, latex, table...
- Supports defining deck names both vault-wide and file-wide
- Supports defining tags both flashcard-wide and file-wide
- Decent speed for incremental scanning
- Quick link to corresponding Obsidian note

## Flashcard example

In your Obsidian note:

```markdown
---
A simple flashcard: Question in the front #flashcard
Answer in the back
---
```

will generate an Anki flashcard like this:

| A simple flashcard: Question in the front |
|-------------------------------------------|
| Answer in the back                        |

see more examples in [sample.md](tests/files/sample.md)

## One time setup

These steps only need to be done once.  
After that ensuring Anki running would suffice to scan vault with the plugin.

1. Start up [Anki](https://apps.ankiweb.net/), and navigate to your desired profile.
2. Ensure that you've installed [AnkiConnect](https://github.com/FooSoft/anki-connect).
3. Have [Obsidian](https://obsidian.md/) installed
4. Search the 'Community plugins' list for this plugin
5. Install the plugin.
6. In Anki, navigate to `Tools->Addons->AnkiConnect->Config`, and change it to look like this, then restart Anki to
   apply the changes:

```
{
    "apiKey": null,
    "apiLogPath": null,
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOrigin": "http://localhost",
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
```

## How to use

Make sure Anki is running, on left sidebar's [Ribbon](https://help.obsidian.md/User+interface/Workspace/Ribbon) there is
an Anki icon like this:

<svg transform="scale(0.2)">
<path fill="currentColor" stroke="currentColor" d="M 27.00,3.53 C 18.43,6.28 16.05,10.38 16.00,19.00 16.00,19.00 16.00,80.00 16.00,80.00 16.00,82.44 15.87,85.73 16.74,88.00 20.66,98.22 32.23,97.00 41.00,97.00 41.00,97.00 69.00,97.00 69.00,97.00 76.63,96.99 82.81,95.84 86.35,88.00 88.64,82.94 88.00,72.79 88.00,67.00 88.00,67.00 88.00,24.00 88.00,24.00 87.99,16.51 87.72,10.42 80.98,5.65 76.04,2.15 69.73,3.00 64.00,3.00 64.00,3.00 27.00,3.53 27.00,3.53 Z M 68.89,15.71 C 74.04,15.96 71.96,19.20 74.01,22.68 74.01,22.68 76.72,25.74 76.72,25.74 80.91,30.85 74.53,31.03 71.92,34.29 70.70,35.81 70.05,38.73 67.81,39.09 65.64,39.43 63.83,37.03 61.83,36.00 59.14,34.63 56.30,35.24 55.08,33.40 53.56,31.11 56.11,28.55 56.20,25.00 56.24,23.28 55.32,20.97 56.20,19.35 57.67,16.66 60.89,18.51 64.00,17.71 64.00,17.71 68.89,15.71 68.89,15.71 Z M 43.06,43.86 C 49.81,45.71 48.65,51.49 53.21,53.94 56.13,55.51 59.53,53.51 62.94,54.44 64.83,54.96 66.30,56.05 66.54,58.11 67.10,62.74 60.87,66.31 60.69,71.00 60.57,74.03 64.97,81.26 61.40,83.96 57.63,86.82 51.36,80.81 47.00,82.22 43.96,83.20 40.23,88.11 36.11,87.55 29.79,86.71 33.95,77.99 32.40,74.18 30.78,70.20 24.67,68.95 23.17,64.97 22.34,62.79 23.39,61.30 25.15,60.09 28.29,57.92 32.74,58.49 35.44,55.57 39.11,51.60 36.60,45.74 43.06,43.86 Z" />
</svg>

Click it and the plugin will do the rest for you.
Process is shown on Notice and in the [Obsidian Developer Console](https://forum.obsidian.md/t/how-to-access-the-console/16703/9)

## Synchronization mechanism clarified

To fulfill these goals:

- One-way synchronization from your Obsidian notes to Anki, and not vice versa. Auto adds new, removes deleted and
  updates obsolete flashcards
- Does not affect your own flashcards (which are not from your Obsidian notes)

The synchronization is designed as follows:

- Flashcard's deck name and front text are combined to get a unique hash
- Each flashcard from Obsidian is tagged with the hash to tell from your own flashcards
- When scanning vault, it will diff flashcards in Obsidian and Anki based on unique hash, create decks and CRUD flashcards accordingly
