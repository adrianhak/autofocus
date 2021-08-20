const inputTypes = ['search','text'];
let inputEls;
let targetElement;
let contextMenuElement; // To be set by event listener

// Check if host is blacklisted by user
isDisabled(location.hostname,(isDisabled) => {
    if (!isDisabled) {
        // Wait for page to fully load before accessing DOM elements
        if (document.readyState == 'complete') {
            init();
        } else {
            window.addEventListener('load',function load() {
                window.removeEventListener('load',load,false);
                init();
            });
        }
    } 
});

function init() {
    inputEls = [...document.getElementsByTagName('input')];
    // First find out if user has a custom mapping for this hostname
    searchMappings('custom',(element) => {
        if (element == null) {
            // If not, start looking
            element = findElement();
            focusElement(element);
            return;
        }
        focusElement(element);
    });
}

// Search provided mapping of element fingerprints and return element if valid, otherwise null
function searchMappings(mapType,callback) {
    chrome.storage.sync.get(mapType,(mappings => {
        if (mappings[mapType]?.hasOwnProperty(location.hostname)) {
            const element = findElementFromFingerprint(mappings[mapType][location.hostname]);
            if (element && element.tagName == 'INPUT') {
                callback(element);
                return;
            }
        }
        callback(null);
    }));
}

// Looks for element by using provided fingerprint found in storage
// Tries to find the element with the highest number of matching attributes in fingerprint
// However, if ids for an element match, that element will always be chosen
function findElementFromFingerprint(fingerprint) {
    let element = inputEls.find((input) => input.id == fingerprint.id && input.id != '');
    if (element != null) return element;
    
    let attrCount = {};
    inputEls.forEach((inputEl,i) => {
        attrCount[i] = 0;
        // Count the number of matching attributes
        Object.keys(fingerprint).forEach((key) => {
            // If list index diff is 2 or 1, add 0.5 to count
            if (key == 'inputListIndex') {
                attrCount[i] += 
                    i == fingerprint[key] ? 1 : (Math.abs(i - fingerprint[key]) <= 2 ? 0.5 : 0);
                return;
            }
            // If more than half of css classes match, add 1, if more than 10% match, add 0.5
            if (key == 'classList') {
                if (fingerprint['classList'].length == 0) {
                    attrCount[i] += [...inputEl.classList].length == 0 ? 1 : 0;
                    return;
                };
                const ratio = fingerprint['classList'].filter((c) => [...inputEl.classList].includes(c)).length / fingerprint['classList'].length;
                attrCount[i] += ratio >= 0.5 ? 1 : (ratio >= 0.1 ? 0.5 : 0 );
                return;
            }
            attrCount[i] += inputEl[key] == fingerprint[key] ? 1 : 0;
        });
    });
    // If the total number of matches for all elements is 0, return null
    if (Object.entries(attrCount).map((x) => x[1]).reduce((a,b) => a + b,0) == 0) return null;
    
    // Return the element with the highest number of matching attribute values
    const winningIndex = Object.entries(attrCount).sort((a,b) => b[1]-a[1])[0][0];
    // Need at least 2 matching attributes in order to accept element
    if (attrCount[winningIndex] < 2) return null;
    return inputEls[winningIndex];
}

// Returns a serializable 'fingerprint' of the element by using key attributes
function elementFingerprint(element) {
    return {id: element.id,     
            classList: [...element.classList], 
            type: element.type,
            name: element.name, 
            autocomplete: element.autocomplete,
            inputListIndex: inputEls.indexOf(element)
        }
}

function findElement() {
    for (let type of inputTypes) {
        let element = inputEls.find((inputEl) => 
            (inputEl.type == type && isVisible(inputEl)));
        
        // If no element with specified type was found, continue the loop
        if (element == undefined) continue;
        return element;
    }
}

// Switches focus on the provided element if possible and puts element in global scope
function focusElement(element) {
    if (element == null) return;
    targetElement = element;
    targetElement.focus();
}

// Check if the current hostname is present in user's blacklist (or if extension is globally disabled)
function isDisabled(hostname,callback) {
    chrome.storage.sync.get('globallyDisabled',(val) => {
        if (val['globallyDisabled']) {
            callback(true);
            return;
        }
        chrome.storage.sync.get('disabled',(val) => {
            if (!val['disabled'] ? true : val['disabled']?.indexOf(hostname) == -1) {
                callback(false);
                return;
            }
            callback(true);
        });
    })
}

// Check if element is visible to the user
function isVisible(elem) {
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;

    // If element size is 0, return false
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };

    // If element is positioned outside of window, return false
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;

    // Iterate over all elements present at coordinates and only return true if element is found
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode);
    return false;
}

// Scroll to and highlight the target element
// TODO: Wait for scrolling to finish before highlighting target
function highlightTarget() {
    if (targetElement == null) return;
    targetElement.scrollIntoView({behavior: 'smooth',block: 'center'});
    let rect = targetElement.getBoundingClientRect();
    let overlay = document.getElementById('autofocus-extension-target-overlay'); 
    if (overlay != null) {
        overlay.style.display = 'block';
    } else {
        overlay = document.createElement('div');
        overlay.style.backgroundColor = 'rgba(255, 227, 105,0.5)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = 99;
        overlay.style.position ='absolute';
        overlay.id = 'autofocus-extension-target-overlay'
        document.body.appendChild(overlay);
    }
    // Position and size attributes needs to be updated when targetElement changes
    overlay.style.left = rect.left+'px';
    overlay.style.top = rect.top+'px';
    overlay.style.width = rect.width+'px';
    overlay.style.height = rect.height+'px';

    setTimeout(() => overlay.style.display = 'none',1500);
}

// Called when user clicks to select a new input element or to
// cancel the selection
function handleInputChange(e) {
    document.removeEventListener('click',handleInputChange);
    document.removeEventListener('focusin',handleInputChange);

    // If user clicked anywhere but in a focusable element, do nothing
    // TODO: This might be an issue if the browser dispatches the click event before focusin
    if (e.type == 'click') return;
    targetElement = e.target;
    highlightTarget();
    setCustomMapping(elementFingerprint(e.target));

}

// Stores the id of element user selected
function setCustomMapping(targetFingerprint) {
    chrome.storage.sync.get('custom',(val) => {
        let custom = val?.['custom'] ? val['custom'] : {};
        custom[location.hostname] = targetFingerprint;
        chrome.storage.sync.set({custom:custom});
    });
}

// Returns true if the provided element currently exists in custom mapping, false otherwise
function isElementInCustomMap(element,callback) {
    if (element == null) {
        callback(false);
        return;
    } 
    chrome.storage.sync.get('custom',(val) => {
        if (!val['custom'][window.location.hostname]) {
            callback(false);
            return;
        } 
        if (findElementFromFingerprint(elementFingerprint(element)) == findElementFromFingerprint(val['custom'][window.location.hostname])) {
            callback(true);
            return;
        }
        callback(false);
        return;
    });
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        switch(message.event) {
            case 'highlightTarget':
                highlightTarget();
                break;
            case 'targetExists':
                sendResponse(targetElement != null);
                break;
            case 'changeInput':
                document.activeElement.blur(); // Needed for MS Edge (and Chrome?)
                document.addEventListener('focusin',handleInputChange);
                // Click handler is used to cancel the change event if user clicks to close popup
                document.addEventListener('click',handleInputChange);
                break;
            case 'toggleContextMenuElement': // When user selects 'Toggle autofocus for this field' in context menu
                isElementInCustomMap(contextMenuElement,(elementExists) => {
                    if (!elementExists) {
                        focusElement(contextMenuElement);
                        setCustomMapping(elementFingerprint(contextMenuElement));
                    } else {
                        chrome.storage.sync.get('custom',(val) => {
                            let custom = val['custom'];
                            delete custom[window.location.hostname];
                            chrome.storage.sync.set({custom:custom});
                        });
                    }
                });
                break;
            default:
                console.error("Unrecognised message: ", message);
        }
    }
);

// Get the element from which the context menu was spawned within
document.addEventListener('contextmenu',(e) => {
    if (e.target.tagName != 'INPUT') {
        contextMenuElement = null;
        return;
    };
    contextMenuElement = e.target;
});
