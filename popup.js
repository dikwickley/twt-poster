window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["inputXPath", "buttonXPath", "postQueue", "currentIndex", "postInterval"], (res) => {
    if (res.inputXPath) document.getElementById("inputXPath").value = res.inputXPath;
    if (res.buttonXPath) document.getElementById("buttonXPath").value = res.buttonXPath;
    if (res.postInterval) document.getElementById("postInterval").value = res.postInterval;

    updateStatus(res.currentIndex || 0, res.postQueue ? res.postQueue.length : 0);
  });

  document.getElementById("inputXPath").addEventListener("input", e =>
    chrome.storage.local.set({ inputXPath: e.target.value })
  );

  document.getElementById("buttonXPath").addEventListener("input", e =>
    chrome.storage.local.set({ buttonXPath: e.target.value })
  );

  document.getElementById("postInterval").addEventListener("input", e => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      chrome.storage.local.set({ postInterval: val });
    }
  });
});

document.getElementById("jsonFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const posts = JSON.parse(reader.result);
      if (!Array.isArray(posts)) throw new Error("Invalid JSON format");
      chrome.storage.local.set({ postQueue: posts, currentIndex: 0 }, () => {
        updateStatus(0, posts.length);
        alert("Posts loaded.");
      });
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  };
  reader.readAsText(file);
});

document.getElementById("startBtn").addEventListener("click", () => {
  chrome.storage.local.set({ postingActive: true }, () => {
    chrome.runtime.sendMessage({ type: "start-posting" });
  });
});

document.getElementById("stopBtn").addEventListener("click", () => {
  chrome.storage.local.set({ postingActive: false });
  chrome.runtime.sendMessage({ type: "stop-posting" });
  document.getElementById("status").innerText = "Status: Stopped";
});

function updateStatus(current, total) {
  document.getElementById("status").innerText = `Status: ${current}/${total}`;
}
