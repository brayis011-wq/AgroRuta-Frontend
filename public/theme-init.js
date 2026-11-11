// Aplica el modo oscuro antes de pintar, para que no se vea un destello blanco al cargar.
// Va en un archivo aparte (y no dentro de index.html) para que la política de seguridad
// (Content-Security-Policy en public/_headers) pueda prohibir todo script escrito en la página.
try {
  var t = localStorage.getItem('tema') || 'sistema';
  var oscuro = t === 'oscuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-tema', oscuro ? 'oscuro' : 'claro');
} catch (e) {}
