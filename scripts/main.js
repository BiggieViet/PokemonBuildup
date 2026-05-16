const SHOP_RULES = {
  evBoost: { cost: 1, amount: 5 },
  moveChange: { cost: 2 },
  abilityChange: { cost: 2 },
  heldItem: { cost: 3 },
  fullControl: { cost: 6 },
  megaStone: {cost: 6}
};

const BATTLE_RULES = {
  faintPrize: 1,     // default: 1 point per fainted Pokémon
  survivePrize: 2    // default: 2 points per surviving Pokémon
};

let activeShopIndex = null;

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
  updatePoolCount();
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

function pickRandomAbility(abilities) {
  return abilities[Math.floor(Math.random() * abilities.length)];
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
      <img class="pokemon-img" src="${getImageUrl(p.imageId)}">
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

function choosePokemon(p) {
  const moves = pickRandomMoves(p);
  const pseudo = isPseudo(p.stats);

  if (pseudo) {
    document.getElementById("pseudoClause").checked = true;
  }

  team.push({
      name: p.name,
      id: p.id,
      imageId: p.imageId,
      types: p.types,
      abilities: p.abilities,
      ability: pickRandomAbility(p.abilities),
      moves,
      evTotal: 0,
      evAdjust: 0,
      moveChanges: 0,
      item: null,
      fullControl: false,
      megaStone: false,

      shop: {
        ev: 0,
        move: 0,
        ability: 0,
        item: false,
        fullControl: false,
        megaStone: false
      }
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
        <div class="teamMonBox" onclick="openShop(${i})">

          <div class="teamLeft">
          <div class="pokemonTitle">
          <strong>${t.name}</strong>
          </div>
          <div class="typeRow">
            ${typePills}
          </div>
          
          <br>
          <div class="evRow">
              <label>Total EVs: ${t.evTotal}</label><br>

              <label>Move/Ability Changes: ${t.moveChanges}</label><br>
            <label>
              Full Details Control: ${t.fullControl || "None"}
            </label>
            <br>
            <label>
              Held Item: ${t.item || "None"}</label>
            <br>
            <label>Mega Stone: ${t.megaStone || "None"}</label>
            </div>

          
        </div>

          <div class="teamRight">
            <img class="pokemon-img" src="${getImageUrl(t.imageId)}"><br>

              <div class="abilityRow">
                <strong>Ability:</strong> ${t.ability}
              </div>

              <div class="moveList">
                ${t.moves.map(m => `<div>- ${m}</div>`).join("")}
              </div>
            

          </div>

        </div>
      `;
    })
    .join("");
}

function getAnimationPool() {
  const clauseOn = document.getElementById("pseudoClause").checked;
  const teamIDs = team.map(t => t.id);

  let pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));
  if (clauseOn) {
    pool = pool.filter(p => !isPseudo(p.stats));
  }
  if (pool.length === 0) {
    pool = window.POKEDEX_NATIONAL.slice();
  }
  return pool;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("rollBtn").onclick = () => {
    animateRollBoxes();
  };
});

function rollActualPokemon() {
  const clauseOn = document.getElementById("pseudoClause").checked;

  const teamIDs = team.map(t => t.id);

  let pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));

  if (clauseOn) {
    pool = pool.filter(p => !isPseudo(p.stats));
  }

  if (pool.length < 3) {
    pool = window.POKEDEX_NATIONAL.filter(p => !teamIDs.includes(p.id));
  }

  currentRoll = getRandomDistinct(pool, 3);
  selectionLocked = false;
  renderRoll();        // KEEP THIS — your reveal logic
  updatePoolCount();
}

function animateRollBoxes() {
  selectionLocked = false;
  const rollDiv = document.getElementById("results");
  const pool = getAnimationPool();

  rollDiv.innerHTML = `
    <button class="pokemon-box" id="animBox1" disabled></button>
    <button class="pokemon-box" id="animBox2" disabled></button>
    <button class="pokemon-box" id="animBox3" disabled></button>
  `;

  const boxes = [
    document.getElementById("animBox1"),
    document.getElementById("animBox2"),
    document.getElementById("animBox3")
  ];

  // one interval per box
  const intervals = boxes.map((box) => {
    return setInterval(() => {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      box.innerHTML = `
        <img class="pokemon-img" src="${getImageUrl(rand.imageId)}">
        <div>
          <div style="margin-bottom:20px;">
            <div class="pokemon-name">${rand.name}</div>
          </div>
        </div>
      `;
    }, 90);
  });

  // stop + reveal real Pokémon for each slot
  const stopTimes = [1000, 1500, 2000];

  // local pool that shrinks as slots are filled
let realPool = getAnimationPool(); 
let used = []; // track what we already rolled this turn

stopTimes.forEach((time, index) => {
  setTimeout(() => {
    clearInterval(intervals[index]);

    // filter out already chosen Pokémon
    const filteredPool = realPool.filter(p => !used.includes(p.id));

    // pick the real Pokémon for this slot
    const realMon = filteredPool[Math.floor(Math.random() * filteredPool.length)];

    // record it so future slots can't pick it
    used.push(realMon.id);

    // replace spinning box with real button
    boxes[index].replaceWith(renderSingleRoll(realMon));

  }, time);
});
}

function renderSingleRoll(p) {
  const box = document.createElement("button");
  box.className = "pokemon-box";

  const bst = calcBST(p.stats);

  const typeIcons = p.types
    .map(t => {
      const bg = TYPE_COLORS[t];
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
    <img class="pokemon-img" src="${getImageUrl(p.imageId)}">
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

  if (isPseudo(p.stats)) {
    box.style.background = "#9e8123";
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

  return box;
}


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

    // Build pool respecting species clause
    let pool = window.POKEDEX_NATIONAL.filter(p => !teamNames.includes(p.name));

    // Apply pseudo clause
    if (clauseOn) {
      pool = pool.filter(p => !isPseudo(p.stats));
    }

    // Safety fallback
    if (pool.length === 0) {
      pool = window.POKEDEX_NATIONAL.filter(p => !teamNames.includes(p.name));
    }

    // Pick a random Pokémon
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // Generate random moves
    const moves = pickRandomMoves(chosen);

    // Add to team
    team.push({
      name: chosen.name,
      id: chosen.id,
      imageId: chosen.imageId,
      types: chosen.types,
      abilities: chosen.abilities,
      ability: pickRandomAbility(chosen.abilities),
      moves,
      evTotal: 0,
      evAdjust: 0,
      moveChanges: 0,
      item: null,
      fullControl: false,
      megaStone: false,

      shop: {
        ev: 0,
        move: 0,
        ability: 0,
        item: false,
        itemName: "",
        fullControl: false,
        megaStone: false
      }
    });

    // Update species clause
    teamNames.push(chosen.name);

    // Auto-enable pseudo clause
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

  if ((dead === 0 || isNaN(dead)) && (alive === 0 || isNaN(alive))) {
    return;
  }

  // If no Pokémon survived, subtract HP
if (alive === 0) {
  currentHP = Math.max(0, currentHP - 1);
  document.getElementById("hpValue").textContent = currentHP;
}

  const gained =
  dead * BATTLE_RULES.faintPrize +
  alive * BATTLE_RULES.survivePrize;
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

function openShop(i) {
  activeShopIndex = i;
  renderShopPanel();
}

function renderShopPanel() {
  const panel = document.getElementById("shopPanel");

  if (activeShopIndex === null) {
    panel.classList.add("hidden");
    return;
  }

  const p = team[activeShopIndex];

  panel.classList.remove("hidden");

  
}

function adjustShop(i, field, amount) {
  const p = team[i];
  p.shop[field] = Math.max(0, p.shop[field] + amount);
  renderShopPanel();
}

function toggleShopItem(i) {
  const p = team[i];

  if (p.item) return;

  p.shop.item = !p.shop.item;

  if (!p.shop.item) p.shop.itemName = "";

  renderShopPanel();
}

function toggleShopFull(i) {
  const p = team[i];

  if (p.fullControl) return;

  p.shop.fullControl = !p.shop.fullControl;
  renderShopPanel();
}

function spendForPokemon(i) {
  const p = team[i];

  let cost = 0;

cost += p.shop.ev * SHOP_RULES.evBoost.cost;
cost += p.shop.move * SHOP_RULES.moveChange.cost;
cost += p.shop.ability * SHOP_RULES.abilityChange.cost;

if (p.shop.item && !p.item) {
  cost += SHOP_RULES.heldItem.cost;
}

if (p.shop.fullControl && !p.fullControl) {
  cost += SHOP_RULES.fullControl.cost;
}

if (p.shop.megaStone && !p.megaStone) {
  cost += SHOP_RULES.megaStone.cost;
}

  if (currentPoints < cost) {
    alert("Not enough points!");
    return;
  }

  currentPoints -= cost;
  document.getElementById("pointsValue").textContent = currentPoints;

  // Apply purchases
  p.evTotal += p.shop.ev * SHOP_RULES.evBoost.amount;
  p.moveChanges += p.shop.move;
  if (p.shop.ability > 0) {
    p.ability = pickRandomAbility(p.abilities);
  }
  if (p.shop.item) p.item = "Custom Item";
  if (p.shop.fullControl) p.fullControl = "True";
  if (p.shop.megaStone) p.megaStone = "MEGA ACTIVE";

  // Reset pending purchases
  p.shop = { ev: 0, move: 0, ability: 0, item: false, fullControl: false };

  saveTeam();
  saveMeta();
  renderTeam();
  renderShopPanel();
}

function openShop(i) {
  if (activeShopIndex === i) {
    // Clicking the same Pokémon closes the shop
    activeShopIndex = null;
  } else {
    // Clicking a different Pokémon switches the shop
    activeShopIndex = i;
  }

  renderShopPanel();
}

document.addEventListener("click", (e) => {
  const shop = document.getElementById("shopPanel");
  const teamList = document.getElementById("teamList");

  // FIX: clicking inside the shop should NOT close it
  if (shop.contains(e.target)) return;

  // If click is outside both the shop and the team grid  close shop
  if (!teamList.contains(e.target)) {
    activeShopIndex = null;
    renderShopPanel();
  }
});

function renderShopPanel() {
  const panel = document.getElementById("shopPanel");

  // Always stop clicks inside the shop from closing it
  panel.onclick = (e) => {
    e.stopPropagation();
  };

  if (activeShopIndex === null) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");
  const p = team[activeShopIndex];

  panel.innerHTML = `
  <h3>${p.name} Shop</h3>

  <div class="shopRow">
    <span>EV Boost (+${SHOP_RULES.evBoost.amount}) - ${SHOP_RULES.evBoost.cost} pts</span>
    <button onclick="adjustShop(${activeShopIndex}, 'ev', 1)">+</button>
    <button onclick="adjustShop(${activeShopIndex}, 'ev', -1)">-</button>
    <span>${p.shop.ev}</span>
  </div>

  <div class="shopRow">
    <span>Move Change - ${SHOP_RULES.moveChange.cost} pts</span>
    <button onclick="adjustShop(${activeShopIndex}, 'move', 1)">+</button>
    <button onclick="adjustShop(${activeShopIndex}, 'move', -1)">-</button>
    <span>${p.shop.move}</span>
  </div>

  <div class="shopRow">
    <span>Ability Change - ${SHOP_RULES.abilityChange.cost} pts</span>
    <button onclick="adjustShop(${activeShopIndex}, 'ability', 1)">+</button>
    <button onclick="adjustShop(${activeShopIndex}, 'ability', -1)">-</button>
    <span>${p.shop.ability}</span>
  </div>

  <div class="shopRow">
    <span>Full Control - ${SHOP_RULES.fullControl.cost} pts</span>
    <input type="checkbox" onchange="toggleShopFull(${activeShopIndex})" ${p.shop.fullControl ? "checked" : ""}>
  </div>

  <div class="shopRow">
    <span>Held Item - ${SHOP_RULES.heldItem.cost} pts</span>
    <input type="checkbox" onchange="toggleShopItem(${activeShopIndex})" ${p.shop.item ? "checked" : ""}>
  </div>

  <div class="shopRow">
    <span>Equip Mega Stone - ${SHOP_RULES.megaStone.cost} pts</span>
    <input type="checkbox" onchange="toggleShopMega(${activeShopIndex})" ${p.shop.megaStone ? "checked" : ""}>
  </div>

  <button class="spendBtn" onclick="spendForPokemon(${activeShopIndex})">
    Spend Points
  </button>
`;

}

function toggleShopMega(i) {
  const p = team[i];

  // Already bought? Can't toggle.
  if (p.megaStone) return;

  p.shop.megaStone = !p.shop.megaStone;
  renderShopPanel();
}



panel.addEventListener("click", (e) => {
  e.stopPropagation();
});