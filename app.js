/**
 * Cash-loss calculator (wave-3).
 * Loss in today's money = inflation erosion + opportunity cost (both in today's money).
 * Formula: loss = P * (1 - 1/(1+i)^n) + (P/(1+i)^n) * ((1+r)^n - 1)
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
    {
      id: 'US',
      name: 'United States',
      currencyCode: 'USD',
      currencySymbol: '$',
      cpi: { latest: 102.1, latestDate: '2024-M12', previous: 100.0, previousDate: '2023-M12' },
      rate: { value: 4.0, date: '2024-M12' }
    }
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
  const interestExplanationEl = document.getElementById('interest-explanation');
  const interestBreakEl = document.getElementById('interest-break');
  const inflationOnlyPeriodEl = document.getElementById('inflation-only-period');
  const popupOverlay = document.getElementById('popup-overlay');
  const popupClose = document.getElementById('popup-close');
  const popupContent = document.getElementById('popup-content');
  const popupLinks = document.querySelectorAll('[data-popup]');
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

  function parseFiniteNumber(value) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(num) ? num : null;
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

  function getInputs(country) {
    const cpi = country && country.cpi;
    const cpiLatest = parseFiniteNumber(cpi && cpi.latest);
    const cpiPrevious = parseFiniteNumber(cpi && cpi.previous);
    if (cpiLatest == null || cpiPrevious == null || cpiLatest <= 0 || cpiPrevious <= 0) {
      return null;
    }

    const inflationRate = (cpiLatest / cpiPrevious) - 1;
    const rateValue = parseFiniteNumber(country && country.rate && country.rate.value);
    const hasRate = rateValue != null;

    return {
      inflationRate: inflationRate,
      interestRate: hasRate ? (rateValue / 100) : 0,
      hasRate: hasRate
    };
  }

  function toggleInterestExplanation(hasRate) {
    if (!interestExplanationEl) return;
    interestExplanationEl.classList.toggle('hidden', !hasRate);
    if (interestBreakEl) interestBreakEl.classList.toggle('hidden', !hasRate);
    if (inflationOnlyPeriodEl) inflationOnlyPeriodEl.classList.toggle('hidden', hasRate);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPercent(valueDecimal) {
    return (valueDecimal * 100).toFixed(3).replace(/\.?0+$/, '');
  }

  function formatMoney(value, currencySymbol) {
    if (value >= 1e6) return currencySymbol + (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return currencySymbol + (value / 1e3).toFixed(1) + 'k';
    return currencySymbol + Math.round(value).toLocaleString();
  }

  /** Total loss in today's money: inflation erosion + opportunity cost. */
  function computeLoss(amount, inflationDecimal, savingsRateDecimal, years) {
    const factor = Math.pow(1 + inflationDecimal, years);
    const inflationErosion = amount * (1 - 1 / factor);
    const opportunityCost = (amount / factor) * (Math.pow(1 + savingsRateDecimal, years) - 1);
    return inflationErosion + opportunityCost;
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

  function buildHowCalculatedPopup(country, inputs) {
    if (!country || !country.cpi || !inputs) {
      return '<h3 id="popup-title">How these numbers are calculated</h3><p>Select a country to see concrete inputs and formulas.</p>';
    }

    const cpi = country.cpi;
    const cpiLatest = parseFiniteNumber(cpi.latest);
    const cpiPrevious = parseFiniteNumber(cpi.previous);
    const rateValue = parseFiniteNumber(country.rate && country.rate.value);
    const hasRate = rateValue != null;

    const inflationFormula = 'inflationRate = (latestCPI / previousCPI) - 1';
    const inflationSubstitution = 'inflationRate = (' + cpiLatest + ' / ' + cpiPrevious + ') - 1 = ' + formatPercent(inputs.inflationRate) + '%';
    const interestFormula = 'interestRate = rateValue / 100';
    const interestSubstitution = hasRate
      ? ('interestRate = ' + rateValue + ' / 100 = ' + formatPercent(inputs.interestRate) + '%')
      : 'Short-term interest rate is unavailable for this country in the current IMF dataset. This calculator uses inflation-only mode (interestRate = 0).';
    const oneYearFormula = '1-year loss = P * i + P * r';
    const longHorizonFormula = 'loss = P * (1 - 1/(1+i)^n) + (P/(1+i)^n) * ((1+r)^n - 1)';
    const variables = 'P = amount, i = inflationRate, r = interestRate, n = years';

    return ''
      + '<h3 id="popup-title">How these numbers are calculated for ' + escapeHtml(country.name) + '</h3>'
      + '<div class="popup-section">'
      + '<h4>Inflation input from IMF CPI index</h4>'
      + '<p>Latest CPI: <strong>' + escapeHtml(cpiLatest) + '</strong> (' + escapeHtml(cpi.latestDate) + ')</p>'
      + '<p>Previous CPI: <strong>' + escapeHtml(cpiPrevious) + '</strong> (' + escapeHtml(cpi.previousDate) + ')</p>'
      + '<p><code>' + escapeHtml(inflationFormula) + '</code></p>'
      + '<p><code>' + escapeHtml(inflationSubstitution) + '</code></p>'
      + '</div>'
      + '<div class="popup-section">'
      + '<h4>Interest input from IMF short-term rate</h4>'
      + (hasRate
        ? '<p>Rate value: <strong>' + escapeHtml(rateValue) + '%</strong> (' + escapeHtml(country.rate.date) + ')</p>'
          + '<p><code>' + escapeHtml(interestFormula) + '</code></p>'
          + '<p><code>' + escapeHtml(interestSubstitution) + '</code></p>'
        : '<p>' + escapeHtml(interestSubstitution) + '</p>')
      + '</div>'
      + '<div class="popup-section">'
      + '<h4>Loss formulas used on this page</h4>'
      + '<p><code>' + escapeHtml(oneYearFormula) + '</code></p>'
      + '<p><code>' + escapeHtml(longHorizonFormula) + '</code></p>'
      + '<p>' + escapeHtml(variables) + '</p>'
      + '<p>Total loss = purchasing power erosion from inflation + missed growth from not earning interest.</p>'
      + '</div>'
      + '<p class="popup-source">Based on <a href="https://data.imf.org" target="_blank" rel="noopener noreferrer">IMF Data</a></p>';
  }

  function openPopup() {
    if (!popupOverlay || !popupContent) return;
    const country = getCountry();
    const inputs = country ? getInputs(country) : null;
    popupContent.innerHTML = buildHowCalculatedPopup(country, inputs);
    popupOverlay.classList.remove('hidden');
    popupOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closePopup() {
    if (!popupOverlay || !popupContent) return;
    popupOverlay.classList.add('hidden');
    popupOverlay.setAttribute('aria-hidden', 'true');
    popupContent.innerHTML = '';
    document.body.classList.remove('modal-open');
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
      toggleInterestExplanation(false);
      loss1y.textContent = '—';
      loss5y.textContent = '—';
      loss10y.textContent = '—';
      return;
    }

    const inputs = getInputs(country);
    const sym = country.currencySymbol || '';

    if (!inputs) {
      toggleInterestExplanation(false);
      loss1y.textContent = '—';
      loss5y.textContent = '—';
      loss10y.textContent = '—';
      return;
    }

    toggleInterestExplanation(inputs.hasRate);

    const values = {
      1: amount * inputs.inflationRate + amount * inputs.interestRate,
      5: computeLoss(amount, inputs.inflationRate, inputs.interestRate, 5),
      10: computeLoss(amount, inputs.inflationRate, inputs.interestRate, 10)
    };

    animateResultNumbers(values, sym);
  }

  popupLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      openPopup();
    });
  });

  if (popupClose) {
    popupClose.addEventListener('click', closePopup);
  }
  if (popupOverlay) {
    popupOverlay.addEventListener('click', function (event) {
      if (event.target === popupOverlay) {
        closePopup();
      }
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closePopup();
    }
  });

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
