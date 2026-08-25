// =========================
// TYPE COLORS
// =========================
const TYPE_COLORS = {
  Normal: "#A8A77A",
  Fire: "#EE8130",
  Water: "#6390F0",
  Electric: "#F7D02C",
  Grass: "#7AC74C",
  Ice: "#96D9D6",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#E2BF65",
  Flying: "#A98FF3",
  Psychic: "#F95587",
  Bug: "#A6B91A",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#B7B7CE",
  Fairy: "#D685AD"
};

const TYPE_ICONS = {
  Normal: 1,
  Fighting: 2,
  Flying: 3,
  Poison: 4,
  Ground: 5,
  Rock: 6,
  Bug: 7,
  Ghost: 8,
  Steel: 9,
  Fire: 10,
  Water: 11,
  Grass: 12,
  Electric: 13,
  Psychic: 14,
  Ice: 15,
  Dragon: 16,
  Dark: 17,
  Fairy: 18
};




function isColorLight(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160;
}

window.alreadyRolled = new Set();

const savedTeam = localStorage.getItem("savedTeam");
window.team = savedTeam ? JSON.parse(savedTeam) : [];
updateTeamGrid();

window.lockTurnIndex = 0;



// =========================
// PAGE LOADING
// =========================
function loadPage(pageId) {
  const page = document.getElementById(pageId);

  document.getElementById("mainContent").innerHTML =
    page.querySelector(".page-main").innerHTML;

  document.getElementById("sidebarContent").innerHTML =
    page.querySelector(".page-sidebar").innerHTML;

  document.getElementById("teamContent").innerHTML =
    page.querySelector(".page-team")?.innerHTML || "";

  // ⭐ FIXED: compare pageId, not page element
 if (pageId === "lockdownPage") {
  const draftArea = document.getElementById("lockdownDraftArea");
  if (draftArea) draftArea.classList.add("hidden");

  const teamSection = document.getElementById("teamSection");
  if (teamSection) teamSection.style.display = "none";

  setupLockdownTypeIcons();   //  REQUIRED
}



  if (pageId === "buildupPage") {
    const teamSection = document.getElementById("teamSection");
    if (teamSection) teamSection.style.display = "block";
  }

  setupSidebarInteractions();
}



// =========================
// MODE SWITCHING
// =========================
function switchMode(mode) {
  const header = document.querySelector(".top-section");
  const title = document.getElementById("pageTitle");

  // Save mode
  localStorage.setItem("lastMode", mode);

  if (mode === "buildup") {
    header.style.background = "#c62828";
    header.style.borderBottom = "3px solid #8e1c1c";
    title.textContent = "Pokémon Buildup Mode";
    loadPage("buildupPage");
    updateTeamGrid();
  }

  if (mode === "lockdown") {
    header.style.background = "#1565c0";
    header.style.borderBottom = "3px solid #0d3a6b";
    title.textContent = "Pokémon Lockdown Mode";
    loadPage("lockdownPage");
  }
}


document.getElementById("btnBuildup").onclick = () => switchMode("buildup");
document.getElementById("btnLockdown").onclick = () => switchMode("lockdown");

document.fonts.ready.then(() => {
  const lastMode = localStorage.getItem("lastMode") || "buildup";
  switchMode(lastMode);
});


// =========================
// SIDEBAR INTERACTIONS
// =========================
function setupSidebarInteractions() {
    
  // --- TYPE FILTER TOGGLE ---
  const enableTypeFilter = document.getElementById("enableTypeFilter");
  const exactMatchBox = document.getElementById("exactMatchBox");
  const typeButtonsBox = document.getElementById("typeButtons");
  const monoOnlyBox = document.getElementById("monoOnlyBox");

  if (enableTypeFilter) {
    enableTypeFilter.addEventListener("change", () => {
      const show = enableTypeFilter.checked;
      exactMatchBox.classList.toggle("hidden", !show);
      typeButtonsBox.classList.toggle("hidden", !show);
      monoOnlyBox.classList.toggle("hidden", !show);
    });
  }

  // --- BST SLIDERS ---
  const minBST = document.getElementById("minBST");
  const maxBST = document.getElementById("maxBST");
  const minBSTValue = document.getElementById("minBSTValue");
  const maxBSTValue = document.getElementById("maxBSTValue");

  if (minBST && minBSTValue) {
    minBST.addEventListener("input", () => {
      minBSTValue.textContent = minBST.value;
    });
  }

  if (maxBST && maxBSTValue) {
    maxBST.addEventListener("input", () => {
      maxBSTValue.textContent = maxBST.value;
    });
  }

  // --- TYPE BUTTON CHECKBOX BEHAVIOR ---
  const typeButtons = document.querySelectorAll("#typeButtons button");
  window.selectedTypes = new Set();

  typeButtons.forEach(btn => {
    const type = btn.dataset.type;
    const color = TYPE_COLORS[type];

    btn.style.background = color;
    btn.style.border = "2px solid #00000055";
    btn.style.fontWeight = "600";
    btn.style.color = isColorLight(color) ? "#000" : "#fff";

    btn.addEventListener("click", () => {
      if (window.selectedTypes.has(type)) {
        window.selectedTypes.delete(type);
        btn.classList.remove("selected");
        btn.style.outline = "none";
      } else {
        window.selectedTypes.add(type);
        btn.classList.add("selected");
        btn.style.outline = "3px solid white";
      }
    });

    // Save when type buttons change
typeButtons.forEach(btn => {
  btn.addEventListener("click", saveFilters);
});

// Save when sliders change
minBST.addEventListener("input", saveFilters);
maxBST.addEventListener("input", saveFilters);

// Save when stage checkboxes change
["stage1", "stage2", "stage3", "singleStage", "fullyEvolved"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", saveFilters);
});

// Save when toggles change
enableTypeFilter.addEventListener("change", saveFilters);
exactMatch.addEventListener("change", saveFilters);

  });

  // --- ROLL BUTTON ---
  const rollButton = document.getElementById("rollButton");
  if (rollButton) {
    rollButton.addEventListener("click", startRollSequence);
  }
  const resetButton = document.getElementById("resetFilters");
    if (resetButton) {
      resetButton.addEventListener("click", resetFilters);
    }

    loadFilters();

    document.addEventListener("click", (e) => {
  if (e.target.id === "startLockdown") {

  // Read settings
  const players = Number(document.getElementById("lockPlayers").value);
  const typesPerPlayer = Number(document.getElementById("lockTypesPerPlayer").value);
  const orderMode = document.getElementById("lockOrder").value;

  // Store globally
  window.lockSettings = {
    players,
    typesPerPlayer,
    orderMode
  };



  // Reveal draft area
  const draftArea = document.getElementById("lockdownDraftArea");
  if (draftArea) draftArea.classList.remove("hidden");

  // Initialize bins
  initLockdownBins(players);

  // Initialize turn order
  initLockdownTurnOrder();

window.lockTurnIndex = 0;
window.lockPlayerTypes = Array(window.lockSettings.players).fill(0);
window.lockdownActivePlayer = window.lockTurnOrder[0];


}

});

}


// =========================
// ROLL SYSTEM
// =========================
async function startRollSequence() {
  const rollButton = document.getElementById("rollButton");
  const rollSlots = document.getElementById("rollSlots");

  rollButton.disabled = true;   // during animation
    

  const rollCount = Number(document.getElementById("rollCount").value) || 3;

  // Get filtered pool ONCE
  const pool = getFilteredPokemonPool();

  // Cap number of slots to pool size
  const maxSlots = Math.min(rollCount, pool.length);

  rollSlots.innerHTML = "";
  const slots = [];

  for (let i = 0; i < maxSlots; i++) {
    const slot = document.createElement("div");
    slot.className = "roll-slot clickable-slot";
    slot.innerHTML = `<span>Rolling...</span>`;
    rollSlots.appendChild(slot);
    slots.push(slot);
  }

  animateSlotsSequentially(slots, pool);
}



// =========================
// FILTERING
// =========================
function getSelectedTypes() {
  return Array.from(window.selectedTypes).map(t => t.toLowerCase());
}

function getSelectedStages() {
  const stages = [];
  if (document.getElementById("stage1")?.checked) stages.push("first");
  if (document.getElementById("stage2")?.checked) stages.push("second");
  if (document.getElementById("stage3")?.checked) stages.push("third");
  if (document.getElementById("singleStage")?.checked) stages.push("single");
  if (document.getElementById("fullyEvolved")?.checked) stages.push("fully");
  return stages;
}

function arraysEqualIgnoreOrder(a, b) {
  if (a.length !== b.length) return false;
  return a.every(v => b.includes(v));
}

function getFilteredPokemonPool() {
  const selectedTypes = getSelectedTypes().map(t => t.toLowerCase());
  const exactMatch = document.getElementById("exactMatch")?.checked;
  const monoOnly = document.getElementById("monoOnly")?.checked;

  const minBST = Number(document.getElementById("minBST").value);
  const maxBST = Number(document.getElementById("maxBST").value);

  const stages = getSelectedStages();

  return window.POKEDEX.filter(p => {

    // Exclude Pokémon already rolled
    if (window.alreadyRolled.has(p.id)) return false;

    // Exclude Pokémon already on your team
    if (window.team.some(t => t.id === p.id)) return false;

    const pTypes = p.type.map(t => t.toLowerCase());
    const isMono = pTypes.length === 1;

    // TYPE FILTER
    if (selectedTypes.length > 0) {

      // MODE 3: monoOnly only (exactMatch = false, monoOnly = true)
      if (!exactMatch && monoOnly) {
        if (!isMono) return false;
        if (!selectedTypes.includes(pTypes[0])) return false;
      }

      // MODE 2: exactMatch only (exactMatch = true, monoOnly = false)
      else if (exactMatch && !monoOnly) {
        if (pTypes.length !== 2) return false;
        if (!(selectedTypes.includes(pTypes[0]) && selectedTypes.includes(pTypes[1]))) {
          return false;
        }
      }

      // MODE 4: exactMatch + monoOnly (exactMatch = true, monoOnly = true)
      else if (exactMatch && monoOnly) {
        const monoOk = isMono && selectedTypes.includes(pTypes[0]);
        const dualOk = pTypes.length === 2 &&
                       selectedTypes.includes(pTypes[0]) &&
                       selectedTypes.includes(pTypes[1]);
        if (!monoOk && !dualOk) return false;
      }

      // MODE 1: normal type filter (exactMatch = false, monoOnly = false)
      else {
        if (!pTypes.some(t => selectedTypes.includes(t))) return false;
      }
    }

    // BST FILTER
    const bst = Object.values(p.stats).reduce((a, b) => a + b, 0);
    if (bst < minBST || bst > maxBST) return false;

    // STAGE FILTER
    if (stages.length > 0) {
      const pStages = computeStage(p);
      if (!pStages.some(s => stages.includes(s))) return false;
    }

    return true;
  });
}


function resetFilters() {
  // Clear type selections
  window.selectedTypes.clear();
  document.querySelectorAll("#typeButtons button").forEach(btn => {
    btn.classList.remove("selected");
    btn.style.outline = "none";
  });

  // Reset BST sliders
  const minBST = document.getElementById("minBST");
  const maxBST = document.getElementById("maxBST");
  const minBSTValue = document.getElementById("minBSTValue");
  const maxBSTValue = document.getElementById("maxBSTValue");

  minBST.value = 0;
  maxBST.value = 800;
  minBSTValue.textContent = "0";
  maxBSTValue.textContent = "800";
  rollCount.value = 3;

  // Reset stage checkboxes
  ["stage1", "stage2", "stage3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

    ["singleStage", "fullyEvolved"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });

  // Reset type filter toggles
  const enableTypeFilter = document.getElementById("enableTypeFilter");
  const exactMatch = document.getElementById("exactMatch");
  const monoOnly = document.getElementById("monoOnly");

  if (enableTypeFilter) enableTypeFilter.checked = false;
  if (exactMatch) exactMatch.checked = false;
  if (monoOnly) monoOnly.checked = false;

  // Save cleared filters
  saveFilters();
}

function saveFilters() {
  const data = {
      rollCount: document.getElementById("rollCount").value,

    selectedTypes: Array.from(window.selectedTypes),
    minBST: document.getElementById("minBST").value,
    maxBST: document.getElementById("maxBST").value,
    stages: getSelectedStages(),
    enableTypeFilter: document.getElementById("enableTypeFilter")?.checked || false,
    exactMatch: document.getElementById("exactMatch")?.checked || false,
  };
  data.monoOnly = document.getElementById("monoOnly").checked;

  localStorage.setItem("filters", JSON.stringify(data));
}

function loadFilters() {
  const raw = localStorage.getItem("filters");
  if (!raw) return;

  const data = JSON.parse(raw);

  if (data.rollCount) {
  document.getElementById("rollCount").value = data.rollCount;
}

  // Restore BST sliders
  const minBST = document.getElementById("minBST");
  const maxBST = document.getElementById("maxBST");
  const minBSTValue = document.getElementById("minBSTValue");
  const maxBSTValue = document.getElementById("maxBSTValue");

  minBST.value = data.minBST;
  maxBST.value = data.maxBST;
  minBSTValue.textContent = data.minBST;
  maxBSTValue.textContent = data.maxBST;

  // Restore stage checkboxes
    if (data.stages) {
      if (data.stages.includes("first")) document.getElementById("stage1").checked = true;
      if (data.stages.includes("second")) document.getElementById("stage2").checked = true;
      if (data.stages.includes("third")) document.getElementById("stage3").checked = true;
      if (data.stages.includes("single")) document.getElementById("singleStage").checked = true;
      if (data.stages.includes("fully")) document.getElementById("fullyEvolved").checked = true;
    }


  // Restore toggles
  const enableTypeFilter = document.getElementById("enableTypeFilter");
  const exactMatch = document.getElementById("exactMatch");

  if (enableTypeFilter) enableTypeFilter.checked = data.enableTypeFilter;
  if (exactMatch) exactMatch.checked = data.exactMatch;

  if (data.monoOnly !== undefined) {
  document.getElementById("monoOnly").checked = data.monoOnly;
}


}



// =========================
// SLOT ANIMATION
// =========================
function animateSlotsSequentially(slots, pool) {
  const intervals = [];

  // Start ALL slots rolling immediately
  slots.forEach(slot => {
    const interval = setInterval(() => {
      // Use current pool for animation
      const rand = pool[Math.floor(Math.random() * pool.length)];
      slot.innerHTML = `
        <img class="slot-img"
             src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${rand.imageId}.png">
        <span>${rand.name}</span>
      `;
    }, 80);

    intervals.push(interval);
  });

  let index = 0;

  function stopNextSlot() {
    if (index >= slots.length)
    {
        const rollButton = document.getElementById("rollButton");
        rollButton.disabled = false;
        return;
    }

    const slot = slots[index];
    clearInterval(intervals[index]);

    // If pool is empty, nothing more to roll
    if (pool.length === 0) return;

    // Pick final from current pool
    const finalIndex = Math.floor(Math.random() * pool.length);
    const final = pool[finalIndex];

slot.innerHTML = `
  <div class="slot-content">

    <div class="slot-left">
      <img class="slot-img"
           src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${final.imageId}.png">

      <div class="slot-name">${final.name}</div>

      <div class="slot-types">
      ${final.type.map(t => `<span class="slot-type" style="background:${TYPE_COLORS[t]};">
  ${t}
</span>`).join("")}
    </div>
    </div>
    <div class="slot-right">

      ${getTypeMatchups(final.type).weak.length > 0 ? `
        <div class="slot-matchup slot-weak">
          <strong>Weak:</strong> ${getTypeMatchups(final.type).weak.join(", ")}
        </div>
      ` : ""}

      ${getTypeMatchups(final.type).resist.length > 0 ? `
        <div class="slot-matchup slot-resist">
          <strong>Resist:</strong> ${getTypeMatchups(final.type).resist.join(", ")}
        </div>
      ` : ""}

      ${getTypeMatchups(final.type).immune.length > 0 ? `
        <div class="slot-matchup slot-immune">
          <strong>Immune:</strong> ${getTypeMatchups(final.type).immune.join(", ")}
        </div>
      ` : ""}

      <div class="slot-stats">
        HP ${final.stats["HP"]} |
        Atk ${final.stats["Attack"]} |
        Def ${final.stats["Defense"]} |
        SpA ${final.stats["Sp. Attack"]} |
        SpD ${final.stats["Sp. Defense"]} |
        Spe ${final.stats["Speed"]}
        <br>
        BST ${final.stats["HP"]
   + final.stats["Attack"]
   + final.stats["Defense"]
   + final.stats["Sp. Attack"]
   + final.stats["Sp. Defense"]
   + final.stats["Speed"]}
      </div>

    </div>

  </div>
`;


    // Remove this Pokémon from pool so it can't be used again
    pool.splice(finalIndex, 1);

    slot.classList.add("slot-ready", "clickable-slot");

    slot.addEventListener("click", () => handleSlotSelection(final, slot));

    index++;
    setTimeout(stopNextSlot, 600);
  }

  stopNextSlot();
}





// =========================
// SLOT SELECTION
// =========================
function handleSlotSelection(pokemon, slotElement) {

  // Prevent double-picking
  if (slotElement.classList.contains("picked")) return;

  // Mark this slot as picked
  slotElement.classList.add("picked");
  slotElement.style.borderColor = "#00e676";
  slotElement.style.boxShadow = "0 0 10px #00e676";

  // Gray out all other roll slots
  document.querySelectorAll(".roll-slot").forEach(s => {
    if (!s.classList.contains("picked")) {
      s.style.opacity = "0.4";
      s.style.pointerEvents = "none";
    }
  });

window.team.push(pokemon);
updateTeamGrid();
localStorage.setItem("savedTeam", JSON.stringify(window.team));


}

function updateTeamGrid() {
  const slots = document.querySelectorAll("#teamGrid .team-slot");

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const mon = window.team[i];

    if (mon) {
      slot.innerHTML = `
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${mon.imageId}.png">
        <span>${mon.name}</span>
      `;
    } else {
      slot.innerHTML = "";
    }
  }
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "restartBuildup") {
    window.team = [];
    updateTeamGrid();
    localStorage.removeItem("savedTeam");
  }


});





function computeStage(p) {
  const evo = p.evolution || {};
  const hasPrev = Array.isArray(evo.prev) && evo.prev.length > 0;
  const hasNext = Array.isArray(evo.next) && evo.next.length > 0;

  const stages = [];

  // SINGLE STAGE: no prev, no next
  if (!hasPrev && !hasNext) {
    stages.push("single");
    return stages;
  }

  // FIRST STAGE: no prev, has next
  if (!hasPrev && hasNext) {
    stages.push("first");
    return stages;
  }

  // FULLY EVOLVED: has prev, no next
  if (hasPrev && !hasNext) {
    stages.push("fully");

    const prevId = evo.prev[0];
    const prevMon = window.POKEDEX.find(q => q.id === prevId);
    const prevHasPrev =
      prevMon &&
      prevMon.evolution &&
      Array.isArray(prevMon.evolution.prev) &&
      prevMon.evolution.prev.length > 0;

    // Third stage if previous also has a previous
    if (prevHasPrev) {
      stages.push("third");
    } else {
      // Like Honchkrow: prev exists, prev has no prev → second stage + fully
      stages.push("second");
    }

    return stages;
  }

  // SECOND STAGE: has prev and has next (middle)
  if (hasPrev && hasNext) {
    stages.push("second");

    const prevId = evo.prev[0];
    const prevMon = window.POKEDEX.find(q => q.id === prevId);
    const prevHasPrev =
      prevMon &&
      prevMon.evolution &&
      Array.isArray(prevMon.evolution.prev) &&
      prevMon.evolution.prev.length > 0;

    // In a 3-stage line, this is also "third" logically for some chains,
    // but per your rules, middle evo is "second" even if prev has prev.
    // If you want to tag it as third too, uncomment:
    // if (prevHasPrev) stages.push("third");

    return stages;
  }

  return stages;
}

const TYPE_CHART = {
  Normal:{Fighting:2,Ghost:0},
  Fire:{Water:2,Ground:2,Rock:2,Fire:0.5,Grass:0.5,Ice:0.5,Bug:0.5,Steel:0.5,Fairy:0.5},
  Water:{Electric:2,Grass:2,Fire:0.5,Water:0.5,Ice:0.5,Steel:0.5},
  Electric:{Ground:2,Electric:0.5,Flying:0.5,Steel:0.5},
  Grass:{Fire:2,Ice:2,Poison:2,Flying:2,Bug:2,Water:0.5,Electric:0.5,Grass:0.5,Ground:0.5},
  Ice:{Fire:2,Fighting:2,Rock:2,Steel:2,Ice:0.5},
  Fighting:{Flying:2,Psychic:2,Fairy:2,Bug:0.5,Rock:0.5,Dark:0.5},
  Poison:{Ground:2,Psychic:2,Grass:0.5,Fighting:0.5,Poison:0.5,Bug:0.5,Fairy:0.5},
  Ground:{Water:2,Grass:2,Ice:2,Poison:0.5,Rock:0.5,Electric:0},
  Flying:{Electric:2,Ice:2,Rock:2,Grass:0.5,Fighting:0.5,Bug:0.5,Ground:0},
  Psychic:{Bug:2,Ghost:2,Dark:2,Fighting:0.5,Psychic:0.5},
  Bug:{Fire:2,Flying:2,Rock:2,Grass:0.5,Fighting:0.5,Ground:0.5},
  Rock:{Water:2,Grass:2,Fighting:2,Ground:2,Steel:2,Normal:0.5,Fire:0.5,Poison:0.5,Flying:0.5},
  Ghost:{Ghost:2,Dark:2,Poison:0.5,Bug:0.5,Normal:0,Fighting:0},
  Dragon:{Ice:2,Dragon:2,Fairy:2,Fire:0.5,Water:0.5,Electric:0.5,Grass:0.5},
  Dark:{Fighting:2,Bug:2,Fairy:2,Ghost:0.5,Dark:0.5,Psychic:0},
  Steel:{Fire:2,Fighting:2,Ground:2,Normal:0.5,Grass:0.5,Ice:0.5,Flying:0.5,Psychic:0.5,Bug:0.5,Rock:0.5,Dragon:0.5,Steel:0.5,Fairy:0.5,Poison:0},
  Fairy:{Poison:2,Steel:2,Fighting:0.5,Bug:0.5,Dark:0.5,Dragon:0}
};


function getTypeMatchups(types) {
  const result = {};

  // Start with all types neutral (1×)
  for (const defType in TYPE_CHART) {
    result[defType] = 1;
  }

  // Apply each attacking type's modifiers
  types.forEach(t => {
    const chart = TYPE_CHART[t];
    if (!chart) return;

    for (const defType in chart) {
      result[defType] *= chart[defType];
    }
  });

  // Build final lists
  const weak = [];
  const resist = [];
  const immune = [];

  for (const defType in result) {
    const mult = result[defType];

    if (mult === 0) immune.push(defType);
    else if (mult > 1) weak.push(defType);
    else if (mult < 1) resist.push(defType);
  }

  return { weak, resist, immune };
}


function updateLockdownResults() {
  const selectedTypes = getSelectedTypes(); // you already have this
  const pool = window.POKEDEX.filter(p =>
    p.type.some(t => selectedTypes.includes(t.toLowerCase()))
  );

  // Sort by BST descending
  const sorted = pool.sort((a, b) => {
    const bstA = Object.values(a.stats).reduce((x, y) => x + y, 0);
    const bstB = Object.values(b.stats).reduce((x, y) => x + y, 0);
    return bstB - bstA;
  });

  const html = `
    <h3>Types Selected: ${selectedTypes.join(", ")}</h3>
    <h4>Top BST Pokémon</h4>
    <ul>
      ${sorted.slice(0, 10).map(mon => `
        <li>${mon.name} — BST ${Object.values(mon.stats).reduce((x,y)=>x+y,0)}</li>
      `).join("")}
    </ul>
  `;

  document.getElementById("lockdownResults").innerHTML = html;
}


function initLockdownBins(playerCount) {
  const bins = document.getElementById("lockdownBins");
  bins.innerHTML = "";

  for (let i = 1; i <= playerCount; i++) {
    bins.innerHTML += `
      <div class="lockdown-bin" id="playerBin${i}">
        <h4>Player ${i}</h4>
        <div class="type-list" id="playerTypes${i}"></div>
        <div class="combo-list" id="playerCombos${i}"></div>
      </div>
    `;
  }
}

document.querySelectorAll("#lockdownTypeGrid button").forEach(btn => {
  btn.addEventListener("mouseenter", () => {
    const type = btn.dataset.type;
    updateLockdownPreview(type);
  });
});


function updateLockdownPreview(type) {
  const activePlayer = window.lockdownActivePlayer;

  // Get top 5 monotype Pokémon
  const topMono = getTopMonoType(type, 5);

  // Build HTML
  let html = `
    <div class="combo-section">
      <strong>${type} — Top Monotype Pokémon</strong>
      <div>${topMono.map(m => `${m.name} (BST ${Object.values(m.stats).reduce((x,y)=>x+y,0)})`).join(", ")}</div>
    </div>
  `;

  // Also show your existing combo logic
  const combos = computeTypeCombos(activePlayer, type);
  html += combos.map(combo => {
    const mons = getTopBST(combo, 5);
    return `
      <div class="combo-section">
        <strong>${combo.join(" / ")}</strong>
        <div>${mons.map(m => m.name).join(", ")}</div>
      </div>
    `;
  }).join("");

  document.getElementById(`playerCombos${activePlayer}`).innerHTML = html;
}


document.querySelectorAll("#lockdownTypeGrid button").forEach(btn => {
  btn.addEventListener("click", () => {
  const type = btn.dataset.type;

  // Prevent double picking
  if (btn.classList.contains("picked")) return;

  // Mark picked
  btn.classList.add("picked");
  btn.disabled = true;

  // Add to player bin
  addTypeToPlayer(window.lockdownActivePlayer, type);

  // Advance turn
  advanceLockdownTurn();
});

});

document.querySelectorAll("#lockdownTypeGrid .type-icon").forEach(btn => {
  const type = btn.dataset.type;
  btn.style.backgroundImage = `url(${TYPE_ICONS[type]})`;

  btn.addEventListener("click", () => {
    if (btn.classList.contains("picked")) return;

    btn.classList.add("picked");
    btn.disabled = true;

    addTypeToPlayer(window.lockdownActivePlayer, type);
    advanceLockdownTurn();
  });

  btn.addEventListener("mouseenter", () => {
    updateLockdownPreview(type);
  });
});


function updateActivePlayerUI() {
  const name = document.getElementById("activePlayerName");
  const color = document.getElementById("activePlayerColor");

  name.textContent = `Player ${window.lockdownActivePlayer}`;

  const colors = ["#ff5252", "#40c4ff", "#69f0ae", "#ffd740"];
  color.style.background = colors[(window.lockdownActivePlayer - 1) % colors.length];
}

function initLockdownBins(count) {
  const bins = document.getElementById("lockdownBins");
  bins.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    bins.innerHTML += `
      <div class="lockdown-bin" id="playerBin${i}">
        <h4>Player ${i}</h4>
        <div class="type-list" id="playerTypes${i}"></div>
        <div class="combo-list" id="playerCombos${i}"></div>
      </div>
    `;
  }
}

function initLockdownTurnOrder() {
  const { players, orderMode } = window.lockSettings;

  let order = [];

  if (orderMode === "inorder") {
    // Simple repeating order
    for (let i = 1; i <= players; i++) order.push(i);
  }

  if (orderMode === "snake") {
    // Forward then backward
    const forward = [];
    const backward = [];
    for (let i = 1; i <= players; i++) forward.push(i);
    for (let i = players; i >= 1; i--) backward.push(i);
    order = [...forward, ...backward];
  }

  if (orderMode === "randomRound") {
    // Shuffle players each round
    order = shuffleArray([...Array(players).keys()].map(i => i + 1));
  }

  if (orderMode === "randomFull") {
    // Full random, but players who finish their types are removed
    order = shuffleArray([...Array(players).keys()].map(i => i + 1));
  }

  window.lockTurnOrder = order;
}

function shuffleArray(arr) {
  return arr
    .map(x => ({ x, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.x);
}

function advanceLockdownTurn() {
  const { orderMode } = window.lockSettings;

  // Count pick
  window.lockPlayerTypes[window.lockdownActivePlayer - 1]++;

  // All done?
  const { players, typesPerPlayer } = window.lockSettings;
  const allDone = window.lockPlayerTypes.every(c => c >= typesPerPlayer);
  if (allDone) {
    lockdownComplete();
    return;
  }

  if (orderMode === "inorder" || orderMode === "snake") {
    nextSequentialPlayer();
  } else if (orderMode === "randomRound") {
    randomInRoundNext();
  } else if (orderMode === "randomFull") {
    randomThroughoutNext();
  }

  updateActivePlayerUI();
}




function setupLockdownTypeIcons() {
  document.querySelectorAll("#lockdownTypeGrid .type-icon").forEach(btn => {
    const type = btn.dataset.type;
    btn.style.backgroundImage = `url(${getTypeIconUrl(type)})`;

    btn.addEventListener("click", () => {
      if (btn.classList.contains("picked")) return;

      btn.classList.add("picked");
      btn.disabled = true;

      addTypeToPlayer(window.lockdownActivePlayer, type);
      advanceLockdownTurn();
    });

    btn.addEventListener("mouseenter", () => {
      updateLockdownPreview(type);
    });
  });
}



function addTypeToPlayer(player, type) {
  const typeList = document.getElementById(`playerTypes${player}`);
  typeList.innerHTML += `
    <span class="player-type">${type}</span>
  `;
}

function getTypeIconUrl(type) {
  const id = TYPE_ICONS[type];
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/legends-arceus/${id}.png`;
}

function lockdownComplete() {
  const name = document.getElementById("activePlayerName");
  const color = document.getElementById("activePlayerColor");

  name.textContent = "Lockdown Complete";
  color.style.background = "#4caf50";

  document.querySelectorAll("#lockdownTypeGrid .type-icon").forEach(btn => {
    btn.disabled = true;
    btn.classList.add("picked");
  });
}



function initLockdownTurnOrder() {
  const { players, orderMode } = window.lockSettings;

  let order = [];

  if (orderMode === "inorder") {
    for (let i = 1; i <= players; i++) order.push(i);
  }

  if (orderMode === "snake") {
    const forward = [];
    const backward = [];
    for (let i = 1; i <= players; i++) forward.push(i);
    for (let i = players; i >= 1; i--) backward.push(i);
    order = [...forward, ...backward];
  }

  if (orderMode === "randomRound" || orderMode === "randomFull") {
    order = shuffleArray([...Array(players).keys()].map(i => i + 1));
  }

  window.lockTurnOrder = order;
  window.lockTurnIndex = 0;
  window.lockPlayerTypes = Array(players).fill(0);
  window.lockdownActivePlayer = window.lockTurnOrder[0];
  updateActivePlayerUI();
}

function nextSequentialPlayer() {
  const { players, typesPerPlayer } = window.lockSettings;

  let attempts = 0;

  while (attempts < window.lockTurnOrder.length) {
    window.lockTurnIndex = (window.lockTurnIndex + 1) % window.lockTurnOrder.length;
    const candidate = window.lockTurnOrder[window.lockTurnIndex];

    if (window.lockPlayerTypes[candidate - 1] < typesPerPlayer) {
      window.lockdownActivePlayer = candidate;
      return;
    }

    attempts++;
  }

  // No candidate found → all done
  lockdownComplete();
}



function randomInRoundNext() {
  // Move to next index
  window.lockTurnIndex++;

  // If round finished → reshuffle
  if (window.lockTurnIndex >= window.lockTurnOrder.length) {
    window.lockTurnOrder = shuffleArray(window.lockTurnOrder);
    window.lockTurnIndex = 0;
  }

  window.lockdownActivePlayer = window.lockTurnOrder[window.lockTurnIndex];
}

function randomThroughoutNext() {
  const { typesPerPlayer } = window.lockSettings;

  // Build list of players who still need picks
  const remaining = [];
  for (let i = 0; i < window.lockPlayerTypes.length; i++) {
    if (window.lockPlayerTypes[i] < typesPerPlayer) {
      remaining.push(i + 1);
    }
  }

  // If none left → complete
  if (remaining.length === 0) {
    lockdownComplete();
    return;
  }

  // Pick random player
  const next = remaining[Math.floor(Math.random() * remaining.length)];
  window.lockdownActivePlayer = next;
}

function getTopMonoType(type, count = 5) {
  const lower = type.toLowerCase();

  const pool = window.POKEDEX.filter(p =>
    p.type.length === 1 && p.type[0].toLowerCase() === lower
  );

  const sorted = pool.sort((a, b) => {
    const bstA = Object.values(a.stats).reduce((x, y) => x + y, 0);
    const bstB = Object.values(b.stats).reduce((x, y) => x + y, 0);
    return bstB - bstA;
  });

  return sorted.slice(0, count);
}
