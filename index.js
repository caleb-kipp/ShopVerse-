document.addEventListener("DOMContentLoaded", () => {
  renderProductSections();
});

/************************************
 * RENDER PRODUCT SECTIONS
 ************************************/
function renderProductSections() {
  const container = document.getElementById("productSections");
  container.innerHTML = "";

  // group by category
  const categories = {};
  products.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  // render rows
  Object.keys(categories).forEach(cat => {
    const rowId = `row-${cat}`;
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h2>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h2>
        <div class="carousel-ctl">
          <button class="btn btn-ghost" data-scroll="prev" data-target="#${rowId}">◀</button>
          <button class="btn btn-ghost" data-scroll="next" data-target="#${rowId}">▶</button>
        </div>
      </div>
      <div id="${rowId}" class="row">
        ${categories[cat].map(p => productCard(p)).join("")}
      </div>
    `;
    container.appendChild(section);
  });

  // scroll controls
  document.querySelectorAll(".carousel-ctl button").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.dataset.target);
      if (!target) return;
      target.scrollBy({
        left: btn.dataset.scroll === "next" ? 240 : -240,
        behavior: "smooth"
      });
    });
  });
}

/************************************
 * PRODUCT CARD TEMPLATE
 ************************************/
function productCard(p) {
  return `
    <div class="p-card" data-id="${p.id}">
      <img src="${p.images[0]}" alt="${p.title}">
      <div class="p-meta">
        <div style="font-weight:600">${p.title}</div>
        <div class="helper">
          ${p.discount ? `<span style="color:#f55">${fmt(p.price * (1 - p.discount))}</span> <s>${fmt(p.price)}</s>` : fmt(p.price)}
        </div>
        <div style="font-size:13px">⭐ ${p.rating} · ${p.sales} sold</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn btn-primary add-cart">Add</button>
          <button class="btn btn-ghost view-product">View</button>
          <button class="btn btn-ghost add-wish">❤</button>
        </div>
      </div>
    </div>
  `;
}