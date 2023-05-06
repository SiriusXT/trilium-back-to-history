/*
BackToHistory
https://github.com/SiriusXT/trilium-back-to-history
version:0.1.9
*/
var bth = new Array();
bth["historyNoteId"] = ""; // Fill in the note id used to store history progress
bth["autoJump"] = 1; //1: Automatically jump   0: Manual jump
bth["maxHistory"] = 100; // Maximum number of saved histories 

if (bth["historyNoteId"] == "") {
	api.showMessage("Fill in the note id used to store history progress");
	return
}
bth['preHeight'] = 0;
bth["fnotetype"] = 0;
bth["canListen"] = 1;
bth['scrollTo'] = function () {
		if (bth["note-list"].length != 0) {
			var scrollHeight = bth["noteDiv"].scrollHeight - bth["note-list"][0].offsetHeight;
		}
		else { var scrollHeight = bth["noteDiv"].scrollHeight; }
		$(bth["noteDiv"]).animate({
			scrollTop: bth["lastRatio"] * scrollHeight,
		}, 300);
	}  
function getnoteDiv() {

	var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-printable.component div.ck ");//text, no subnotes
	if (noteDiv.length == 0) {
		var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split.type-code:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-code.note-detail-printable.component div.note-detail-code-editor div.CodeMirror.cm-s-default.CodeMirror-wrap div.CodeMirror-scroll");// code, no subnotes
	}
	if (noteDiv.length == 0) {
		var noteDiv
			= document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container");//text, with subnotes, code, with subnotes
	}
	bth["noteDiv"] = noteDiv[0];
	bth["note-list"] = document.querySelectorAll('div.component.note-split:not(.hidden-ext) div.note-list-widget.component');

};


function saveHis() {
	//console.log('saveHis');
	if (api.getActiveContextNote() == null) { return };
	if (bth["fnotetype"] == 0) { return };
	if (bth["note-list"].length != 0) {
		var ratio = (bth["noteDiv"].scrollTop / (bth["noteDiv"].scrollHeight - bth["note-list"][0].offsetHeight)).toFixed(5);
	}
	else { var ratio = (bth["noteDiv"].scrollTop / bth["noteDiv"].scrollHeight).toFixed(5); }


	if (bth["history"].some(function (element) {
		return element.id === bth["noteId"];
	})) {
		bth["history"].forEach(function (element) {
			if (element.id === bth["noteId"]) {
				element.ratio = ratio;
			}
		});
	} else {
		bth["history"].push({ "id": bth["noteId"], "ratio": ratio });
	}


	if (true) {
		clearTimeout(bth["saveHisTimer"]);
		bth["saveHisTimer"] = setTimeout((historyNoteId, history) => {
			api.runOnBackend(async (historyNoteId, history) => {
				const historyNote = await api.getNote(historyNoteId);
				historyNote.setContent(JSON.stringify(history));
			}, [historyNoteId, history]);
		}, 1000, bth["historyNoteId"], bth["history"]);
	}
}
function scrollFunc(event) {
	//console.log('scrollFunc');
	clearTimeout(bth["scrollTimer"]);
	clearTimeout(bth["jumpInterval"]);
	bth["scrollTimer"] = setTimeout(saveHis, 1000);
}

function reload() {
    $(bth["noteDiv"]).off('scroll');
	$(document).ready(function () {
		getnoteDiv();
		if (!$("div.component.note-split:not(.hidden-ext) div.ribbon-tab-title").hasClass('backToHis')) {
			$("div.component.note-split:not(.hidden-ext) .ribbon-tab-title").last().after(`<div class="backToHis ribbon-tab-spacer" style="display:none;"></div>
<div  class="backToHis ribbon-tab-title" style="display:none;" >
	<span  class="backToHis ribbon-tab-title-icon bx" style="display:none;"></span>
</div>`);
            $('div.component.note-split:not(.hidden-ext) div.backToHis.ribbon-tab-title').off("click", bth['scrollTo']);
            $('div.component.note-split:not(.hidden-ext) div.backToHis.ribbon-tab-title').on("click", bth['scrollTo']);
		}
		if (bth["history"].some(function (element) { return element.id === bth["noteId"]; }) && bth["history"].filter(function (obj) { return obj.id === bth["noteId"]; }).map(function (obj) { return obj.ratio; })[0] != "NaN") {
			bth["lastRatio"] = Number(bth["history"].filter(function (obj) { return obj.id === bth["noteId"]; }).map(function (obj) { return obj.ratio; })[0]);// When refreshing, it has to be fixed, otherwise it will change when scrolling.
			$("div.component.note-split:not(.hidden-ext) .backToHis").css('display', 'block');
			$(".backToHis.ribbon-tab-title-icon.bx").attr("title", "Back To " + (bth["lastRatio"] * 100).toFixed(1) + "%");
			if (bth["autoJump"] == 1) {
				bth['scrollTo']();
				clearInterval(bth["jumpInterval"]);
				var timesRun = 0;
				bth["jumpInterval"] = setInterval(function () {
					timesRun += 1;
					if (timesRun == 20) {
						clearInterval(bth["jumpInterval"]);
					}
					getnoteDiv();
					if (bth["noteDiv"].scrollHeight == bth['preHeight']) {
						return
					}
					bth['preHeight'] = bth["noteDiv"].scrollHeight;
					bth['scrollTo']();
				}, 50);

			}
			setTimeout(function () {
				getnoteDiv();
				$(bth["noteDiv"]).on('scroll', function (event) {
					scrollFunc(event);
				});
			}, 1000);//The monitoring is performed after 1 second to complete the automatic scrolling, and the subsequent scrolling of clicking the jump button will also be recorded
		} else {
			$("div.component.note-split:not(.hidden-ext) .backToHis").css("display", "none");
			while (bth["history"].length > bth["maxHistory"]) {
				bth["history"].shift();
			}
			return;
		}

	});
}
class BackToHistoryWidget extends api.NoteContextAwareWidget {
	get position() {
		return 100;
	}
	get parentWidget() {
		return 'center-pane';
	}

	doRender() {
		this.$widget = $(`<style type="text/css">
	.backToHis.ribbon-tab-title-icon.bx::before {
		content: "\\e9b9";
	}
</style>`);
		return this.$widget;
	}

	async refreshWithNote(note) {
		bth["noteId"] = note.noteId;
		if (bth["history"] == undefined) {
			const historyNote = await api.getNote(bth["historyNoteId"]);
			try {
				bth["history"] = JSON.parse((await historyNote.getNoteComplement()).content);
			} catch (e) {
				bth["history"] = [];
			}
			if (!(bth["history"] instanceof Array)) {
				//bth["history"] = [];
				bth["history"] = Object.entries(bth["history"]).map(([id, ratio]) => ({ id, ratio }));
			}
		}
		//if (bth["noteId"] == bth["historyNoteId"]) { return }
		if (note.type == 'code' || note.type == 'text') {
			bth["fnotetype"] = 1;
		} else {
			bth["fnotetype"] = 0;
			return;
		}

		reload();
	}

	async entitiesReloadedEvent() {
		if (bth["noteId"] == bth["historyNoteId"]) { return; }
		scrollFunc();
	}
}

module.exports = new BackToHistoryWidget();

window.addEventListener("resize", function(){
    $(bth["noteDiv"]).off('scroll');
    $(document).ready(function () {
        setTimeout(function () {
            getnoteDiv();
            $(bth["noteDiv"]).on('scroll', function (event) {
                scrollFunc(event);
            });
        }, 1000);
    });
});


window.onbeforeunload = function () { //Trigger saving history again when closing the browser
	api.runOnBackend(async (historyNoteId, history) => {
		const historyNote = await api.getNote(historyNoteId);
		historyNote.setContent(JSON.stringify(history));
	}, [bth["historyNoteId"], bth["history"]]);
};