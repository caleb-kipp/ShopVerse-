// checkout.js
// Reads checkoutCart from sessionStorage and renders it on checkout.html

(function () {
  const CHECKOUT_KEY = "checkoutCart";
  const ORDERS_KEY = "orders";

  // Fetch checkout vessel
  function getCheckoutData() {
    const data = sessionStorage.getItem(CHECKOUT_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Render order preview
  function renderCheckout() {
    const vessel = getCheckoutData();
    if (!vessel) {
      document.getElementById("checkoutContainer").innerHTML =
        "<p>No items found for checkout.</p>";
      return;
    }

    const { cart, customer } = vessel;

    let html = "<h2>Review Your Order</h2><ul>";
    cart.forEach(item => {
      html += `<li>${item.name} - ${item.quantity} × ${item.price}</li>`;
    });
    html += "</ul>";

    if (customer) {
      html += `<p><strong>Customer:</strong> ${customer.name} (${customer.email})</p>`;
    }

    html += `<button id="placeOrderBtn">Place Order</button>`;

    document.getElementById("checkoutContainer").innerHTML = html;

    // Hook place order
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", placeOrder);
    }
  }

  // Save order to localStorage
  function placeOrder() {
    const vessel = getCheckoutData();
    if (!vessel) return;

    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    orders.push({
      ...vessel,
      status: "Placed",
      orderId: "ORD-" + Date.now()
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    // Clear vessel
    sessionStorage.removeItem(CHECKOUT_KEY);

    // Redirect to success page
    window.location.href = "order-success.html";
  }

  document.addEventListener("DOMContentLoaded", renderCheckout);
})();