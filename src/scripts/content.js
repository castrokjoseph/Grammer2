/**
 * Grammer2 Content Script
 * This script is injected into web pages to detect text fields,
 * provide a UI for triggering analysis, and display suggestions.
 */

// --- Globals & Utils ---
const activeFields = new Map();
let settings = { isEnabled: false, mode: 'on-demand' };
let tooltip;
let currentTargetSpan = null;
const debounce = (func, wait) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), wait); }; };

// --- UI & Style Injection ---
function injectStyles() {
    const css = `
        .grammer2-suggestion { cursor: pointer; text-decoration: underline; text-decoration-style: wavy; }
        .grammer2-grammar { text-decoration-color: red; }
        .grammer2-typo { text-decoration-color: blue; }
        .grammer2-rephrase { text-decoration-color: green; }
        .grammer2-tooltip { position: absolute; z-index: 2147483647; background-color: #fff; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 8px; font-family: sans-serif; font-size: 14px; display: none; width: max-content; max-width: 300px; }
        .grammer2-tooltip-suggestion { font-weight: bold; }
        .grammer2-tooltip-actions { margin-top: 8px; display: flex; gap: 8px; }
        .grammer2-tooltip-button { background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; padding: 4px 8px; cursor: pointer; }
        .grammer2-tooltip-button:hover { background-color: #e0e0e0; }
        .grammer2-overlay-backdrop { position: absolute; z-index: 1; pointer-events: none; overflow: hidden; white-space: pre-wrap; word-wrap: break-word; color: transparent; }
        .grammer2-overlay-backdrop span { pointer-events: auto; }
        .grammer2-target-field { color: transparent !important; caret-color: black !important; background-color: transparent !important; z-index: 2; position: relative; }
    `;
    if (!document.getElementById('grammer2-styles')) {
        const style = document.createElement('style');
        style.id = 'grammer2-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }
}

function createTooltip() {
    if (document.querySelector('.grammer2-tooltip')) return;
    tooltip = document.createElement('div');
    tooltip.className = 'grammer2-tooltip';
    document.body.appendChild(tooltip);
    tooltip.addEventListener('mouseenter', () => clearTimeout(tooltip.hideTimeout));
    tooltip.addEventListener('mouseleave', () => hideTooltip());
}

function showTooltip(targetSpan) {
    if (!tooltip) return;
    clearTimeout(tooltip.hideTimeout);
    const suggestion = targetSpan.dataset.suggestion;
    tooltip.innerHTML = `<span class="grammer2-tooltip-suggestion">${suggestion}</span><div class="grammer2-tooltip-actions"><button class="grammer2-tooltip-button" data-action="accept">Accept</button><button class="grammer2-tooltip-button" data-action="reject">Reject</button></div>`;
    const rect = targetSpan.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.display = 'block';
    currentTargetSpan = targetSpan;
}

function hideTooltip() {
    if (!tooltip) return;
    tooltip.hideTimeout = setTimeout(() => {
        tooltip.style.display = 'none';
        currentTargetSpan = null;
    }, 200);
}

// --- Core Analysis & Display ---
function triggerAnalysis(field, button = null) {
    if (button) { button.textContent = '...'; button.disabled = true; }
    const text = field.value !== undefined ? field.value : field.innerText;
    chrome.runtime.sendMessage({ type: 'ANALYZE_TEXT', text: text }, (response) => {
        if (button) { button.textContent = 'G²'; button.disabled = false; }
        if (chrome.runtime.lastError) { console.error('Error:', chrome.runtime.lastError.message); return; }
        if (response && response.success) {
            displayCorrections(field, response.corrections);
        } else {
            console.error('Analysis failed:', response);
        }
    });
}

function displayCorrections(field, corrections) {
    if (!corrections || corrections.length === 0) return;
    if (field.isContentEditable) {
        let originalHTML = field.innerHTML;
        corrections.slice().reverse().forEach(correction => {
            const { original, suggestion, type, start, end } = correction;
            const originalText = field.textContent.substring(start, end);
            if (originalText.trim() === original.trim()) {
                const className = `grammer2-suggestion grammer2-${type}`;
                const replacement = `<span class="${className}" data-suggestion="${suggestion}" data-original="${original}">${originalText}</span>`;
                originalHTML = originalHTML.substring(0, start) + replacement + originalHTML.substring(end);
            }
        });
        field.innerHTML = originalHTML;
        field.querySelectorAll('.grammer2-suggestion').forEach(span => {
            span.addEventListener('mouseenter', () => showTooltip(span));
            span.addEventListener('mouseleave', () => hideTooltip());
        });
    } else if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        createOrUpdateOverlay(field, corrections);
    }
}

function createOrUpdateOverlay(field, corrections) {
    let data = activeFields.get(field);
    if (!data) return;
    let overlay = data.overlay;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'grammer2-overlay-backdrop';
        document.body.appendChild(overlay);
        data.overlay = overlay;
        field.addEventListener('scroll', () => { if(data.overlay) data.overlay.scrollTop = field.scrollTop; });
        field.addEventListener('input', () => createOrUpdateOverlay(field, []));
    }
    const style = window.getComputedStyle(field);
    const rect = field.getBoundingClientRect();
    Object.assign(overlay.style, {
        font: style.font, padding: style.padding, margin: style.margin, border: style.border, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight, textAlign: style.textAlign,
        top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
    let content = field.value;
    let html = '';
    corrections.slice().reverse().forEach(corr => {
        const originalText = content.substring(corr.start, corr.end);
        html = `<span class="grammer2-suggestion grammer2-${corr.type}" data-suggestion="${corr.suggestion}" data-original="${originalText}">${originalText}</span>` + html;
        content = content.substring(0, corr.start);
    });
    html = content + html;
    overlay.innerHTML = html.replace(/\\n/g, '<br>');
    overlay.querySelectorAll('.grammer2-suggestion').forEach(span => {
        span.addEventListener('mouseenter', () => showTooltip(span));
        span.addEventListener('mouseleave', () => hideTooltip());
    });
    field.classList.add('grammer2-target-field');
}

// --- Event Handlers ---
document.addEventListener('click', (e) => {
    if (e.target.matches('.grammer2-tooltip-button') && currentTargetSpan) {
        const action = e.target.dataset.action;
        const suggestion = currentTargetSpan.dataset.suggestion;
        let field;
        for(const [f, data] of activeFields.entries()) {
            if((data.overlay && data.overlay.contains(currentTargetSpan)) || f.contains(currentTargetSpan)) {
                field = f; break;
            }
        }
        if (action === 'accept' && field) {
            if (field.isContentEditable) {
                currentTargetSpan.parentNode.replaceChild(document.createTextNode(suggestion), currentTargetSpan);
            } else {
                field.value = field.value.replace(currentTargetSpan.dataset.original, suggestion);
                createOrUpdateOverlay(field, []);
            }
        }
        hideTooltip();
    }
});

// --- Field Lifecycle Management ---
function addField(field) {
    if (activeFields.has(field) || !field.isConnected) return;
    const fieldData = {};
    activeFields.set(field, fieldData);
    if (settings.mode === 'on-demand') {
        fieldData.button = createButton(field);
        updateButtonPositions();
    } else if (settings.mode === 'automatic') {
        const debouncedAnalysis = debounce(() => triggerAnalysis(field), 500);
        field.addEventListener('input', debouncedAnalysis);
        fieldData.debouncedListener = debouncedAnalysis;
    }
}

function removeField(field) {
    if (!activeFields.has(field)) return;
    const data = activeFields.get(field);
    if (data.button) data.button.remove();
    if (data.overlay) data.overlay.remove();
    if (data.debouncedListener) field.removeEventListener('input', data.debouncedListener);
    activeFields.delete(field);
}

function createButton(field) {
    const button = document.createElement('button');
    Object.assign(button.style, { position: 'absolute', zIndex: '2147483647', width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' });
    button.textContent = 'G²';
    button.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        triggerAnalysis(field, button);
    });
    document.body.appendChild(button);
    return button;
}

function updateButtonPositions() {
    for (const [field, data] of activeFields.entries()) {
        if (!data.button) continue;
        const rect = field.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || rect.top > window.innerHeight || rect.bottom < 0) { data.button.style.display = 'none'; continue; }
        data.button.style.display = 'flex';
        const top = rect.bottom + window.scrollY - 28;
        const left = rect.right + window.scrollX - 28;
        data.button.style.top = `${top}px`;
        data.button.style.left = `${left}px`;
    }
}

function discoverFields() {
    const textFields = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
    const currentFieldsInDom = new Set(textFields);
    currentFieldsInDom.forEach(field => {
        if (!activeFields.has(field)) { addField(field); }
    });
    for (const field of activeFields.keys()) {
        if (!field.isConnected) { removeField(field); }
    }
    updateButtonPositions();
}

const debouncedDiscover = debounce(discoverFields, 250);
const debouncedUpdatePositions = debounce(updateButtonPositions, 100);

// --- Main Initialization ---
function start() {
    if (!settings.isEnabled) return;
    injectStyles();
    createTooltip();
    discoverFields();
    const observer = new MutationObserver(debouncedDiscover);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', debouncedUpdatePositions);
    window.addEventListener('scroll', debouncedUpdatePositions, true);
}

// --- Entry Point ---
if (window.self === window.top) { // Avoid running in iframes
    chrome.storage.sync.get(['isEnabled', 'mode'], (result) => {
        if (chrome.runtime.lastError) { console.error("Grammer2: Error getting settings:", chrome.runtime.lastError); return; }
        settings = { ...settings, ...result };
        start();
    });
    chrome.storage.onChanged.addListener(() => window.location.reload());
}
