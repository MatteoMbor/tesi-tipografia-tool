/* Interruttore di stile: Editoriale <-> Svizzero. Preferenza salvata in localStorage. */
(function () {
  'use strict';
  const KEY = 'thesis_style';
  const root = document.documentElement;

  function currentStyle() {
    return root.getAttribute('data-style') === 'swiss' ? 'swiss' : 'default';
  }
  function apply(style) {
    if (style === 'swiss') root.setAttribute('data-style', 'swiss');
    else root.removeAttribute('data-style');
    localStorage.setItem(KEY, style);
    updateBtn();
  }
  function updateBtn() {
    const b = document.getElementById('styleSwitchBtn');
    if (!b) return;
    const swiss = currentStyle() === 'swiss';
    b.textContent = swiss ? 'Stile: Svizzero' : 'Stile: Editoriale';
    b.title = swiss ? 'Torna allo stile editoriale' : 'Prova lo stile svizzero';
    b.setAttribute('aria-pressed', String(swiss));
  }

  // Applica subito la preferenza salvata (evita il flash dello stile sbagliato)
  if (localStorage.getItem(KEY) === 'swiss') root.setAttribute('data-style', 'swiss');

  document.addEventListener('DOMContentLoaded', () => {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'styleSwitchBtn';
    b.className = 'style-btn';
    actions.prepend(b);
    b.addEventListener('click', () => apply(currentStyle() === 'swiss' ? 'default' : 'swiss'));
    updateBtn();
  });
})();