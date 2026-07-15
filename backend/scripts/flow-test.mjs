#!/usr/bin/env node
/**
 * End-to-end API flow test: customer + professional
 * Run: node scripts/flow-test.mjs
 */
const API = process.env.API_URL || "http://localhost:3001/api";

const results = [];
function ok(name, detail = "") {
  results.push({ status: "PASS", name, detail });
  console.log(`✅ PASS  ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ status: "FAIL", name, detail });
  console.log(`❌ FAIL  ${name}${detail ? " — " + detail : ""}`);
}
function warn(name, detail = "") {
  results.push({ status: "WARN", name, detail });
  console.log(`⚠️  WARN  ${name}${detail ? " — " + detail : ""}`);
}
function info(msg) {
  console.log(`\n—— ${msg} ——`);
}

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

async function login(phone, password, role) {
  const r = await req("/auth/login", {
    method: "POST",
    body: { phone, password, role },
  });
  if (!r.ok) throw new Error(`Login failed ${phone}: ${JSON.stringify(r.data)}`);
  return r.data;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log(`Testing ${API}\n`);

  // Health
  info("Health");
  {
    const r = await req("/health");
    r.ok ? ok("GET /health") : fail("GET /health", JSON.stringify(r.data));
  }

  // Auth
  info("Auth");
  let customer, pro;
  try {
    customer = await login("+998909876543", "123456", "customer");
    ok("Customer login", customer.user?.id?.slice(0, 8));
  } catch (e) {
    fail("Customer login", e.message);
    process.exit(1);
  }
  try {
    pro = await login("+998901234567", "123456", "professional");
    ok("Pro login", pro.user?.id?.slice(0, 8));
  } catch (e) {
    fail("Pro login", e.message);
    process.exit(1);
  }

  const cTok = customer.accessToken;
  const pTok = pro.accessToken;
  const proUserId = pro.user.id;
  const customerId = customer.user.id;

  // Wrong role login
  {
    const r = await req("/auth/login", {
      method: "POST",
      body: { phone: "+998909876543", password: "123456", role: "professional" },
    });
    !r.ok
      ? ok("Customer cannot login as professional", `status ${r.status}`)
      : warn("Customer logged in as professional", "role check weak?");
  }

  // Services + professionals
  info("Catalog");
  let serviceId;
  {
    const r = await req("/services");
    if (r.ok && Array.isArray(r.data) && r.data.length) {
      serviceId = r.data[0].id;
      ok("GET /services", `${r.data.length} items`);
    } else fail("GET /services", JSON.stringify(r.data));
  }
  {
    const r = await req(`/professionals/${proUserId}`);
    r.ok
      ? ok("GET /professionals/:userId", r.data?.user?.name)
      : fail("GET /professionals/:userId", JSON.stringify(r.data));
  }

  // Create order as customer
  info("Order create + pay");
  let orderId;
  {
    const r = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Flow test: krant oqayapti, tekshirish kerak",
        address: "Toshkent, Chilonzor 12",
        scheduledAt: tomorrowISO(),
        price: 80000,
        isExpress: false,
      },
    });
    if (r.ok) {
      orderId = r.data.id;
      if (r.data.status === "awaiting_payment") {
        ok("POST /orders awaiting_payment", `status=${r.data.status}`);
      } else {
        fail("POST /orders should be awaiting_payment", r.data.status);
      }
      if (r.data.clientId !== customerId)
        fail("Order clientId", `expected ${customerId} got ${r.data.clientId}`);
      else ok("Order clientId matches customer");
      if (r.data.masterId !== proUserId)
        fail("Order masterId", `expected ${proUserId} got ${r.data.masterId}`);
      else ok("Order masterId matches pro userId");
    } else {
      fail("POST /orders", JSON.stringify(r.data));
      process.exit(1);
    }
  }

  // Pro must NOT see unpaid order
  {
    const r = await req(`/orders/${orderId}`, { token: pTok });
    !r.ok
      ? ok("Pro cannot access unpaid order", `status ${r.status}`)
      : fail("Pro saw unpaid order");
  }

  // Pro should not get notification yet
  {
    const r = await req("/notifications", { token: pTok });
    if (r.ok) {
      const related = (r.data || []).filter(
        (n) => n.data?.orderId === orderId && n.type === "order_new",
      );
      related.length === 0
        ? ok("Pro has no new-order notify before pay")
        : fail("Pro got notify before payment");
    }
  }

  // Mock payment
  {
    const r = await req(`/payments/${orderId}`, {
      method: "POST",
      token: cTok,
      body: { provider: "payme" },
    });
    r.ok && (r.data.order?.status === "pending" || r.data.mock)
      ? ok("POST /payments activates to pending", r.data.order?.status)
      : fail("POST /payments", JSON.stringify(r.data));
  }

  // Pro sees after pay
  {
    const r = await req(`/orders/${orderId}`, { token: pTok });
    r.ok && r.data.status === "pending"
      ? ok("Pro sees order after payment")
      : fail("Pro after pay", JSON.stringify(r.data));
  }

  // Pro sees new order notification
  {
    const r = await req("/notifications", { token: pTok });
    if (r.ok) {
      const related = (r.data || []).filter(
        (n) => n.data?.orderId === orderId || n.type === "order_new",
      );
      related.length
        ? ok("Pro got new-order notification", related[0]?.title)
        : warn("Pro notification missing for new order");
    } else fail("GET /notifications (pro)", JSON.stringify(r.data));
  }

  // Low price rejection
  {
    const r = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Too cheap should fail xx",
        address: "Test",
        scheduledAt: tomorrowISO(),
        price: 1000,
      },
    });
    !r.ok
      ? ok("Low price rejected", r.data?.message)
      : fail("Low price accepted");
  }

  // Chat while pending
  info("Chat (pending)");
  {
    const r = await req(`/messages/${orderId}`, {
      method: "POST",
      token: cTok,
      body: { text: "Salom, soat nechida kelasiz?" },
    });
    if (r.ok) {
      ok("Customer send message", r.data?.sender?.role);
      if (r.data?.sender?.role !== "customer")
        fail("Message sender.role should be customer", r.data?.sender?.role);
      else ok("Message sender.role = customer");
    } else fail("Customer send message", JSON.stringify(r.data));
  }
  {
    const r = await req(`/messages/${orderId}`, {
      method: "POST",
      token: pTok,
      body: { text: "Salom, ertalab 10 da bo'laman" },
    });
    if (r.ok) {
      ok("Pro send message", r.data?.sender?.role);
      if (r.data?.sender?.role !== "professional")
        fail("Message sender.role should be professional", r.data?.sender?.role);
      else ok("Message sender.role = professional");
    } else fail("Pro send message", JSON.stringify(r.data));
  }
  {
    const r = await req(`/messages/${orderId}`, { token: cTok });
    r.ok && r.data?.length >= 2
      ? ok("GET messages", `${r.data.length} msgs`)
      : fail("GET messages", JSON.stringify(r.data));
  }

  // Customer notification for pro message
  {
    const r = await req("/notifications", { token: cTok });
    const msgN = (r.data || []).find(
      (n) => n.type === "order_message" && n.data?.orderId === orderId,
    );
    msgN
      ? ok("Customer got chat notification", msgN.title)
      : warn("Customer missing order_message notification");
  }

  // Accept order
  info("Accept / status pipeline");
  {
    const r = await req(`/orders/${orderId}/accept`, {
      method: "PUT",
      token: pTok,
    });
    r.ok && r.data.status === "accepted"
      ? ok("Pro accept order")
      : fail("Pro accept", JSON.stringify(r.data));
  }
  {
    const r = await req("/notifications", { token: cTok });
    const n = (r.data || []).find((x) => x.type === "order_accepted");
    n ? ok("Customer notified of accept") : warn("No order_accepted notification");
  }

  // Customer cancel after accepted
  let cancelOrderId;
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Flow test cancel after accept",
        address: "Yunusobod 5",
        scheduledAt: tomorrowISO(),
        price: 50000,
      },
    });
    cancelOrderId = create.data?.id;
    await req(`/orders/${cancelOrderId}/accept`, { method: "PUT", token: pTok });
    const r = await req(`/orders/${cancelOrderId}/cancel`, {
      method: "PUT",
      token: cTok,
      body: { reason: "Rejam o'zgardi" },
    });
    r.ok && r.data.status === "cancelled"
      ? ok("Customer cancel after accepted")
      : fail("Customer cancel after accepted", JSON.stringify(r.data));
  }

  // Customer cannot cancel in_progress
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Flow test cancel blocked in_progress",
        address: "Mirzo Ulugbek",
        scheduledAt: tomorrowISO(),
        price: 60000,
      },
    });
    const oid = create.data.id;
    await req(`/orders/${oid}/accept`, { method: "PUT", token: pTok });
    await req(`/orders/${oid}/status`, {
      method: "PUT",
      token: pTok,
      body: { status: "on_the_way" },
    });
    await req(`/orders/${oid}/status`, {
      method: "PUT",
      token: pTok,
      body: { status: "in_progress" },
    });
    const r = await req(`/orders/${oid}/cancel`, {
      method: "PUT",
      token: cTok,
      body: { reason: "should fail" },
    });
    !r.ok
      ? ok("Customer cannot cancel in_progress", `status ${r.status}`)
      : fail("Customer cancelled in_progress — should be blocked");

    // Chat closed after... still in progress, chat open
    const chat = await req(`/messages/${oid}`, {
      method: "POST",
      token: cTok,
      body: { text: "hali ochiqmi?" },
    });
    chat.ok
      ? ok("Chat open during in_progress")
      : fail("Chat during in_progress", JSON.stringify(chat.data));

    // Complete
    const done = await req(`/orders/${oid}/status`, {
      method: "PUT",
      token: pTok,
      body: { status: "completed" },
    });
    done.ok
      ? ok("Pro complete order")
      : fail("Complete", JSON.stringify(done.data));

    const closed = await req(`/messages/${oid}`, {
      method: "POST",
      token: cTok,
      body: { text: "yopiqmi?" },
    });
    !closed.ok
      ? ok("Chat closed after completed")
      : fail("Chat still open after completed");

    // Review
    const rev = await req(`/reviews/${oid}`, {
      method: "POST",
      token: cTok,
      body: { rating: 5, comment: "Ajoyib" },
    });
    rev.ok
      ? ok("Customer leave review")
      : fail("Review", JSON.stringify(rev.data));

    // Double review
    const rev2 = await req(`/reviews/${oid}`, {
      method: "POST",
      token: cTok,
      body: { rating: 4 },
    });
    !rev2.ok
      ? ok("Double review blocked")
      : warn("Double review allowed");
  }

  // Decline with reason
  info("Decline");
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Flow test decline",
        address: "Sergeli",
        scheduledAt: tomorrowISO(),
        price: 40000,
      },
    });
    const oid = create.data.id;
    const r = await req(`/orders/${oid}/decline`, {
      method: "PUT",
      token: pTok,
      body: { reason: "Shu kuni bandman" },
    });
    r.ok && r.data.status === "cancelled"
      ? ok("Pro decline with reason")
      : fail("Decline", JSON.stringify(r.data));
  }

  // Skip status: accepted → completed
  info("Status transitions");
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Skip statuses to completed",
        address: "Olmazor",
        scheduledAt: tomorrowISO(),
        price: 70000,
      },
    });
    const oid = create.data.id;
    await req(`/orders/${oid}/accept`, { method: "PUT", token: pTok });
    const skip = await req(`/orders/${oid}/status`, {
      method: "PUT",
      token: pTok,
      body: { status: "completed" },
    });
    skip.ok
      ? ok("accepted → completed skip allowed (by design)")
      : fail("Skip to completed", JSON.stringify(skip.data));
  }

  // Invalid: pending → on_the_way without accept
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Invalid transition",
        address: "Bektemir",
        scheduledAt: tomorrowISO(),
        price: 30000,
      },
    });
    const oid = create.data.id;
    const r = await req(`/orders/${oid}/status`, {
      method: "PUT",
      token: pTok,
      body: { status: "on_the_way" },
    });
    !r.ok
      ? ok("pending → on_the_way blocked")
      : fail("pending → on_the_way allowed — bug");
  }

  // Cross-access: customer cannot accept
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Access test",
        address: "Uchtepa",
        scheduledAt: tomorrowISO(),
        price: 35000,
      },
    });
    const oid = create.data.id;
    const r = await req(`/orders/${oid}/accept`, {
      method: "PUT",
      token: cTok,
    });
    !r.ok
      ? ok("Customer cannot accept own order as master")
      : fail("Customer accepted as if pro");

    // Other user messages
    // cancel by customer pending
    const can = await req(`/orders/${oid}/cancel`, {
      method: "PUT",
      token: cTok,
      body: { reason: "Test done" },
    });
    can.ok
      ? ok("Customer cancel pending")
      : fail("Cancel pending", JSON.stringify(can.data));
  }

  // Pro cancel after accepted
  {
    const create = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Pro cancel test",
        address: "Yashnobod",
        scheduledAt: tomorrowISO(),
        price: 45000,
      },
    });
    const oid = create.data.id;
    await req(`/orders/${oid}/accept`, { method: "PUT", token: pTok });
    const r = await req(`/orders/${oid}/cancel`, {
      method: "PUT",
      token: pTok,
      body: { reason: "Fors-major" },
    });
    r.ok
      ? ok("Pro cancel after accepted")
      : fail("Pro cancel", JSON.stringify(r.data));
  }

  // Express + fee
  info("Express");
  {
    const r = await req("/orders", {
      method: "POST",
      token: cTok,
      body: {
        serviceId,
        masterId: proUserId,
        description: "Express test order here",
        address: "Shayxontohur",
        scheduledAt: tomorrowISO(),
        price: 100000,
        isExpress: true,
      },
    });
    if (r.ok && r.data.price === 115000 && r.data.expressFee === 15000) {
      ok("Express fee +15000 applied");
    } else if (r.ok) {
      fail(
        "Express fee",
        `price=${r.data.price} fee=${r.data.expressFee}`,
      );
    } else fail("Express order", JSON.stringify(r.data));
    if (r.ok) {
      await req(`/orders/${r.data.id}/cancel`, {
        method: "PUT",
        token: cTok,
        body: { reason: "cleanup" },
      });
    }
  }

  // Dashboard
  info("Pro dashboard");
  {
    const r = await req("/professionals/dashboard", { token: pTok });
    r.ok
      ? ok("Dashboard", `pending=${r.data?.stats?.pendingOrders}`)
      : fail("Dashboard", JSON.stringify(r.data));
  }

  // Summary
  info("Summary");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fails = results.filter((r) => r.status === "FAIL");
  const warns = results.filter((r) => r.status === "WARN");
  console.log(`\nTotal: ${results.length}  PASS: ${pass}  FAIL: ${fails.length}  WARN: ${warns.length}`);
  if (fails.length) {
    console.log("\nFailures:");
    fails.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
  }
  if (warns.length) {
    console.log("\nWarnings:");
    warns.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
  }

  // Also write JSON for the report
  const fs = await import("fs");
  fs.writeFileSync(
    new URL("./flow-test-results.json", import.meta.url),
    JSON.stringify({ pass, fail: fails, warn: warns, all: results }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
