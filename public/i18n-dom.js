(function (global) {
  'use strict';
  var I = global.AbasI18n;
  if (!I || !global.document) return;
  var textState = new WeakMap(), attrState = new WeakMap(), observers = [];
  var blocked = 'script,style,textarea,input,[data-no-i18n],[translate="no"]';

  function translateText(node) {
    if (!node.parentElement || node.parentElement.closest(blocked)) return;
    var original = textState.get(node);
    if (!original || node.nodeValue !== original.last) original = { source: node.nodeValue, last: node.nodeValue };
    var output = I.t(original.source);
    if (output !== node.nodeValue) node.nodeValue = output;
    original.last = output;
    textState.set(node, original);
  }
  function translateAttributes(node) {
    if (node.closest('[data-no-i18n],[translate="no"]')) return;
    var state = attrState.get(node) || {};
    ['aria-label', 'title', 'placeholder', 'alt'].forEach(function (name) {
      var value = node.getAttribute(name);
      if (value === null) return;
      var record = state[name];
      if (!record || record.last !== value) record = { source: value, last: value };
      var output = I.t(record.source);
      if (output !== value) node.setAttribute(name, output);
      record.last = output; state[name] = record;
    });
    attrState.set(node, state);
  }
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.matches('script,style,[data-no-i18n],[translate="no"]')) return;
    translateAttributes(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) translateText(node);
      else translateAttributes(node);
    }
  }
  function refreshLinks(root) {
    root.querySelectorAll('a[data-home-link],a[data-module-link],a[data-module]').forEach(function (link) {
      var value = link.getAttribute('href');
      if (value && value.charAt(0) !== '#' && !value.startsWith('blob:')) link.setAttribute('href', I.href(value));
    });
    root.querySelectorAll('[data-language]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-language') === I.getLanguage())); });
  }
  function attach(root) {
    var observer;
    var options = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt', 'href'] };
    function sync() {
      if (observer) observer.disconnect();
      translateTree(root); refreshLinks(root);
      if (observer) observer.observe(root, options);
    }
    sync();
    observer = new MutationObserver(function (records) {
      observer.disconnect();
      records.forEach(function (record) {
        if (record.type === 'characterData') translateText(record.target);
        else if (record.type === 'attributes') {
          if (record.attributeName === 'href' && record.target.matches('[data-home-link],[data-module-link],[data-module]')) record.target.href = I.href(record.target.href);
          else translateAttributes(record.target);
        } else record.addedNodes.forEach(function (node) { translateTree(node); });
      });
      observer.observe(root, options);
    });
    observer.observe(root, options);
    global.addEventListener('abas-language-change', sync);
    observers.push({ sync: sync, observer: observer });
    return sync;
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-language]');
    if (button) I.setLanguage(button.getAttribute('data-language'));
  });
  I.attach = attach;
  I.flush = function () { observers.forEach(function (entry) { entry.sync(); }); };
})(window);