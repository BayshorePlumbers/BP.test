const COM25_PRINT_PAYLOAD_KEY = "com25_print_payload_v1";
const COM25_PRINT_RETURN_KEY = "com25_print_return_v1";

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function getReturnUrl() {
  return sessionStorage.getItem(COM25_PRINT_RETURN_KEY) || "com25.html";
}

function getPayload() {
  return sessionStorage.getItem(COM25_PRINT_PAYLOAD_KEY) || "";
}

function setStatus(message) {
  const el = document.getElementById("printPageStatus");
  if (el) el.textContent = message;
}

function showEmptyState() {
  const empty = document.getElementById("printEmptyState");
  const sheet = document.getElementById("printSheet");
  if (empty) empty.classList.remove("is-hidden");
  if (sheet) sheet.classList.add("is-hidden");
}

function showPrintSheet() {
  const empty = document.getElementById("printEmptyState");
  const sheet = document.getElementById("printSheet");
  if (empty) empty.classList.add("is-hidden");
  if (sheet) sheet.classList.remove("is-hidden");
}

function renderPayload() {
  const payload = getPayload();
  const root = document.getElementById("printRoot");

  if (!payload || !root) {
    showEmptyState();
    setStatus("No saved print document was found.");
    return false;
  }

  root.innerHTML = payload;
  showPrintSheet();
  setStatus(isIOSDevice()
    ? "Document ready. On iPhone/iPad, use Share → Print if needed."
    : "Document ready. Opening print preview automatically.");
  return true;
}

function clearPrintPayload() {
  sessionStorage.removeItem(COM25_PRINT_PAYLOAD_KEY);
}

function goBackToCalculator() {
  clearPrintPayload();
  window.location.href = getReturnUrl();
}

async function waitForLayoutAndImages() {
  const sheet = document.getElementById("printSheet");
  if (!sheet) return;

  const images = Array.from(sheet.querySelectorAll("img"));

  const waits = images.map(img => {
    if (img.complete) {
      if (typeof img.decode === "function") {
        return img.decode().catch(() => {});
      }
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });

  await Promise.all(waits);

  await new Promise(resolve =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setTimeout(resolve, 80)
      )
    )
  );
}

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = !!busy;
  btn.classList.toggle("is-busy", !!busy);
}

document.addEventListener("DOMContentLoaded", () => {
  const printBtn = document.getElementById("printNowButton");
  const backBtn = document.getElementById("backToCalculatorButton");

  let printFlowActive = false;
  let sawHiddenDuringPrint = false;
  let returnTimer = null;
  let autoPrintTriggered = false;

  const armReturnTimer = () => {
    clearTimeout(returnTimer);
    returnTimer = setTimeout(() => {
      if (printFlowActive) goBackToCalculator();
    }, 120000);
  };

  const releasePrintState = () => {
    printFlowActive = false;
    sawHiddenDuringPrint = false;
    clearTimeout(returnTimer);
    returnTimer = null;
    setBusy(printBtn, false);
  };

  const finishAndReturnSoon = () => {
    setTimeout(() => {
      releasePrintState();
      goBackToCalculator();
    }, 250);
  };

  const openPrintPreview = async () => {
    if (printFlowActive) return;
    if (!renderPayload()) return;

    printFlowActive = true;
    sawHiddenDuringPrint = false;
    setBusy(printBtn, true);
    setStatus(isIOSDevice()
      ? "Opening print flow. If preview does not appear, use Share → Print."
      : "Opening print preview…");

    await waitForLayoutAndImages();
    armReturnTimer();

    try {
      window.print();
    } catch (_) {
      releasePrintState();
      setStatus("Unable to open print preview. Use Share → Print.");
    }
  };

  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      releasePrintState();
      goBackToCalculator();
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", (e) => {
      e.preventDefault();
      void openPrintPreview();
    });
  }

  window.addEventListener("afterprint", () => {
    if (!printFlowActive) return;
    if (!isIOSDevice()) finishAndReturnSoon();
  });

  document.addEventListener("visibilitychange", () => {
    if (!printFlowActive) return;

    if (document.hidden) {
      sawHiddenDuringPrint = true;
      return;
    }

    if (isIOSDevice() && sawHiddenDuringPrint) {
      finishAndReturnSoon();
    }
  });

  window.addEventListener("pagehide", () => {
    if (!printFlowActive) return;
    sawHiddenDuringPrint = true;
  });

  window.addEventListener("pageshow", () => {
    if (!printFlowActive) return;
    if (isIOSDevice() && sawHiddenDuringPrint) {
      finishAndReturnSoon();
    }
  });

  if (renderPayload() && !isIOSDevice() && !autoPrintTriggered) {
    autoPrintTriggered = true;
    setTimeout(() => {
      void openPrintPreview();
    }, 180);
  }
});