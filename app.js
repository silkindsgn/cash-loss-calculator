/**
 * Cash-loss calculator (wave-3).
 * Loss in today's money = opportunity cost of holding cash vs saving at average rate.
 * Formula: (P / (1+i)^n) * ((1+r)^n - 1)
 *   P = amount, i = inflation (decimal), r = savings rate (decimal), n = years.
 */

(function () {
  'use strict';

  const GEOLOCATION_API = 'https://ip-api.com/json/?fields=countryCode';
  const FALLBACK_COUNTRY_ID = 'US';
  const FADE_OUT_MS = 130;
  const FADE_IN_MS = 180;

  /** Minimal fallback when data/countries.json cannot be loaded (e.g. file://). */
  const FALLBACK_COUNTRIES = [
    { id: 'US', name: 'United States', currencyCode: 'USD', currencySymbol: '$', inflationAnnual: 2.95, savingsRateAnnual: 4.5 }
  ];

  let countryData = { countries: [] };

  const amountInput = document.getElementById('amount');
  const countrySelect = document.getElementById('country');
  const headlineWithAmount = document.getElementById('headline-with-amount');
  const headlineEmpty = document.getElementById('headline-empty');
  const subheadingEl = document.getElementById('subheading');
  const loss1y = document.getElementById('loss-1y');
  const loss5y = document.getElementById('loss-5y');
  const loss10y = document.getElementById('loss-10y');
  const resultNumbers = [loss1y, loss5y, loss10y];

  /** ISO 3166-1 alpha-2 country code to flag emoji (e.g. "US" -> 🇺🇸). */
  function countryToFlag(id) {
    if (!id || id.length !== 2) return '';
    return String.fromCodePoint(
      0x1F1E6 - 65 + id.charCodeAt(0),
      0x1F1E6 - 65 + id.charCodeAt(1)
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function loadCountryData() {
    return fetch('data/countries.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        countryData = data;
        return data.countries || [];
      });
  }

  function fillCountrySelect(countries) {
    countrySelect.innerHTML = '';
    countries.forEach(function (c) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = countryToFlag(c.id) + ' ' + c.name;
      countrySelect.appendChild(opt);
    });
  }

  function preSelectCountryFromIP() {
    return fetch(GEOLOCATION_API)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        const code = (data && data.countryCode) ? data.countryCode : null;
        if (code && countryData.countries.some(function (c) { return c.id === code; })) {
          countrySelect.value = code;
        } else {
          countrySelect.value = countryData.countries.some(function (c) { return c.id === FALLBACK_COUNTRY_ID; })
            ? FALLBACK_COUNTRY_ID
            : (countryData.countries[0] && countryData.countries[0].id);
        }
      })
      .catch(function () {
        countrySelect.value = countryData.countries.some(function (c) { return c.id === FALLBACK_COUNTRY_ID; })
          ? FALLBACK_COUNTRY_ID
          : (countryData.countries[0] && countryData.countries[0].id);
      });
  }

  function getCountry() {
    const id = countrySelect.value;
    return (countryData.countries || []).find(function (c) { return c.id === id; }) || null;
  }

  function formatMoney(value, currencySymbol) {
    if (value >= 1e6) return currencySymbol + (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return currencySymbol + (value / 1e3).toFixed(1) + 'k';
    return currencySymbol + Math.round(value).toLocaleString();
  }

  function computeLoss(amount, inflationDecimal, savingsRateDecimal, years) {
    const factor = Math.pow(1 + inflationDecimal, years);
    const growthFactor = Math.pow(1 + savingsRateDecimal, years);
    return (amount / factor) * (growthFactor - 1);
  }

  function setEmptyState(empty) {
    if (empty) {
      headlineWithAmount.classList.add('hidden');
      headlineEmpty.classList.remove('hidden');
      subheadingEl.classList.add('empty');
    } else {
      headlineWithAmount.classList.remove('hidden');
      headlineEmpty.classList.add('hidden');
      subheadingEl.classList.remove('empty');
    }
  }

  function animateResultNumbers(values, sym) {
    const reduced = prefersReducedMotion();
    const outMs = reduced ? 80 : FADE_OUT_MS;
    const inMs = reduced ? 80 : FADE_IN_MS;

    resultNumbers.forEach(function (el) { el.classList.add('animate-out'); });
    if (!reduced) resultNumbers.forEach(function (el) { el.classList.add('animate-out-move'); });

    setTimeout(function () {
      loss1y.textContent = values[1] != null ? formatMoney(values[1], sym) : '—';
      loss5y.textContent = values[5] != null ? formatMoney(values[5], sym) : '—';
      loss10y.textContent = values[10] != null ? formatMoney(values[10], sym) : '—';
      resultNumbers.forEach(function (el) {
        el.classList.remove('animate-out', 'animate-out-move');
        el.classList.add('animate-in');
      });
      if (!reduced) resultNumbers.forEach(function (el) { el.classList.add('animate-in-move'); });
      setTimeout(function () {
        resultNumbers.forEach(function (el) {
          el.classList.remove('animate-in', 'animate-in-move');
        });
      }, inMs);
    }, outMs);
  }

  function runCalculation() {
    const amount = parseFloat(amountInput.value, 10);
    const country = getCountry();
    const hasAmount = !isNaN(amount) && amount >= 0;

    if (!hasAmount) {
      setEmptyState(true);
      loss1y.textContent = '—';
      loss5y.textContent = '—';
      loss10y.textContent = '—';
      return;
    }

    setEmptyState(false);

    if (!country) {
      loss1y.textContent = '—';
      loss5y.textContent = '—';
      loss10y.textContent = '—';
      return;
    }

    const i = country.inflationAnnual / 100;
    const r = country.savingsRateAnnual / 100;
    const sym = country.currencySymbol || '';

    const values = {
      1: computeLoss(amount, i, r, 1),
      5: computeLoss(amount, i, r, 5),
      10: computeLoss(amount, i, r, 10)
    };

    animateResultNumbers(values, sym);
  }

  amountInput.addEventListener('input', runCalculation);
  amountInput.addEventListener('change', runCalculation);
  countrySelect.addEventListener('change', runCalculation);

  loadCountryData()
    .then(fillCountrySelect)
    .then(preSelectCountryFromIP)
    .then(runCalculation)
    .catch(function () {
      countryData.countries = FALLBACK_COUNTRIES;
      fillCountrySelect(countryData.countries);
      countrySelect.value = FALLBACK_COUNTRY_ID;
      runCalculation();
    });

  var shareUrl = 'https://silkindsgn.github.io/cash-loss-calculator/';
  var twitterText = 'How much do you lose keeping money in cash?';

  document.getElementById('share-copy').addEventListener('click', function () {
    navigator.clipboard.writeText(shareUrl).then(function () {
      var btn = document.getElementById('share-copy');
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = orig; }, 1500);
    });
  });

  var twitterLink = document.getElementById('share-twitter');
  twitterLink.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(twitterText) + '&url=' + encodeURIComponent(shareUrl);
})();
