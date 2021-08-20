// Create context menu item for toggling autofocus
chrome.contextMenus.create({
    id: 'toggle-autofocus',
    title: 'Toggle autofocus for this field',
    contexts: ['editable'],
    visible: true,
});

// Click listener. Sends a message to content script which has access to the element from which the context menu was spawned
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId == 'toggle-autofocus') {
        chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
            chrome.tabs.sendMessage(tabs[0].id,{event:'toggleContextMenuElement'});
        });
    }
});

// Makes the toolbar icon dynamic by using colors to indicate current status (enabled, disabled, no element found)
chrome.runtime.onMessage.addListener((msg,sender,sendResponse) => {
    if (msg.event == 'setIcon') {
        chrome.browserAction.setIcon({path: 'img/icon'+msg.payload+'-48.png'});
    }
});

// Always default to standard icon
chrome.browserAction.setIcon({path: 'img/icon-48.png'});