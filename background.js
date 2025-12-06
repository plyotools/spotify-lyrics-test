// Background script to open extension window
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 900,
    height: 700,
    focused: true
  });
});

