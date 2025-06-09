let postTimer = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "start-posting") {
    clearTimeout(postTimer);
    runPostLoop();
  } else if (msg.type === "stop-posting") {
    clearTimeout(postTimer);
  }
});

function runPostLoop() {
  chrome.storage.local.get(["postingActive", "postQueue", "currentIndex", "inputXPath", "buttonXPath", "postInterval"], (res) => {
    if (!res.postingActive || !res.postQueue || res.currentIndex >= res.postQueue.length) return;

    const content = res.postQueue[res.currentIndex]?.content;
    if (!content) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: async (inputXPath, buttonXPath, content) => {
          function getElementByXPath(xpath) {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          }

          function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }

          async function typeLikeHuman(el, text) {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);

            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            for (let char of text) {
              document.execCommand("insertText", false, char);
              el.dispatchEvent(new Event("input", { bubbles: true }));
              await delay(50 + Math.random() * 100); // 50–150ms per keystroke
            }
          }

          const inputEl = getElementByXPath(inputXPath);
          const buttonEl = getElementByXPath(buttonXPath);

          if (inputEl && buttonEl) {
            await typeLikeHuman(inputEl, content);
            const postDelay = 1000 + Math.random() * 2000; // 1–3s delay before clicking
            await delay(postDelay);
            buttonEl.click();
          }
        },
        args: [res.inputXPath, res.buttonXPath, content]
      }, () => {
        const nextIndex = res.currentIndex + 1;
        chrome.storage.local.set({ currentIndex: nextIndex }, () => {
          const delayMs = (res.postInterval || 60) * 1000;
          postTimer = setTimeout(runPostLoop, delayMs);
        });
      });
    });
  });
}
