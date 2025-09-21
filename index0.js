// CART HANDLER
document.addEventListener("DOMContentLoaded", () => {
  const cartCount = document.getElementById("cartCount");
  const addCartBtns = document.querySelectorAll(".addCartBtn");
  const buyNowBtns = document.querySelectorAll(".buyNowBtn");
  const cartIcon = document.getElementById("openCart");

  // Load existing cart from localStorage
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Update cart count
  const updateCartCount = () => {
    cartCount.textContent = cart.length;
  };
  updateCartCount();

  // Add to Cart
  addCartBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const product = e.target.closest(".product-card");
      const item = {
        id: product.dataset.id,
        title: product.dataset.title,
        price: parseFloat(product.dataset.price),
        image: product.dataset.image,
        desc: product.dataset.desc,
        specs: product.dataset.specs,
        qty: 1
      };

      // Check if already in cart
      const existing = cart.find(p => p.id === item.id);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push(item);
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();
      alert(`${item.title} added to cart!`);
    });
  });

  // Buy Now
  buyNowBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const product = e.target.closest(".product-card");
      const item = {
        id: product.dataset.id,
        title: product.dataset.title,
        price: parseFloat(product.dataset.price),
        image: product.dataset.image,
        desc: product.dataset.desc,
        specs: product.dataset.specs,
        qty: 1
      };
      localStorage.setItem("checkoutItem", JSON.stringify(item));
      window.location.href = "checkout.html";
    });
  });

  // Cart icon click
  cartIcon.addEventListener("click", () => {
    window.location.href = "cart.html";
  });
});// index.js
// Collects items from ss_cart and builds a vessel payload in sessionStorage

(function () {
  // Namespace for your site cart
  const CART_KEY = "ss_cart";
  const CHECKOUT_KEY = "checkoutCart";

  // Utility: Get current cart
  function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  }

  // Utility: Get customer (if logged in / stored)
  function getCustomer() {
    const customer = localStorage.getItem("customerInfo");
    return customer ? JSON.parse(customer) : null;
  }

  // Build checkout vessel
  function buildCheckoutVessel() {
    const cartItems = getCart();
    const customer = getCustomer();

    if (!cartItems.length) {
      alert("Your cart is empty!");
      return;
    }

    const vessel = {
      cart: cartItems,
      customer: customer,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(vessel));

    // Redirect to checkout.html
    window.location.href = "checkout.html";
  }

  // Attach handler to Checkout button in cart modal
  document.addEventListener("DOMContentLoaded", () => {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", buildCheckoutVessel);
    }
  });
})();