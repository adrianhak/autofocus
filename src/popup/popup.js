// Initial variables and input references
let hostname;
const toggleSiteBtn = document.getElementById('toggle-site');
const toggleGlobalBtn = document.getElementById('toggle-global');
const optionsBtn = document.getElementById('options');
const findInputBtn = document.getElementById('find-input');
const changeInputBtn = document.getElementById('change-input');
const cancelChangeBtn = document.getElementById('cancel-change');
const resetInputBtn = document.getElementById('reset-input');
const enabledStatusEl = document.getElementById('enabled-status');
const globalStatusEl = document.getElementById('global-status');
const noElementMsg = document.getElementById('no-element-msg');
const versionTag = document.getElementById('version');

feather.replace();

// Get the hostname of current tab and call init
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tab = tabs[0];
    let url = new URL(tab.url);
    hostname = url.hostname;
    init();
})

// Click listeners
toggleSiteBtn.addEventListener('click',(e) => {
    toggleSite(hostname);
});
toggleGlobalBtn.addEventListener('click',(e) => {
    toggleGlobally();
});
findInputBtn.addEventListener('click',(e) => {
    sendMsg({event: 'highlightTarget'});
});
optionsBtn.addEventListener('click',(e) => {
    chrome.runtime.openOptionsPage();
});
changeInputBtn.addEventListener('click',(e) => {
    changeInput();
})
cancelChangeBtn.addEventListener('click',(e) => {
    changeInput();
});
resetInputBtn.addEventListener('click',() => {
    resetCustomMapping();
})

function setEnabledStatus(status) {
    enabledStatusEl.innerText = (status ? '✅ Enabled' : '❌ Disabled') + ' on this site';
    enabledStatusEl.style.color = status ? 'green' : 'red';
    if (status) {
        toggleSiteBtn.classList.add('menu-btn-enabled');
    }
    else {
        toggleSiteBtn.classList.remove('menu-btn-enabled');
    }
}

function setGloballyEnabledStatus(status) {
    if (status) {
        enabledStatusEl.classList.remove('hidden');
        globalStatusEl.classList.add('hidden');
        toggleGlobalBtn.classList.add('menu-btn-enabled');
        toggleSiteBtn.removeAttribute('disabled');
        checkSiteStatus();
    } else {
        enabledStatusEl.classList.add('hidden');
        globalStatusEl.classList.remove('hidden');
        toggleGlobalBtn.classList.remove('menu-btn-enabled');
        toggleSiteBtn.classList.remove('menu-btn-enabled');
        toggleSiteBtn.setAttribute('disabled',true); // Disable site-toggle when global is disabled
    }
}

function changeInput() {
    document.getElementById('content').classList.toggle('hidden');
    document.getElementById('input-change-content').classList.toggle('hidden');

    sendMsg({event:'changeInput'});
}

// Removes the custom mapping for current hostname
function resetCustomMapping() {
    chrome.storage.sync.get('custom',(val) => {
        const custom = val['custom'];
        if (custom == null || custom[hostname] == null) return;
        delete custom[hostname];
        chrome.storage.sync.set({custom:custom},() => {
            if (chrome.runtime.lastError) {
                console.error('Could not reset custom mapping');
                return;
            }
            resetInputBtn.classList.add('hidden');
        });
    });
}

function toggleSite(hostname) {
    chrome.storage.sync.get('disabled', (val) => {
        if (val['disabled']) {
            // If hostname is not present in list, add it
            const index = val['disabled'].indexOf(hostname);
            if (index == -1) {
                chrome.storage.sync.set({disabled: [...val['disabled'], hostname]});
                setEnabledStatus(false);
            } else {
                chrome.storage.sync.set({disabled: [...val['disabled'].slice(0,index), ...val['disabled'].slice(index + 1)]});
                setEnabledStatus(true);
            }
        } else {
            chrome.storage.sync.set({disabled: [hostname]});
            setEnabledStatus(false);
        }
    });
}

function toggleGlobally() {
    chrome.storage.sync.get('globallyDisabled',(val) => {
        const status = val['globallyDisabled'] === undefined ? true : !val['globallyDisabled'];
        chrome.storage.sync.set({globallyDisabled: status},() => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                setGloballyEnabledStatus(val['globallyDisabled'] === undefined ? false : val['globallyDisabled']);
            }
        });
    });
}

function sendMsg(msg,callback=null) {
    chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
        chrome.tabs.sendMessage(tabs[0].id,msg,(response) => {
            if (typeof callback == 'function') callback(response)});
    });
}

function showTargetExistence(targetExists) {
    if (!targetExists) {
        noElementMsg.classList.remove('hidden');
        findInputBtn.classList.add('hidden');
    } else {
        noElementMsg.classList.add('hidden');
        findInputBtn.classList.remove('hidden');
    }
}

function checkSiteStatus() {
    chrome.storage.sync.get('disabled',(val => {
        setEnabledStatus(!val['disabled'] ? true : val['disabled']?.indexOf(hostname) == -1);
        if (val['disabled'] && val['disabled']?.indexOf(hostname) != -1) return;
        sendMsg({event: 'targetExists'},(targetExists) => {
            showTargetExistence(targetExists);
        });
    }))
}

function init() {
    chrome.storage.sync.get('globallyDisabled',(val) => {
        setGloballyEnabledStatus(!val['globallyDisabled']);
        checkSiteStatus();
    });
    chrome.storage.sync.get('custom',(val) => {
        if (val['custom']?.[hostname]) {
            resetInputBtn.classList.remove('hidden');
        }
    });
    versionTag.innerText = 'v'+chrome.runtime.getManifest().version;
}