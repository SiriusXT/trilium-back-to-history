/*
BackToHistory
https://github.com/SiriusXT/trilium-back-to-history
version:0.1.7
*/
window.backTo = new Array();
window.backTo["historyNoteId"] = ""; // Fill in the note id used to store history progress
window.backTo["autoJump"] = 1; //1: Automatically jump   0: Manual jump
window.backTo["maxHistory"] = 100; // Maximum number of saved histories 

if (window.backTo["historyNoteId"] == "") {
	api.showMessage("Fill in the note id used to store history progress");
	return
}
window.backTo['preHeight'] = 0;
window.backTo["fnotetype"] = 0;
function getnoteDiv() {
	var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-printable.component div.ck ");//text, no subnotes
	if (noteDiv.length == 0) {
		var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split.type-code:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-code.note-detail-printable.component div.note-detail-code-editor div.CodeMirror.cm-s-default.CodeMirror-wrap div.div.CodeMirror-scroll");// code, no subnotes
	}
	if (noteDiv.length == 0) {
		var noteDiv
			= document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container");//text, with subnotes, code, with subnotes
	}
	window.backTo["noteDiv"] = noteDiv[0];
	window.backTo["note-list"] = document.querySelectorAll('div.component.note-split:not(.hidden-ext) div.note-list-widget.component');
};


function saveHis() {
	if (api.getActiveContextNote() == null) { return };
	if (window.backTo["fnotetype"] == 0) { return };
	if (window.backTo["note-list"].length != 0) {
		var ratio = (window.backTo["noteDiv"].scrollTop / (window.backTo["noteDiv"].scrollHeight - window.backTo["note-list"][0].offsetHeight)).toFixed(5);
	}
	else { var ratio = (window.backTo["noteDiv"].scrollTop / window.backTo["noteDiv"].scrollHeight).toFixed(5); }

	if (window.backTo["history"].some(function (element) {
		return element.id === window.backTo["noteId"];
	})) {
		window.backTo["history"].forEach(function (element) {
			if (element.id === window.backTo["noteId"]) {
				element.ratio = ratio;
			}
		});
	} else {
		window.backTo["history"].push({ "id": window.backTo["noteId"], "ratio": ratio });
	}

	if (true) {
		clearTimeout(window.backTo["saveHisTimer"]);
		window.backTo["saveHisTimer"] = setTimeout((historyNoteId, history) => {
			api.runOnBackend(async (historyNoteId, history) => {
				const historyNote = await api.getNote(historyNoteId);
				historyNote.setContent(JSON.stringify(history));
			}, [historyNoteId, history]);
		}, 60000, window.backTo["historyNoteId"], window.backTo["history"]);
	}
}
function scrollFunc(event) {
	clearTimeout(window.backTo["scrollTimer"]);
	clearTimeout(window.backTo["jumpInterval"]);
	window.backTo["scrollTimer"] = setTimeout(saveHis, 1000);
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
</style>
<script>
	window.backTo['scrollTo'] = function () {
		if (window.backTo["note-list"].length != 0) {
			var scrollHeight = window.backTo["noteDiv"].scrollHeight - window.backTo["note-list"][0].offsetHeight;
		}
		else { var scrollHeight = window.backTo["noteDiv"].scrollHeight; }
		$(window.backTo["noteDiv"]).animate({
			scrollTop: window.backTo["lastRatio"] * scrollHeight,
		}, 300);
	}      
</script>`);
		return this.$widget;
	}

	async refreshWithNote(note) {
		$(window.backTo["noteDiv"]).off('scroll');
		window.backTo["noteId"] = note.noteId;
		if (window.backTo["noteId"] == window.backTo["historyNoteId"]) { return }
		//var noteId = note.noteId;
		if (window.backTo["history"] == undefined) {
			const historyNote = await api.getNote(window.backTo["historyNoteId"]);
			try {
				window.backTo["history"] = JSON.parse((await historyNote.getNoteComplement()).content);
			} catch (e) {
				window.backTo["history"] = [];
			}
			if (!(window.backTo["history"] instanceof Array)) {
				//window.backTo["history"] = [];
				window.backTo["history"] = Object.entries(window.backTo["history"]).map(([id, radio]) => ({ id, radio }));

			}
		}
		if (note.type == 'code' || note.type == 'text') {
			window.backTo["fnotetype"] = 1;
		} else {
			window.backTo["fnotetype"] = 0;
			return;
		}

		$(document).ready(function () {
			getnoteDiv();
			setTimeout(function () {
				$(window.backTo["noteDiv"]).on('mousewheel', function (event) {
					if ($(this).is(':animated')) { return; }
					scrollFunc(event);
				});
			}, 1000); //When opening a new page, it takes a second to start recording
			if (window.backTo["history"].some(function (element) { return element.id === window.backTo["noteId"]; }) && window.backTo["history"].filter(function (obj) { return obj.id === window.backTo["noteId"]; }).map(function (obj) { return obj.ratio; })[0] != "NaN") {
				window.backTo["lastRatio"] = window.backTo["history"].filter(function (obj) { return obj.id === window.backTo["noteId"]; }).map(function (obj) { return obj.ratio; })[0]// When refreshing, it has to be fixed, otherwise it will change when scrolling.
				$("div.component.note-split:not(.hidden-ext) .backToHis").css('display', 'block');
			} else {
				$("div.component.note-split:not(.hidden-ext) .backToHis").css("display", "none");
				while (window.backTo["history"].length > window.backTo["maxHistory"]) {
					window.backTo["history"].shift();
				}
				return;
			}
			if ($("div.component.note-split:not(.hidden-ext) div.ribbon-tab-title").last().attr('class') != 'backToHis ribbon-tab-title') {
				$("div.component.note-split:not(.hidden-ext) .ribbon-tab-title").last().after(`<div class="backToHis ribbon-tab-spacer" style="display:none;"></div>
<div  class="backToHis ribbon-tab-title" style="display:none;" onclick="window.backTo['scrollTo']()">
	<span  class="backToHis ribbon-tab-title-icon bx" style="display:none;"></span>
</div>`);
			}

			$(".backToHis.ribbon-tab-title-icon.bx").attr("title", "Back To " + (window.backTo["lastRatio"] * 100).toFixed(1) + "%");
			if (window.backTo["autoJump"] == 1) {
				window.backTo['scrollTo']();
				clearInterval(window.backTo["jumpInterval"]);
				var timesRun = 0;
				window.backTo["jumpInterval"] = setInterval(function () {
					timesRun += 1;
					if (timesRun == 50) {
						clearInterval(window.backTo["jumpInterval"]);
					}

					if (window.backTo["noteDiv"].scrollHeight == window.backTo['preHeight']) {
						return
					}
					window.backTo['preHeight'] = window.backTo["noteDiv"].scrollHeight;
					window.backTo['scrollTo']();
				}, 20);
			}
		});
	}

	async entitiesReloadedEvent() {
		scrollFunc();
	}
}

module.exports = new BackToHistoryWidget();

window.onbeforeunload = function() { //Trigger saving history again when closing the browser
			api.runOnBackend(async (historyNoteId, history) => {
				const historyNote = await api.getNote(historyNoteId);
				historyNote.setContent(JSON.stringify(history));
			}, [window.backTo["historyNoteId"], window.backTo["history"]]);
};