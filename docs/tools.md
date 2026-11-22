# Tools and profiles

[Back to the README](../README.md)

- [Tools](#tools)
- [How tiles show their state](#how-tiles-show-their-state)
- [Profiles](#profiles)
- [Also included](#also-included)

## Tools

| Tool | What it does | How |
| --- | --- | --- |
| Text to speech | Reads the clicked or focused block aloud, at three speeds | Web Speech API |
| Contrast | Invert, dark and light modes | CSS |
| Smart contrast | Measures text against its real background and corrects it to WCAG 1.4.3 | Measured per element |
| Saturation | Low, high, monochrome | CSS filter |
| Highlight links | Outlines links and buttons | CSS |
| Bigger text | Four steps, with the heading hierarchy preserved | Measured per element |
| Text spacing | Three steps of letter and word spacing | CSS |
| Line height | 1.5×, 1.75× and 2× the page's own spacing | Measured per element |
| Text align | Left, centre, right, justify | CSS |
| Pause animations | Stops CSS animations and transitions, and pauses playing video once. Later videos do not autoplay. A video the visitor starts keeps playing | CSS and one pass over media |
| Hide images | Blanks images and background images while keeping the layout stable | CSS |
| Dyslexia friendly | OpenDyslexic or Atkinson Hyperlegible | CSS |
| Cursor | Large cursor, reading mask, reading guide | CSS and overlays |
| Tooltips | Shows alt text and ARIA labels on hover and focus | Overlay |
| Page structure | Lists headings, landmarks and links to jump to | Dialog |
| Dictionary | Double-click a word for its definition. See [dictionary.md](dictionary.md) | Wiktionary |
| Language | Translates the page into 193 languages. See [translation.md](translation.md) | On-device translator, or Google |
| Large menu | Enlarges the panel itself | CSS |

A site can leave tools out with `data-disabled-tools`. A switched-off tool is
hidden, and neither a saved preference nor a profile can turn it back on.

## How tiles show their state

Tiles with more than on and off (Bigger text, Text spacing, Line height,
Contrast, Saturation, Cursor, Text align, Dyslexia friendly) show one bar per
step while in use and read the chosen option, such as "Low saturation" or
"Line height 1.5×". On/off tiles keep their name. Every active tile shows a
check in its corner.

## Profiles

| Profile | Turns on |
| --- | --- |
| Low vision | Bigger text 2, smart contrast, highlighted links |
| Dyslexia | Dyslexia font, text spacing 1, line height 1.5×, left-aligned text, reading guide |
| Colour blindness | High saturation, smart contrast |
| Focus | Reading mask, paused animations, low saturation |
| Cognitive | Reading guide, highlighted links, paused animations, dictionary |
| Reduce motion | Paused animations |
| Motor | Large cursor, highlighted links, paused animations |
| Read aloud | Read aloud on click and focus, tooltips for image and button labels |

A profile starts from the defaults, so choosing one replaces the previous one
and does not stack on it. Clicking the active profile again turns it off and
restores the page. Changing any single tile afterwards clears the profile mark,
since the settings no longer match it. The **i** button in the panel lists what
each profile turns on.

The Read aloud profile is a reading aid for sighted visitors. It is not offered
as a profile for blind visitors, because it would talk over the screen reader
they already use.

## Also included

- A **skip to main content** link.
- **Alt + A** opens the panel, except while typing in a field or editor,
  where the keys are left to the page.
- Six positions for the button, with a separate position for phones.
- The widget's own labels in English or Spanish.
- Settings that persist across pages and visits.
