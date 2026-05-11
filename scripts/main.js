function typeIcon(type) {
  return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`;
}

function loadTeam() {
  const saved = localStorage.getItem("pbs_team");
  if (saved) {
    team = JSON.parse(saved);
    renderTeam();
  }
}

function saveTeam() {
  localStorage.setItem("pbs_team", JSON.stringify(team));
}

function saveMeta() {
  localStorage.setItem("pbs_points", currentPoints);
  localStorage.setItem("pbs_hp", currentHP);
}

function loadMeta() {
  const p = localStorage.getItem("pbs_points");
  const h = localStorage.getItem("pbs_hp");

  if (p !== null) currentPoints = parseInt(p);
  if (h !== null) currentHP = parseInt(h);

  document.getElementById("pointsValue").textContent = currentPoints;
  document.getElementById("hpValue").textContent = currentHP;
}

window.addEventListener("DOMContentLoaded", () => {
  loadTeam();
  updatePoolCount(); // optional but recommended
  loadMeta();
});

const TYPE_COLORS = {
  Normal:"#A8A77A",Fire:"#EE8130",Water:"#6390F0",Electric:"#F7D02C",Grass:"#7AC74C",
  Ice:"#96D9D6",Fighting:"#C22E28",Poison:"#A33EA1",Ground:"#E2BF65",Flying:"#A98FF3",
  Psychic:"#F95587",Bug:"#A6B91A",Rock:"#B6A136",Ghost:"#735797",Dragon:"#6F35FC",
  Dark:"#705746",Steel:"#B7B7CE",Fairy:"#D685AD"
};

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

let currentRoll = [];
let team = [];
let selectionLocked = false;
let pseudoUsed = false;



function updatePoolCount() {
  const clauseOn = document.getElementById("pseudoClause").checked;
  const teamIDs = team.map(t => t.id);

  let pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));

  if (clauseOn) {
    pool = pool.filter(p => !isPseudo(p.stats));
  }

  document.getElementById("poolCount").textContent =
    `Available Pokemon: ${pool.length}`;
}

function getRandomDistinct(arr, count) {
  const copy = [...arr];
  const result = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function pickRandomMoves(pokemon) {
  return getRandomDistinct(pokemon.moves, 4);
}

function getImageUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function calcBST(s) {
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}

function isPseudo(stats) {
  return calcBST(stats) >= 600;
}

function getTypeMatchups(types) {
  const multipliers = {};

  types.forEach(t => {
    const chart = TYPE_CHART[t];
    for (const atkType in chart) {
      multipliers[atkType] = (multipliers[atkType] || 1) * chart[atkType];
    }
  });

  const weak = [];
  const resist = [];
  const immune = [];

  for (const type in multipliers) {
    const m = multipliers[type];
    if (m === 0) immune.push(type);
    else if (m > 1) weak.push(type);
    else if (m < 1) resist.push(type);
  }

  return { weak, resist, immune };
}

const resultsDiv = document.getElementById("results");

function renderRoll() {
  resultsDiv.innerHTML = "";
  selectionLocked = false;

  currentRoll.forEach(p => {
    const box = document.createElement("button");
    box.className = "pokemon-box";

    const bst = calcBST(p.stats);

    const typeIcons = p.types
      .map(t => {
        const bg = TYPE_COLORS[t]; // your existing color map

        // Determine if text should be white or black based on brightness
        const rgb = parseInt(bg.substring(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = rgb & 0xff;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        const textClass = brightness < 140 ? "light-text" : "dark-text";

        return `
          <span class="type-pill ${textClass}" style="background:${bg};">
            <img src="${typeIcon(t)}">
            ${t}
          </span>
        `;
      })
      .join("<br>");

    const showStats = document.getElementById("showStatSpread").checked;
    const showWeak = document.getElementById("showTypeChart").checked;
    const matchup = getTypeMatchups(p.types);

    box.innerHTML = `
      <img class="pokemon-img" src="${getImageUrl(p.id)}">
      <div>
        <div style="margin-bottom:20px;">
          <div class="pokemon-name">${p.name}</div>
        </div>
        ${typeIcons}<br>
        ${showStats ? `
          <div class="statBlock" style="color:${isPseudo(p.stats) ? "#000" : "#fff"};">
            HP: ${p.stats.hp} |
            Atk: ${p.stats.atk} |
            Def: ${p.stats.def} |
            SpA: ${p.stats.spa} |
            SpD: ${p.stats.spd} |
            Spe: ${p.stats.spe}<br>
            <strong>BST: ${bst}</strong>
          </div>
        ` : ""}
        ${showWeak ? `
          <div class="weaknessBlock" style="color:${isPseudo(p.stats) ? "#000" : "#fff"};">
            <strong>Weak:</strong> ${matchup.weak.length ? matchup.weak.join(", ") : "None"}<br>
            <strong>Resist:</strong> ${matchup.resist.length ? matchup.resist.join(", ") : "None"}<br>
            <strong>Immune:</strong> ${matchup.immune.length ? matchup.immune.join(", ") : "None"}
          </div>
        ` : ""}
      </div>
    `;
    const pseudo = isPseudo(p.stats);
    if (pseudo) {
      box.style.background = "#9e8123";   // yellow
      box.style.color = "#000";
    }

    box.onclick = () => {
      if (selectionLocked) return;
      selectionLocked = true;
      choosePokemon(p);
      Array.from(document.querySelectorAll(".pokemon-box")).forEach(b => {
        if (b !== box) b.classList.add("greyed-out");
      });
    };

    resultsDiv.appendChild(box);
  });
}

// When a pseudo is selected, activate the clause checkbox
function choosePokemon(p) {
  const moves = pickRandomMoves(p);
  const pseudo = isPseudo(p.stats);

  if (pseudo) {
    document.getElementById("pseudoClause").checked = true;
  }

  team.push({
  name: p.name,
  id: p.id,
  types: p.types,
  moves,
  evTotal: 0,          // permanent EV investment
  evAdjust: 0,         // temporary EV adjustment
  moveChanges: 0,      // number of move/ability changes
  item: null,
  fullControl: false
});

  renderTeam();
  updatePoolCount();
  saveTeam();
}

document.getElementById("pseudoClause").onchange = updatePoolCount;

const teamList = document.getElementById("teamList");


function renderTeam() {
  teamList.innerHTML = team
    .map((t, i) => {

      // Generate type pills for this Pokemon
      const typePills = t.types
        .map(type => {
          const bg = TYPE_COLORS[type];

          const rgb = parseInt(bg.substring(1), 16);
          const r = (rgb >> 16) & 0xff;
          const g = (rgb >> 8) & 0xff;
          const b = rgb & 0xff;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          const textClass = brightness < 140 ? "light-text" : "dark-text";

          return `
            <span class="type-pill ${textClass}" style="background:${bg};">
              <img src="${typeIcon(type)}">
              ${type}
            </span>
          `;
        })
        .join("");

      return `
        <div class="teamMonBox">

          <div class="teamLeft">
            <strong>${t.name}</strong><br>
            <img class="pokemon-img" src="${getImageUrl(t.id)}"><br>

            <div class="typeRow">
              ${typePills}
            </div>

            <div class="moveList">
              ${t.moves.map(m => `<div>- ${m}</div>`).join("")}
            </div>
          </div>

          <div class="teamRight">

            <div class="evRow">
              <label>Total EVs: ${t.evTotal}</label><br>
              <label>Adjust (+5 each): ${t.evAdjust}</label>
              <button class="evBtn" onclick="adjustEV(${i}, 5)">+</button>
              <button class="evBtn" onclick="adjustEV(${i}, -5)">-</button>
            </div>

            <div class="moveRow">
              <label>Move/Ability Changes: ${t.moveChanges}</label>
              <button class="evBtn" onclick="adjustMoveChanges(${i}, 1)">+</button>
              <button class="evBtn" onclick="adjustMoveChanges(${i}, -1)">-</button>
            </div>

            <label>
              <input type="checkbox" id="heldItem${i}" ${t.item ? "checked" : ""}>
              Add Held Item (3 pts)
            </label><br>

            <label>
              <input type="checkbox" id="fullControl${i}" ${t.fullControl ? "checked" : ""}>
              Full Details Control (6 pts)
            </label><br>

            <div class="itemRow">
              Held Item: ${t.item || "None"}
            </div>

          </div>

        </div>
      `;
    })
    .join("");
}

document.getElementById("rollBtn").onclick = () => {
  const clauseOn = document.getElementById("pseudoClause").checked;

  // IDs of Pokémon already on the team
  const teamIDs = team.map(t => t.id);

  // Start with National Dex
  let pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));

  // Apply pseudo clause
  if (clauseOn) {
    pool = pool.filter(p => !isPseudo(p.stats));
  }

  // Safety fallback (should never trigger unless dataset is tiny)
  if (pool.length < 3) {
    pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));
  }

  currentRoll = getRandomDistinct(pool, 3);
  selectionLocked = false;
  renderRoll();
  updatePoolCount();
};



document.getElementById("resetBtn").onclick = () => {
  // Clear team
  team = [];
  saveTeam();

  // Unlock pseudo clause
  pseudoUsed = false;

  // Uncheck pseudo clause toggle
  const pseudoToggle = document.getElementById("pseudoClause");
  if (pseudoToggle) pseudoToggle.checked = false;

  // Unlock selection
  selectionLocked = false;

  // Clear team display
  renderTeam();

  // Clear current roll display
  resultsDiv.innerHTML = "";

  document.querySelector(".pointsValue").textContent = 0;

  document.getElementById("deadCount").value = "";
  document.getElementById("aliveCount").value = "";

  team.forEach(t => {
  t.evTotal = 0;
  t.evAdjust = 0;
  t.moveChanges = 0;
  t.item = null;
  t.fullControl = false;
  });
  document.querySelector(".pointsValue").textContent = 0;

  currentPoints = 0;
  currentHP = 4;
  saveMeta();
  document.getElementById("hpValue").textContent = 4;
  document.getElementById("pseudoClause").onchange = updatePoolCount;
  updatePoolCount();
};



document.getElementById("showStatSpread").onchange = () => renderRoll();
document.getElementById("showTypeChart").onchange = () => renderRoll();

document.getElementById("toggleMoreStats").onchange = e => {
  const panel = document.getElementById("moreStatsPanel");

  if (e.target.checked) {
    panel.style.display = "block";
  } else {
    // Turn off all stat-related toggles
    document.getElementById("showStatSpread").checked = false;
    document.getElementById("showTypeChart").checked = false;

    panel.style.display = "none";

    // Re-render to hide stats/weaknesses
    renderRoll();
  }
};

// Ensure More Stats panel is visible if toggleMoreStats starts checked
window.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleMoreStats");
  const panel = document.getElementById("moreStatsPanel");

  if (toggle.checked) {
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
});

window.addEventListener("DOMContentLoaded", updatePoolCount);

// OPEN RULES PANEL
document.getElementById("rulesBtn").onclick = () => {
  document.getElementById("rulesModal").style.display = "flex";
  document.body.classList.add("modal-open");
};

// CLOSE RULES PANEL
document.getElementById("closeRules").onclick = () => {
  document.getElementById("rulesModal").style.display = "none";
  document.body.classList.remove("modal-open");
};

document.getElementById("massAddBtn").onclick = () => {
  const count = parseInt(document.getElementById("massAddCount").value);

  if (isNaN(count) || count < 1 || count > 6) {
    alert("Please enter a number between 1 and 6.");
    return;
  }

  const clauseOn = document.getElementById("pseudoClause").checked;
  const teamNames = team.map(t => t.name);

  for (let i = 0; i < count; i++) {

    // Build pool respecting clauses
    let pool = window.POKEDEX_NATIONAL;

    if (clauseOn) {
      pool = pool.filter(p => !isPseudo(p.stats));
    }

    // If pool is empty, fallback to full list minus team
    if (pool.length === 0) {
      pool = POKEMON_DATA.filter(p => !teamNames.includes(p.name));
    }

    // Pick a random Pokémon
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // Add to team
    team.push({
      name: chosen.name,
      id: chosen.id,
      types: chosen.types,
      moves: pickRandomMoves(chosen),

      // REQUIRED default fields
      evTotal: 0,
      evAdjust: 0,
      moveChanges: 0,
      item: null,
      fullControl: false
    });

    // Update teamNames so next loop respects species clause
    teamNames.push(chosen.name);

    // If pseudo chosen, activate clause
    if (isPseudo(chosen.stats)) {
      document.getElementById("pseudoClause").checked = true;
    }
    updatePoolCount();
  }

  renderTeam();
  saveTeam();
};
let currentPoints = 0;
let currentHP = 4;

document.getElementById("submitBattle").onclick = () => {
  const dead = parseInt(document.getElementById("deadCount").value) || 0;
  const alive = parseInt(document.getElementById("aliveCount").value) || 0;

  // If no Pokémon survived, subtract HP
if (alive === 0) {
  currentHP = Math.max(0, currentHP - 1);
  document.getElementById("hpValue").textContent = currentHP;
}

  const gained = (dead * 1) + (alive * 3);
  currentPoints += gained;

  document.querySelector(".pointsValue").textContent = currentPoints;

  // Clear fields
  document.getElementById("deadCount").value = "";
  document.getElementById("aliveCount").value = "";

  saveMeta();
};

function clampInputToRange(el) {
  el.addEventListener("input", () => {
    let v = el.value;

    // Allow empty
    if (v === "") return;

    // Remove non-numeric characters
    v = v.replace(/[^0-9]/g, "");

    // Convert to number
    let num = parseInt(v);

    // Clamp to 0-6
    if (isNaN(num)) num = "";
    else if (num < 0) num = 0;
    else if (num > 6) num = 6;

    el.value = num;
  });
}

clampInputToRange(document.getElementById("deadCount"));
clampInputToRange(document.getElementById("aliveCount"));

document.getElementById("spendBtn").onclick = () => {
  let totalCost = 0;

  team.forEach((t, i) => {
    // EV cost: 1 point per +5 EV
    totalCost += Math.floor(t.evAdjust / 5);

    // Move/Ability changes: 2 points each
    totalCost += t.moveChanges * 2;

    // Held item: 3 points
    if (document.getElementById(`heldItem${i}`).checked && !t.item)
      totalCost += 3;

    // Full control: 6 points
    if (document.getElementById(`fullControl${i}`).checked && !t.fullControl)
      totalCost += 6;
  });

  if (totalCost > currentPoints) {
    alert("Not enough points!");
    return;
  }

  // Deduct points
  currentPoints -= totalCost;
  document.querySelector(".pointsValue").textContent = currentPoints;

  // Apply upgrades
  team.forEach((t, i) => {
    // Apply EVs
    t.evTotal += t.evAdjust;
    t.evAdjust = 0;

    // Apply move changes
    // (You can later add UI to pick the new moves)
    t.moveChanges = 0;

    // Apply held item
    if (document.getElementById(`heldItem${i}`).checked)
      t.item = "Custom Item";

    // Apply full control
    if (document.getElementById(`fullControl${i}`).checked)
      t.fullControl = true;
  });

  renderTeam();
  saveTeam();
  saveMeta();
};

function adjustEV(index, amount) {
  let t = team[index];

  let newValue = t.evAdjust + amount;

  if (newValue < 0) newValue = 0;
  if (newValue > 252) newValue = 252;

  t.evAdjust = newValue;
  renderTeam();
}

function adjustMoveChanges(index, amount) {
  let t = team[index];

  let newValue = t.moveChanges + amount;

  if (newValue < 0) newValue = 0;
  if (newValue > 5) newValue = 5; // safety cap

  t.moveChanges = newValue;
  renderTeam();
}

document.getElementById("debugMode").addEventListener("change", (e) => {
  const show = e.target.checked ? "block" : "none";
  document.getElementById("pointsDebug").style.display = show;
  document.getElementById("hpDebug").style.display = show;
});

function adjustPoints(amount) {
  currentPoints = Math.max(0, currentPoints + amount);
  document.getElementById("pointsValue").textContent = currentPoints;
}

function adjustHP(amount) {
  currentHP = Math.max(0, currentHP + amount);
  document.getElementById("hpValue").textContent = currentHP;
}

function syncShopInputs() {
  team.forEach((t, i) => {
    const held = document.getElementById(`heldItem${i}`);
    const full = document.getElementById(`fullControl${i}`);

    if (held) t.item = held.checked ? (t.item || "Custom Item") : null;
    if (full) t.fullControl = full.checked;
  });
}