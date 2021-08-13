let customMappingsEditor, disabledListEditor;
const saveCustomBtn = document.getElementById('save-custom');
const saveDisabledBtn = document.getElementById('save-disabled');
const customSyntaxErrorMsg = document.getElementById('custom-syntax-error-msg');
const disabledSyntaxErrorMsg = document.getElementById('disabled-syntax-error-msg');
const customImportBtn = document.getElementById('import-custom');
const disabledImportBtn = document.getElementById('import-disabled');
const customExportBtn = document.getElementById('export-custom');
const disabledExportBtn = document.getElementById('export-disabled');
const customClearBtn = document.getElementById('clear-custom');
const disabledClearBtn = document.getElementById('clear-disabled');

saveCustomBtn.addEventListener('click',() => handleSave(customMappingsEditor));
saveDisabledBtn.addEventListener('click',() => handleSave(disabledListEditor));
customImportBtn.addEventListener('click',() => handleImport(customMappingsEditor));
disabledImportBtn.addEventListener('click',() => handleImport(disabledListEditor));
customExportBtn.addEventListener('click',() => handleExport(customMappingsEditor));
disabledExportBtn.addEventListener('click',() => handleExport(disabledListEditor));
customClearBtn.addEventListener('click',() => handleClear(customMappingsEditor));
disabledClearBtn.addEventListener('click',() => handleClear(disabledListEditor));

// Fills the code editors with the current values from localstorage
chrome.storage.sync.get('custom',(val) => {
    customMappingsEditor = CodeMirror(document.getElementById('custom-mappings'),
                {
                    value: val['custom'] != null ? JSON.stringify(val['custom'],null,2) : '{}',
                    lineNumbers: true,
                    mode: {name:'javascript', json:true}
                });
});

chrome.storage.sync.get('disabled',(val) => {
    disabledListEditor = CodeMirror(document.getElementById('disabled-list'),
                {
                    value: val['disabled'] != null ? JSON.stringify(val?.['disabled'],null,2) : '[]',
                    lineNumbers: true,
                    mode: {name: 'javascript',json:true}
                });
});

// Saves the JSON content of the editor if valid
function handleSave(editor) {
    const mappings = editor.getValue();
    const errorEl = editor == customMappingsEditor ? customSyntaxErrorMsg : disabledSyntaxErrorMsg;
    try {
        const json = JSON.parse(mappings);
        errorEl.classList.add('hidden');
        if (editor == customMappingsEditor) {
            chrome.storage.sync.set({custom:json});
            return;
        }
        if (editor == disabledListEditor) {
            chrome.storage.sync.set({disabled:json});
        }
    } catch(SyntaxError) {
        console.error('Invalid JSON syntax');
        errorEl.classList.remove('hidden');
    }
}

// Called when 'Import' button is clicked
// TODO: Option to import by appending to, instead of replacing, current content
function handleImport(editor) {
    // Create an invisible file input element to trigger the file dialog
    const inputEl = document.createElement('input');
    inputEl.style.display = 'none';
    inputEl.type = 'file';
    inputEl.name = 'file';
    inputEl.accept = 'application/json,.json';
    document.body.appendChild(inputEl);
    inputEl.addEventListener('change',(e) =>handleImportedFile(e,editor));
    inputEl.click();
}

// Reads the selected file, adds it to the editor if not empty and tries to save it
function handleImportedFile(e,editor) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target.result;
            if (contents) {
                editor.setValue(contents);
                handleSave(editor);
            }
        }
        reader.readAsText(file);
    }
}

// Creates and downloads a blob of the editor content
function handleExport(editor) {
    const contents = editor.getValue();
    if (contents) {
        const blob = new Blob([contents],{type: 'application/json'});
        const blobURL = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href',blobURL);
        a.setAttribute('download', editor == customMappingsEditor ? 'customMappings.json' : 'disabledSites.json');
        a.style.display = 'none';
        a.click();
        URL.revokeObjectURL(blobURL);
    }
}

// Clears the content of the editor but does NOT save
function handleClear(editor) {
    const emptyValue = editor == customMappingsEditor ? '{}' : '[]';
    editor.setValue(emptyValue);
}