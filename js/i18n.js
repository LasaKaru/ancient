/* ============================================================================
   WARRIORS OF TAPROBANE — i18n.js   (roadmap §7 · localisation scaffold)
   A tiny string table + G.t(id) lookup so UI text can be externalised and
   translated. English is the source of truth; other languages fall back to it
   per-key, so a partial translation is safe. The main menu is wired as the
   worked example; extend STRINGS and replace literals with G.t('key') to
   localise more. Sinhala (si) and Tamil (ta) are seeded as first targets —
   treat the seed translations as a starting point for a native review.
   The chosen language persists in localStorage.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  const STRINGS = {
    en: {
      'menu.subtitle': 'Wars of the Ancient Isle',
      'menu.newGame': 'New Game',
      'menu.continue': 'Continue',
      'menu.map': 'Campaign Map — Taprobane',
      'menu.legends': '✦ Legends of the King',
      'menu.chapters': 'Chapters',
      'menu.saveSlots': 'Save Slots',
      'menu.settings': 'Settings',
      'menu.credits': 'Credits',
      'common.back': 'Back',
      'common.done': 'Done',
    },
    si: {   // සිංහල — seed translations, pending native review
      'menu.subtitle': 'පුරාණ දිවයිනේ යුද්ධ',
      'menu.newGame': 'නව ක්‍රීඩාව',
      'menu.continue': 'දිගටම',
      'menu.map': 'සටන් සිතියම — තප්‍රොබේන්',
      'menu.legends': '✦ රජුගේ පුරාවෘත්ත',
      'menu.chapters': 'පරිච්ඡේද',
      'menu.saveSlots': 'සුරැකුම්',
      'menu.settings': 'සැකසුම්',
      'menu.credits': 'ස්තුතිය',
      'common.back': 'ආපසු',
      'common.done': 'හරි',
    },
    ta: {   // தமிழ் — seed translations, pending native review
      'menu.subtitle': 'பண்டைத் தீவின் போர்கள்',
      'menu.newGame': 'புதிய விளையாட்டு',
      'menu.continue': 'தொடரவும்',
      'menu.map': 'படையெடுப்பு வரைபடம் — தப்ரோபேன்',
      'menu.legends': '✦ மன்னனின் தொன்மங்கள்',
      'menu.chapters': 'அத்தியாயங்கள்',
      'menu.saveSlots': 'சேமிப்புகள்',
      'menu.settings': 'அமைப்புகள்',
      'menu.credits': 'நன்றியுரை',
      'common.back': 'பின்',
      'common.done': 'சரி',
    },
  };
  const LANG_NAMES = { en: 'English', si: 'සිංහල', ta: 'தமிழ்' };

  G.I18N = {
    STRINGS, LANG_NAMES,
    lang: 'en',
    langs() { return Object.keys(STRINGS); },
    load() { try { const l = localStorage.getItem('rajarata_lang'); if (l && STRINGS[l]) this.lang = l; } catch (_) {} },
    setLang(l) { if (STRINGS[l]) { this.lang = l; try { localStorage.setItem('rajarata_lang', l); } catch (_) {} } },
    /** t('menu.newGame') → localised string, falling back to English then the key */
    t(id, fallback) {
      const cur = STRINGS[this.lang] || STRINGS.en;
      return (cur && cur[id]) || STRINGS.en[id] || fallback || id;
    },
  };
  G.I18N.load();
  G.t = (id, fallback) => G.I18N.t(id, fallback);
})();
