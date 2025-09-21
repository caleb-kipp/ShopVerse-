// cart.js
// Utility to get cart from localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// Utility to save cart
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(document.addEventListener("DOMContentLoaded", () => {
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const renderCart = () => {
    cartList.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
      cartList.innerHTML = "<p>Your cart is empty.</p>";
      cartTotal.textContent = "Total: $0.00";
      return;
    }

    cart.forEach((item, idx) => {
      total += item.price * item.qty;

      const div = document.createElement("div");
      div.classList.add("cart-item");
      div.innerHTML = `
        <img src="${item.image}" alt="${item.title}" width="80">
        <div>
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
          <p><strong>$${item.price.toFixed(2)}</strong></p>
          <p>Qty: ${item.qty}</p>
          <small>Specs: ${item.specs}</small>
        </div>
        <button data-idx="${idx}" class="removeBtn">Remove</button>
      `;
      cartList.appendChild(div);
    });

    cartTotal.textContent = `Total: $${total.toFixed(2)}`;

    // Attach remove button logic
    document.querySelectorAll(".removeBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.dataset.idx;
        cart.splice(idx, 1);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
      });
    });
  };

  renderCart();

  checkoutBtn.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
});cart));
  updateCartCount();
}

// Update cart count on navbar
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartCount = document.getElementById("cartCount");
  if (cartCount) cartCount.textContent = count;
}

// Add item to cart
function addToCart(product) {
  let cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart(cart);
}

// Buy now (add item then go to checkout)
function buyNow(product) {
  localStorage.setItem("buyNow", JSON.stringify(product));
  window.location.href = "checkout.html";
}

// Event delegation for Add to Cart & Buy Now buttons
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("addCartBtn")) {
    const card = e.target.closest(".product-card");
    const product = {
      id: card.dataset.id,
      title: card.dataset.title,
      price: parseFloat(card.dataset.price),
      img: card.dataset.img,
    };
    addToCart(product);
  }

  if (e.target.classList.contains("buyNowBtn")) {
    const card = e.target.closest(".product-card");
    const product = {
      id: card.dataset.id,
      title: card.dataset.title,
      price: parseFloat(card.dataset.price),
      img: card.dataset.img,
      qty: 1,
    };
    buyNow(product);
  }

  // Cart icon click → go to cart.html
  if (e.target.closest("#openCart")) {
    window.location.href = "cart.html";
  }
});

// Initialize cart count on page load
document.addEventListener("DOMContentLoaded", updateCartCount);