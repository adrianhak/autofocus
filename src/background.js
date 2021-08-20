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