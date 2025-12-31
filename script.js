    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const cards = $$('.destination');
    const filterButtons = $$('.filterBtn');
    const searchInput = $('#search');
    const resultsText = $('#resultsText');
    const statCount = $('#statCount');

    const modal = $('#modal');
    const modalOverlay = $('#modalOverlay');
    const closeModal = $('#closeModal');
    const modalTitle = $('#modalTitle');
    const modalSubtitle = $('#modalSubtitle');
    const modalImg = $('#modalImg');
    const modalBest = $('#modalBest');
    const modalBudget = $('#modalBudget');
    const modalWhy = $('#modalWhy');
    const addToPlanBtn = $('#addToPlan');

    const openPlannerBtn = $('#openPlanner');
    const scrollToPlanBtn = $('#scrollToPlan');

    const regionSel = $('#region');
    const typeSel = $('#type');
    const daysInput = $('#days');
    const budgetInput = $('#budgetInput');
    const runPlannerBtn = $('#runPlanner');
    const resetPlannerBtn = $('#resetPlanner');
    const suggestionsList = $('#suggestionsList');
    const suggestionsMeta = $('#suggestionsMeta');
    const estCost = $('#estCost');
    const budgetBar = $('#budgetBar');

    const presetBtns = $$('.presetBtn');
    const shareBtn = $('#shareBtn');

    let activeFilter = 'all';
    let lastOpenedCard = null;
    let pinnedSuggestions = new Set();

    function formatINR(n) {
      try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
      } catch {
        return '₹' + Math.round(n).toLocaleString('en-IN');
      }
    }

    function cardMatches(card, filter, query) {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const name = (card.dataset.name || '').toLowerCase();
      const vibe = (card.dataset.vibe || '').toLowerCase();
      const location = (card.dataset.location || '').toLowerCase();

      const q = (query || '').trim().toLowerCase();
      const matchesQuery = !q || name.includes(q) || vibe.includes(q) || location.includes(q);

      if (filter === 'all') return matchesQuery;

      // Region filters (north/south) are stored as tags. Beach/hill/culture/nature also tags.
      const matchesFilter = tags.includes(filter);
      return matchesFilter && matchesQuery;
    }

    function applyFilters() {
      const q = searchInput.value;
      let shown = 0;

      cards.forEach(card => {
        const show = cardMatches(card, activeFilter, q);
        card.classList.toggle('hidden', !show);
        if (show) shown++;
      });

      statCount.textContent = String(shown);
      resultsText.textContent = shown === cards.length && (!q || q.trim() === '') && activeFilter === 'all'
        ? 'Showing all destinations.'
        : `Showing ${shown} destination${shown === 1 ? '' : 's'} for filter “${activeFilter}”${q && q.trim() ? ` and search “${q.trim()}”` : ''}.`;
    }

    function setActiveButton(filter) {
      filterButtons.forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('bg-slate-900', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('border-slate-900', isActive);
      });
    }

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        setActiveButton(activeFilter);
        applyFilters();
      });
    });

    searchInput.addEventListener('input', applyFilters);

    // Likes
    $$('.likeBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const countEl = btn.querySelector('.likeCount');
        const next = (parseInt(countEl.textContent || '0', 10) + 1);
        countEl.textContent = String(next);
        btn.classList.add('heart-pop');
        setTimeout(() => btn.classList.remove('heart-pop'), 260);
      });
    });

    // Modal details
    function openModalForCard(card) {
      lastOpenedCard = card;
      const title = card.querySelector('h3')?.textContent?.trim() || 'Destination';
      const subtitle = card.querySelector('p')?.textContent?.trim() || '';
      const imgSrc = card.querySelector('img')?.getAttribute('src') || '';

      modalTitle.textContent = title;
      modalSubtitle.textContent = (card.dataset.location ? `${card.dataset.location} • ` : '') + (card.dataset.vibe || subtitle);
      modalImg.src = imgSrc;
      modalBest.textContent = card.dataset.best || '—';
      modalBudget.textContent = formatINR(Number(card.dataset.budget || 0)) + ' (2–4 days)';

      const why = {
        jaipur: 'Walk through forts (Amber, Nahargarh), shop in colorful bazaars, and try local Rajasthani thali.',
        goa: 'Relax on beaches, try water sports, explore Portuguese lanes, and café-hop by the sea.',
        manali: 'Enjoy mountain viewpoints, visit Solang/Atal Tunnel routes, and do adventure activities.',
        kerala: 'Cruise the backwaters, experience houseboats, and explore lush tea gardens and Ayurveda.'
      };
      modalWhy.textContent = why[(card.dataset.name || '').toLowerCase()] || 'A great destination with memorable experiences.';

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      $('#closeModal').focus();
    }

    function closeModalNow() {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    $$('.detailsBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.destination');
        if (card) openModalForCard(card);
      });
    });

    // Click anywhere on card to open
    cards.forEach(card => {
      card.addEventListener('click', () => openModalForCard(card));
    });

    modalOverlay.addEventListener('click', closeModalNow);
    closeModal.addEventListener('click', closeModalNow);
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('hidden') && e.key === 'Escape') closeModalNow();
    });

    // Planner logic
    function getCardRegionTags(card) {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      return { tags, region: tags.includes('north') ? 'north' : (tags.includes('south') ? 'south' : 'any') };
    }

    function scoreCard(card, prefs) {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const budget = Number(card.dataset.budget || 0);

      let score = 0;
      if (prefs.region !== 'any' && tags.includes(prefs.region)) score += 3;
      if (prefs.type !== 'any' && tags.includes(prefs.type)) score += 3;

      // Budget closeness (lower diff = higher score)
      const diff = Math.abs(prefs.budget - budget);
      score += Math.max(0, 4 - Math.min(4, diff / 5000));

      // Days heuristic: beach/culture okay for shorter; nature/hill better for 4+.
      const days = prefs.days;
      if (days >= 4 && (tags.includes('hill') || tags.includes('nature'))) score += 1;
      if (days <= 3 && (tags.includes('beach') || tags.includes('culture'))) score += 1;

      // Pinned suggestions always bubble up
      if (pinnedSuggestions.has(card.dataset.name)) score += 10;

      return score;
    }

    function renderSuggestions(list, prefs) {
      suggestionsList.innerHTML = '';

      if (!list.length) {
        suggestionsList.innerHTML = '<div class="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/80">No matches. Try “Any” region/type or increase budget.</div>';
        estCost.textContent = '—';
        budgetBar.style.width = '0%';
        return;
      }

      const top = list[0];
      const topBudget = Number(top.dataset.budget || 0);

      list.slice(0, 3).forEach((card, idx) => {
        const name = card.querySelector('h3')?.textContent?.trim() || 'Destination';
        const vibe = card.dataset.vibe || '';
        const best = card.dataset.best || '—';
        const budget = Number(card.dataset.budget || 0);
        const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);

        const pill = tags.includes('north') ? 'North' : (tags.includes('south') ? 'South' : 'India');

        const row = document.createElement('div');
        row.className = 'rounded-xl border border-white/10 bg-black/10 p-4';
        row.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-extrabold text-white">${idx === 0 ? 'Top pick: ' : ''}${name}</div>
              <div class="mt-1 text-xs text-white/70">${vibe} • ${pill} • Best: ${best}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-white/60">Est.</div>
              <div class="text-sm font-extrabold text-white">${formatINR(budget)}</div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="jumpCard rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 focus-ring" type="button" data-name="${card.dataset.name}">Highlight card</button>
            <button class="pinBtn rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 focus-ring" type="button" data-name="${card.dataset.name}">${pinnedSuggestions.has(card.dataset.name) ? 'Pinned ✓' : 'Pin'}</button>
          </div>
        `;
        suggestionsList.appendChild(row);
      });

      suggestionsMeta.textContent = `Prefs: ${prefs.region}/${prefs.type}, ${prefs.days} day(s), budget ${formatINR(prefs.budget)}.`;

      // Budget bar: show how close user budget is to top pick (0-100)
      const closeness = Math.max(0, 1 - (Math.abs(prefs.budget - topBudget) / Math.max(topBudget, 1)));
      budgetBar.style.width = Math.round(closeness * 100) + '%';

      // Estimated cost scales mildly with days (simple demo)
      const dayFactor = 0.85 + Math.min(1.2, prefs.days / 5);
      const scaled = Math.round(topBudget * dayFactor);
      estCost.textContent = formatINR(scaled);

      // Wire buttons
      $$('.jumpCard', suggestionsList).forEach(b => {
        b.addEventListener('click', () => {
          const name = b.dataset.name;
          const target = cards.find(c => c.dataset.name === name);
          if (!target) return;
          target.classList.remove('hidden');
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('ring-4', 'ring-emerald-400/60');
          setTimeout(() => target.classList.remove('ring-4', 'ring-emerald-400/60'), 900);
        });
      });
      $$('.pinBtn', suggestionsList).forEach(b => {
        b.addEventListener('click', () => {
          const name = b.dataset.name;
          if (pinnedSuggestions.has(name)) pinnedSuggestions.delete(name);
          else pinnedSuggestions.add(name);
          runPlanner();
        });
      });
    }

    function runPlanner() {
      const prefs = {
        region: regionSel.value,
        type: typeSel.value,
        days: Math.max(2, Math.min(10, Number(daysInput.value || 4))),
        budget: Math.max(5000, Number(budgetInput.value || 20000))
      };

      daysInput.value = String(prefs.days);
      budgetInput.value = String(prefs.budget);

      const ranked = [...cards]
        .filter(card => {
          const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
          const regionOk = prefs.region === 'any' ? true : tags.includes(prefs.region);
          const typeOk = prefs.type === 'any' ? true : tags.includes(prefs.type);
          return regionOk && typeOk;
        })
        .sort((a, b) => scoreCard(b, prefs) - scoreCard(a, prefs));

      renderSuggestions(ranked, prefs);
    }

    runPlannerBtn.addEventListener('click', runPlanner);
    resetPlannerBtn.addEventListener('click', () => {
      regionSel.value = 'any';
      typeSel.value = 'any';
      daysInput.value = '4';
      budgetInput.value = '20000';
      pinnedSuggestions.clear();
      runPlanner();
    });

    addToPlanBtn.addEventListener('click', () => {
      if (!lastOpenedCard) return;
      pinnedSuggestions.add(lastOpenedCard.dataset.name);
      closeModalNow();
      document.location.hash = '#plan';
      setTimeout(runPlanner, 50);
    });

    // Presets
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'weekend') { regionSel.value = 'any'; typeSel.value = 'culture'; daysInput.value = '3'; budgetInput.value = '15000'; }
        if (preset === 'nature') { regionSel.value = 'south'; typeSel.value = 'nature'; daysInput.value = '5'; budgetInput.value = '25000'; }
        if (preset === 'adventure') { regionSel.value = 'north'; typeSel.value = 'hill'; daysInput.value = '5'; budgetInput.value = '20000'; }
        if (preset === 'beach') { regionSel.value = 'any'; typeSel.value = 'beach'; daysInput.value = '4'; budgetInput.value = '20000'; }
        document.location.hash = '#plan';
        setTimeout(runPlanner, 50);
      });
    });

    // Nav buttons
    openPlannerBtn.addEventListener('click', () => {
      document.location.hash = '#plan';
      setTimeout(() => $('#runPlanner').focus(), 50);
    });
    scrollToPlanBtn.addEventListener('click', () => {
      document.location.hash = '#plan';
    });

    // Share/copy link
    shareBtn.addEventListener('click', async () => {
      const url = window.location.href.split('#')[0] + '#';
      try {
        await navigator.clipboard.writeText(url);
        shareBtn.textContent = 'Link Copied ✓';
        setTimeout(() => (shareBtn.textContent = 'Copy Live Preview Link'), 1200);
      } catch {
        // Fallback
        const temp = document.createElement('input');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
        shareBtn.textContent = 'Link Copied ✓';
        setTimeout(() => (shareBtn.textContent = 'Copy Live Preview Link'), 1200);
      }
    });

    // Init
    setActiveButton('all');
    applyFilters();
    runPlanner();
