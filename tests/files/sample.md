---
YamlHeader: "YamlHeader is completely optional, used to define file-wide options for deckName and tags"
deckName: "Flashcards in this file use this deck name, default deck name in settings is used otherwise"
tags: flashcards in this file share these tags seperated by space
---

# My notes

A note can have normal texts along with one or more flashcards. This line for example, will not be counted as flashcard.

## Below are examples of flashcards

---
A flashcard is wrapped by triple-dashes(---) which takes up a whole line,
therefore inline triple-dashes is allowed in flashcard.

Currently Basic flashcard is supported, and front text is between the first triple-dash and a 'flashcard' hashtag.
Markdown syntax is supported with multiple features, and blank-line is valid without doubt.

this makes the end of front text. #flashcard #AnotherTag #YetOneMoreTag

this makes the back text
---
---
One triple-dashes(---) or two doesn't matter #flashcard
back text
---
another example #flashcard
back
---

| table | is supported |
|-------|--------------|
| a     | 1            |
| b     | 2            |

#flashcard
table is supported
---
Math equation in LaTeX is supported (AnkiMobile, AnkiDroid only) #flashcard
$$y = \dfrac{a}{b}$$
---
![](Pasted%20image%123456789.png) #flashcard
image, audio, video(AnkiDroid only) attachments are also supported
---
A code block example
#flashcard #python

```python
print("Hello World")
```

---
