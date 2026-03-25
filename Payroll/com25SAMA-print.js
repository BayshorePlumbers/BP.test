(function () {
  const payloadKey = 'com25SAMA_print_payload_v1';
  const returnKey = 'com25SAMA_return_url';

  const root = document.getElementById('printRoot');
  const payload = sessionStorage.getItem(payloadKey);

  if (payload && root) {
    root.innerHTML = payload;
  }

  document.body.classList.add('print-page');

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const printBtn = document.getElementById('printNowBtn');
  const backBtn = document.getElementById('goBackBtn');

  let printFlowStarted = false;
  let seenHidden = false;
  let returnTimer = null;
  let hasNavigatedBack = false;

  function waitForRender() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 300);
        });
      });
    });
  }

  function goBackOnce() {
    if (hasNavigatedBack) return;
    hasNavigatedBack = true;

    const returnUrl = sessionStorage.getItem(returnKey) || 'com25SAMA.html';
    document.body.classList.remove('is-printing');
    document.body.classList.remove('print-page');
    sessionStorage.removeItem(payloadKey);
    window.location.href = returnUrl;
  }

  function armReturnFallback() {
    clearTimeout(returnTimer);
    returnTimer = setTimeout(goBackOnce, 15000);
  }

  function beginPrintFlow() {
    printFlowStarted = true;
    document.body.classList.add('is-printing');
    armReturnFallback();
  }

  function tryPrint() {
    if (isIOS) return;
    waitForRender().then(() => {
      beginPrintFlow();
      window.print();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', function () {
        waitForRender().then(() => {
        beginPrintFlow();
        window.print();
        });
    });
    }

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      goBackOnce();
    });
  }

  window.addEventListener('afterprint', function () {
    setTimeout(goBackOnce, 300);
  });

  document.addEventListener('visibilitychange', function () {
    if (!printFlowStarted) return;
    if (document.hidden) {
      seenHidden = true;
      return;
    }
    if (seenHidden) {
      goBackOnce();
    }
  });

  window.addEventListener('pagehide', function () {
    if (!printFlowStarted) return;
    armReturnFallback();
  });

  window.addEventListener('pageshow', function () {
    if (!printFlowStarted) return;
    if (seenHidden) {
      goBackOnce();
    }
  });

  tryPrint();
})();