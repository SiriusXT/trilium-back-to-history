/*
Back-to-historytory
https://github.com/SiriusXT/trilium-back-to-history
version:0.4 for TriliumNext > 0.90.8
*/


const supportType = ['text','code']
const autoJump = true;
const showJumpButton = true;

// The following code does not need to be modified

if (!autoJump && !showJumpButton){
    console.log("BackUpHistory: do nothing");
    return;
}

function creatHistory() {
    return new Promise((resolve, reject) => {
        api.runOnBackend((noteId) => {
            try {
                const { note, branch } = api.createNewNote({
                    parentNoteId: noteId,
                    title: 'history',
                    content: '{}',
                    type: 'code',
                    mime: 'application/json'
                });
                resolve(note);
            } catch (error) {
                // reject(error);
            }
        }, [api.startNote.noteId]);
    });
}

let historyNoteId;
let history;
let shouldSave = false;
async function checkHistory() {
    if (history !== undefined) { return; }
    const children = api.startNote.children;
    let haveHistory = false;
    for (let i = 0; i < children.length; i++) {
        const childNote = await api.getNote(children[i]);
        if (childNote.type == 'code' && childNote.mime == 'application/json' && childNote.title == 'history') {
            historyNoteId = childNote.noteId;
            try {
                history = JSON.parse((await childNote.getNoteComplement()).content);
            } catch (error) {
                history = {}
            }
            haveHistory = true;
            break;
        }
    }
    if (!haveHistory) {
        const note = await creatHistory();
        historyNoteId = note.noteId;
        history = JSON.parse((await note.getNoteComplement()).content);
    }
}

const jumpButton = `<div class="ribbon-tab-title jump-history">
    <span class="ribbon-tab-title-icon bx bx-down-arrow-alt"></span>
</div><div class="ribbon-tab-spacer jump-history"></div>`
var jumpHistory = class extends api.NoteContextAwareWidget {
    get position() {
        return 50;
    }
    static get parentWidget() {
        return 'note-detail-pane';
    }
    constructor() {
        super();
    }
    isEnabled() {
        return super.isEnabled() && supportType.includes(this.note.type);
    }
    doRender() {
        this.$widget = $('');
        return this.$widget;
    }
    scrollHandler = () => {
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            const sc = this.$scrollingContainer[0];
            const nl = this.$scrollingContainer.find('.note-list-widget')[0];
            const radio = (sc.scrollTop / (sc.scrollHeight - nl.offsetHeight)).toFixed(5);
            // console.log('BackToHistory:', this.note.noteId, radio, sc.scrollTop, sc.scrollHeight, nl.offsetHeight);
            if (!isNaN(radio)) {
                history[this.note.noteId] = radio;
                shouldSave = true;
            }
        }, 1000);
    }
    scrollTo = () => {
        const sc = this.$scrollingContainer[0];
        const nl = sc.querySelector('.note-list-widget');
        const scrollHeight = sc.scrollHeight - nl.offsetHeight;
        $(sc).animate({
            scrollTop: this.scrollToRadio * scrollHeight,
        }, 300);
    }
    addJumpButton() {
        const $ribbonTab = $(`.note-split[data-ntx-id="${this.noteContext.ntxId}"]`).find('.ribbon-tab-container');
        $ribbonTab.find('.jump-history').remove();
        const $button = $(jumpButton);
        $ribbonTab.append($button);
        $button.on('click', this.scrollTo);
        $button.attr('title', "Scorll To " + this.scrollToRadio * 100 + "%");
    }

    autoJumpFunc() {
        this.scrollTo();
        clearInterval(this.jumpInterval);
        let timesRun = 0;
        let preHeight = 0;
        this.jumpInterval = setInterval(() => {
            timesRun += 1;
            if (timesRun == 5) {
                clearInterval(this.jumpInterval);
            }
            if (this.$scrollingContainer[0].scrollHeight != preHeight) {
                preHeight = this.$scrollingContainer[0].scrollHeight;
                this.scrollTo();
            }
        }, 200);
    }
    async initEvent() {
        this.updateTimeout = 0;
        const $noteSplit = $(`.note-split[data-ntx-id="${this.noteContext.ntxId}"]`);
        this.$scrollingContainer = $noteSplit.children('.scrolling-container');
        this.$scrollingContainer.off('scroll', this.scrollHandler);
        if (showJumpButton && this.scrollToRadio != undefined) {
            this.addJumpButton();
        }
        setTimeout(() => {
            // Automatic jump without monitoring
            this.$scrollingContainer.off('scroll', this.scrollHandler);
            this.$scrollingContainer.on('scroll', this.scrollHandler);
        }, 1000);
    }
    async refreshWithNote() {
        await checkHistory();
        this.scrollToRadio = history[this.note.noteId];
        await this.initEvent();
        if (this.scrollToRadio != undefined && autoJump) {
            this.autoJumpFunc();
        }
    }
    async entitiesReloadedEvent({ loadResults }) {
        if (loadResults.isNoteContentReloaded(this.noteId)) {
            this.scrollHandler();
        }
        if (loadResults.getAttributeRows().find(attr => attr.noteId === this.noteId)) {
            this.initEvent();
        }
    }
}

module.exports = jumpHistory;

function saveHistory() {
    const keys = Object.keys(history);
    while (keys.length > 100) {
        const oldestKey = keys.shift();  // Get the oldest key
        delete history[oldestKey];  // Delete the element corresponding to the key
    }
    api.runAsyncOnBackendWithManualTransactionHandling(async (historyNoteId, history) => {
        const historyNote = await api.getNote(historyNoteId);
        historyNote.setContent(JSON.stringify(history));
    }, [historyNoteId, history]);
}

setInterval(() => {
    if (shouldSave) {
        shouldSave = false;
        saveHistory();
    }
}, 5000)
