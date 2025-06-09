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
        func: (inputXPath, buttonXPath, content) => {
          function getElementByXPath(xpath) {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          }

          const inputEl = getElementByXPath(inputXPath);
          const buttonEl = getElementByXPath(buttonXPath);

          if (inputEl && buttonEl) {
            inputEl.focus();

            const range = document.createRange();
            range.selectNodeContents(inputEl);
            range.collapse(false);

            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            document.execCommand("insertText", false, content);
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));

            setTimeout(() => buttonEl.click(), 500);
          }
        },
        args: [res.inputXPath, res.buttonXPath, content]
      }, () => {
        const nextIndex = res.currentIndex + 1;
        chrome.storage.local.set({ currentIndex: nextIndex }, () => {
          const delay = (res.postInterval || 60) * 1000;
          postTimer = setTimeout(runPostLoop, delay);
        });
      });
    });
  });
}
