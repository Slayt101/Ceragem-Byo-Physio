/* CERAGEM PHYSIO – interactions (touch + mouse). Plain JavaScript, no libraries. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pos(e, el) {
    var r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* 1. Warm glow that follows your finger or mouse, and heat rings where you tap */
  document.querySelectorAll("[data-glow]").forEach(function (el) {
    function move(e) {
      var p = pos(e, el);
      el.style.setProperty("--mx", p.x + "px");
      el.style.setProperty("--my", p.y + "px");
    }
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", function (e) {
      move(e);
      if (reduce || e.target.closest("a,button,input,select,summary")) return;
      var p = pos(e, el);
      for (var i = 0; i < 2; i++) {
        var s = document.createElement("span");
        s.className = "ring";
        s.style.left = p.x + "px";
        s.style.top = p.y + "px";
        s.style.animationDelay = i * 0.14 + "s";
        el.appendChild(s);
        s.addEventListener("animationend", function () { this.remove(); });
      }
    });
  });

  /* 2. Ripple on buttons, spotlight on cards */
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".btn");
    if (b && !reduce) {
      var p = pos(e, b), s = document.createElement("span");
      s.className = "ripple";
      s.style.left = p.x + "px";
      s.style.top = p.y + "px";
      b.appendChild(s);
      s.addEventListener("animationend", function () { s.remove(); });
    }
    var t = e.target.closest(".tap");
    if (t) {
      var q = pos(e, t);
      t.style.setProperty("--mx", q.x + "px");
      t.style.setProperty("--my", q.y + "px");
      t.classList.add("touching");
      setTimeout(function () { t.classList.remove("touching"); }, 700);
    }
  });
  document.addEventListener("pointermove", function (e) {
    var t = e.target.closest && e.target.closest(".tap");
    if (t) {
      var q = pos(e, t);
      t.style.setProperty("--mx", q.x + "px");
      t.style.setProperty("--my", q.y + "px");
    }
  });

  /* 3. Tap-to-open cards (natural remedies) */
  document.querySelectorAll(".herb-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      var box = btn.parentNode.querySelector(".reveal");
      if (box) box.hidden = open;
    });
  });

  /* 4. Body explorer: tap a glowing point, change the heat level */
  var explorer = document.getElementById("explorer");
  if (explorer) {
    var NS = "http://www.w3.org/2000/svg";
    var g = document.getElementById("vertebrae");
    if (g) {
      for (var i = 0; i < 12; i++) {
        var r = document.createElementNS(NS, "rect");
        r.setAttribute("x", 110); r.setAttribute("y", 96 + i * 19);
        r.setAttribute("width", 20); r.setAttribute("height", 13); r.setAttribute("rx", 5);
        g.appendChild(r);
      }
    }
    var zones = {
      neck: { t: "Neck and shoulders", d: "Long hours on phones, driving and stress tighten this area. Gentle far-infrared warmth and soft rolling pressure help the muscles let go.", tags: ["Stress", "Joint stiffness"] },
      upper: { t: "Upper back", d: "Posture and tension collect between the shoulder blades. The rollers glide along the spine to ease stiffness and help you breathe deeper.", tags: ["Stress", "Joint stiffness"] },
      lower: { t: "Lower back", d: "The most common reason people visit us. Deep heat and spine rollers work along the lower back to support comfort and movement.", tags: ["Back pain", "Arthritis"] },
      legs: { t: "Hips and legs", d: "Warmth and acupressure on the hips, thighs and calves support circulation and ease stiff joints, especially after long days on your feet.", tags: ["Poor circulation", "Arthritis", "Joint stiffness"] }
    };
    var spots = explorer.querySelectorAll(".hs");
    function show(key) {
      var z = zones[key]; if (!z) return;
      spots.forEach(function (s) { s.classList.toggle("on", s.getAttribute("data-zone") === key); });
      document.getElementById("zone-title").textContent = z.t;
      document.getElementById("zone-text").textContent = z.d;
      var ul = document.getElementById("zone-tags");
      ul.innerHTML = "";
      z.tags.forEach(function (x) { var li = document.createElement("li"); li.textContent = x; ul.appendChild(li); });
    }
    spots.forEach(function (s) {
      s.addEventListener("click", function () { show(s.getAttribute("data-zone")); });
      s.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(s.getAttribute("data-zone")); }
      });
    });
    show("lower");

    var heat = document.getElementById("heat"), label = document.getElementById("heat-label");
    var names = ["Gentle", "Warm", "Deep"], vals = [0.3, 0.65, 1];
    if (heat) {
      var upd = function () {
        var k = Number(heat.value) - 1;
        explorer.style.setProperty("--heat", vals[k]);
        label.textContent = names[k];
      };
      heat.addEventListener("input", upd); upd();
    }
  }

  /* 5. Booking form: submit to the API, with a WhatsApp fallback */
  var form = document.getElementById("book");
  if (form) {
    var cfg = window.CERAGEM_CONFIG || {};
    var isLocal = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var API_BASE = isLocal ? (cfg.LOCAL_API || "http://localhost:3000") : (cfg.API_BASE || "");

    var sent = document.getElementById("sent"),
        link = document.getElementById("sent-link"),
        submitBtn = form.querySelector('button[type="submit"]'),
        originalBtnText = submitBtn ? submitBtn.textContent : "Submit";

    var date = document.getElementById("f-date");
    try { date.min = new Date().toISOString().slice(0, 10); } catch (err) {}

    // Show loading state
    function setLoading(loading) {
      if (submitBtn) {
        submitBtn.disabled = loading;
        submitBtn.textContent = loading ? "Sending..." : originalBtnText;
        submitBtn.classList.toggle("loading", loading);
      }
    }

    // Show error message
    function showError(message) {
      var errorDiv = document.getElementById("form-error");
      if (!errorDiv) {
        errorDiv = document.createElement("div");
        errorDiv.id = "form-error";
        errorDiv.className = "form-error";
        errorDiv.setAttribute("role", "alert");
        form.parentNode.insertBefore(errorDiv, form.nextSibling);
      }
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
      clearTimeout(errorDiv._t);
      errorDiv._t = setTimeout(function () { errorDiv.style.display = "none"; }, 8000);
    }

    // WhatsApp fallback: the visitor taps once to send their details
    function showWhatsAppFallback() {
      sent.hidden = false;
      sent.querySelector("p").innerHTML = "<b>Almost done.</b> Tap below to send your booking via WhatsApp.";
      link.textContent = "Send on WhatsApp";
      sent.scrollIntoView({ block: "nearest" });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setLoading(true);
      sent.hidden = true;

      var d = new FormData(form);
      var bookingData = {
        name: d.get("name"),
        phone: d.get("phone"),
        email: d.get("email") || undefined,
        concern: d.get("concern"),
        preferredDate: d.get("date"),
        preferredTime: "any",
        message: d.get("message") || undefined
      };

      // Build WhatsApp message as fallback
      var waMsg = "Hello Ceragem Physio, I would like to book.\n" +
        "Name: " + bookingData.name + "\n" +
        "Phone: " + bookingData.phone + "\n" +
        (bookingData.email ? "Email: " + bookingData.email + "\n" : "") +
        "Main concern: " + bookingData.concern + "\n" +
        "Preferred date: " + bookingData.preferredDate +
        (bookingData.message ? "\nNotes: " + bookingData.message : "");

      link.href = "https://wa.me/263774221490?text=" + encodeURIComponent(waMsg);

      // Give up after 20 seconds (a sleeping free-tier server can be slow to wake)
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;

      try {
        // Try to submit to API
        var response = await fetch(API_BASE + "/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(bookingData),
          signal: ctrl ? ctrl.signal : undefined
        });

        var result = await response.json();

        if (response.ok) {
          // Success - show confirmation
          sent.hidden = false;
          sent.querySelector("p").innerHTML = "<b>Thank you!</b> Your booking request has been received. We will contact you shortly to confirm.";
          if (result.reference) {
            var ref = document.createElement("span");
            ref.textContent = " Your reference: " + result.reference + ".";
            sent.querySelector("p").appendChild(ref);
          }
          link.textContent = "Also message us on WhatsApp";
          form.reset();
          sent.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else if (response.status === 400 || response.status === 409) {
          // Something the visitor can fix (bad date, time full, duplicate)
          showError(result.error || "Please check your details and try again.");
        } else {
          // Server problem or rate limit - show error and fall back to WhatsApp
          console.warn("API error:", result);
          showError(result.error || "Failed to submit booking. Please try WhatsApp instead.");
          showWhatsAppFallback();
        }
      } catch (err) {
        // Network error or no backend - fall back to WhatsApp
        console.warn("Network error:", err);
        showError("Cannot connect to server. Please use WhatsApp to book.");
        showWhatsAppFallback();
      } finally {
        if (timer) clearTimeout(timer);
        setLoading(false);
      }
    });
  }
})();
