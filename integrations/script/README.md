# Any other site

One tag, anywhere before `</body>`:

```html
<script src="/access-layer.iife.js" defer
        data-access-layer
        data-color="#1742C9"
        data-position="bottom-left"
        data-statement-url="/accessibility"></script>
```

That is the whole integration. The script defines `<access-layer>`, mounts one, and
restores whatever the visitor chose last time.

## Placing the element yourself

Set `data-auto="false"` and render the element wherever you like. This is the
route to take when a framework owns the DOM and objects to a stray body child.

```html
<script src="/access-layer.iife.js" defer data-access-layer data-auto="false"></script>
<access-layer color="#1742C9" position="bottom-right"></access-layer>
```

## As a module

```js
import { mount } from 'access-layer'

mount({ color: '#1742C9', position: 'bottom-left', statementUrl: '/accessibility' })
```
