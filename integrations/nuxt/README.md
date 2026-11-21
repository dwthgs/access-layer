# Nuxt 3

1. Build the widget and copy the IIFE bundle into the app that will serve it:

   ```bash
   npm run build && cp dist/access-layer.iife.js ../your-app/public/
   ```

2. Copy `access-layer.client.ts` into the app's `plugins/` directory.

3. Add the public runtime config the plugin reads:

   ```js
   // nuxt.config.js
   runtimeConfig: {
     public: {
       accessLayerWidgetUrl: '/access-layer.iife.js',
       accessLayerWidgetColor: '#1742C9',
       accessLayerStatementUrl: '/accessibility',
       // Optional:
       accessLayerWidgetPosition: 'bottom-left', // or bottom-right, middle-left, ...
       accessLayerSkipLink: false, // when the app's layout has its own skip link
     },
   }
   ```

4. If the app loaded another accessibility widget, remove its script tag and
   any CSS that hid it in print. This widget hides itself in print.

## Server-rendered pages

The widget is client-only by design: it reads `localStorage` and measures
computed styles, neither of which exists during server rendering. The plugin
filename ends in `.client.ts` so Nuxt never runs it on the server.
