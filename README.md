# Material de apoyo — Telecomunicaciones y Sistemas Operativos

Pequeño sitio estático con el temario en español e inglés, modo claro/oscuro y búsqueda.

Archivos principales:

- `index.html` — página principal
- `css/styles.css` — estilos (incluye soporte dark)
- `js/app.js` — lógica de idioma, tema, renderizado dinámico y búsqueda
- `locales/es.json`, `locales/en.json` — contenido por idioma
- `assets/` — imágenes y recursos
- `videos/` — (carpeta para videos locales)

Abrir localmente

1. Abrir `index.html` en el navegador. Para evitar problemas con fetch de archivos JSON es recomendable servirlo con un servidor HTTP simple:

```bash
# Python 3
python3 -m http.server 8000

# o con node (si tienes http-server instalado)
npx http-server -p 8000
```

2. Visitar `http://localhost:8000`.

Cómo añadir videos o imágenes

- Coloca archivos de video en `videos/` y reemplaza el iframe en `index.html` o ajusta `js/app.js` para soportar vídeos locales.

Notas

- La traducción al inglés fue realizada automáticamente; revísala antes de publicar.
