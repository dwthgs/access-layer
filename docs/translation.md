# Page translation

[Back to the README](../README.md)

- [What the visitor sees](#what-the-visitor-sees)
- [The two engines](#the-two-engines)
- [Turning the fallback off](#turning-the-fallback-off)
- [Your own Google Cloud key](#your-own-google-cloud-key)
- [What is and is not translated](#what-is-and-is-not-translated)

## What the visitor sees

Picking a language in the panel translates the page itself, not only the
widget. The picker shows the current language with its code badge, then a
searchable list such as "Català (Catalan)", matched by native name, English
name or code, ignoring accents. It works from the keyboard: type to filter,
arrows to move, Enter to pick, Escape to clear and then close.

The page's own language heads the list. Picking it, or pressing **Reset**,
puts the original back exactly. The choice is remembered, so the next page
opens translated wherever the device can translate it.

## The two engines

They are tried in this order:

1. **On the device.** Where the browser has a built-in translator (the
   Translator API in current Chrome and Edge), the page is translated locally
   and nothing leaves the device. The first use of a language may download its
   model, and the panel shows progress.
2. **Google's website translator**, as the fallback. It covers browsers
   without an on-device translator (Safari, Firefox, most phones), and an
   on-device translator that does not answer within 2.5 seconds or whose
   download stops moving for 15. Nothing is loaded from Google until a visitor
   picks a language. Picking one then sends the page's text to Google.
   Google's own bar and hover balloons are hidden.

Where the device cannot translate and the fallback is off, the panel says the
browser cannot translate the page.

If Google does not put the original page back when asked, the panel says so
and offers a **Reload the page** button. The widget never reloads the page by
itself, so nothing a visitor is typing is lost.

## Turning the fallback off

```html
<script defer data-access-layer src="/access-layer.iife.js"
        data-translate-fallback="off"></script>
```

Do this on checkout and payment pages. On-device translation keeps working.

A site that leaves the fallback on and has a Content Security Policy must
allow `https://translate.google.com` and `https://translate.googleapis.com`.
Without that, only on-device translation is available.

## Your own Google Cloud key

A site that does not want Google's free website translator can use Google's
paid Cloud Translation API under its own Google Cloud project.

The key must stay on a server, never in the page. Point `data-translate-url`
at an endpoint of your own that holds it. The endpoint:

- takes `{ "source", "target", "q": [...] }`
- returns `{ "translations": [...] }` in the same order
- sends `Access-Control-Allow-Origin` for your site

With it set, the free translator's script is never loaded and nothing falls
back to it, even if the paid API fails. The on-device translator still goes
first, since nothing leaves the device that way. In Google Cloud, restrict the
key to the Cloud Translation API and set a daily quota.

## What is and is not translated

- Text, `alt`, `title`, `placeholder`, `aria-label` and button labels are
  translated.
- Content that arrives later, such as a route change or a list that loads
  more, is translated as it appears.
- The widget itself never is. Its labels follow the chosen language where the
  widget has one (English, Spanish) and stay English otherwise.
- Code samples, `pre`, keyboard keys, form fields and anything marked
  `translate="no"` or `class="notranslate"` are left alone.
- `<html lang>` is set to the chosen language while translated, so screen
  readers switch voice, and is put back afterwards.
