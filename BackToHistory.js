/*
BackToHistory
https://github.com/SiriusXT/trilium-back-to-history
version:0.1.3
*/

window.backTo = new Array();
window.backTo["historyNoteId"]=""; // Fill in the note id used to store history progress
window.backTo["autoJump"]=1; //1: Automatically jump   0: Manual jump
window.backTo["maxHistory"]=100; // Maximum number of saved histories 

window.backTo['preHeight']=0; //window.backTo["jumpInterval"]
if (window.backTo["historyNoteId"]==""){
    api.showMessage("Fill in the note id used to store history progress");
    return
}
window.backTo["fnotetype"]=0; 
function getnoteDiv() {
	var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-printable.component div.ck ");
    if (noteDiv.length == 0) {
   var noteDiv = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split.type-code:not(.hidden-ext) div.component.scrolling-container div.note-detail.component.full-height div.note-detail-code.note-detail-printable.component div.note-detail-code-editor div.CodeMirror.cm-s-default.CodeMirror-wrap div.CodeMirror-vscrollbar");
    }
	if (noteDiv.length == 0) {
		var noteDiv
        = document.querySelectorAll("div#rest-pane.component div.component div#center-pane.component div.component.split-note-container-widget div.component.note-split:not(.hidden-ext) div.component.scrolling-container");
	}
	window.backTo["noteDiv"] = noteDiv[0];
    //window.backTo["scrollHeight"] = window.backTo["noteDiv"].scrollHeight;
};


function saveHis(){
    if (api.getActiveContextNote()==null){return};
        if (window.backTo["fnotetype"]==0){ return};
        getnoteDiv();
        const scrollbl=(window.backTo["noteDiv"].scrollTop/window.backTo["noteDiv"].scrollHeight).toFixed(3);
        if (true){
            window.backTo["history"][window.backTo["noteId"]]=scrollbl;
            
            clearTimeout(window.backTo["saveHisTimer"]);
            window.backTo["saveHisTimer"] = setTimeout((historyNoteId,history) => {
            api.runOnBackend(async (historyNoteId,history) => { 
                const historyNote = await api.getNote(historyNoteId);
                historyNote.setContent(JSON.stringify(history));
            }, [historyNoteId,history]);
       }, 5000,window.backTo["historyNoteId"],window.backTo["history"]);         
            
     }
}
function scrollFunc(event){
    clearTimeout(window.backTo["scrollTimer"]);
    clearTimeout(window.backTo["jumpInterval"]);
  window.backTo["scrollTimer"] = setTimeout(saveHis, 1000);
}

$(document).ready(function() {
	setTimeout(function() {
		var detail = document.querySelectorAll("div#rest-pane");
		if (detail.length == 1) {
			detail[0].addEventListener("mousewheel", scrollFunc);
            detail[0].addEventListener("DOMMouseScroll", scrollFunc);
		} else {
			api.showMessage("detail.length Error");
		}
		getnoteDiv();
	},
	1000)
});

class BackToHistoryWidget extends api.NoteContextAwareWidget {
	get position() {
		return 100;
	}
	get parentWidget() {
		return 'center-pane';
	}

	doRender() {
		this.$widget = $(` < style type = "text/css" >
			.backToHis.ribbon - tab - title - icon.bx::before {
				content: "\\e9b9";
			} < /style>
<script>
	window.backTo['scrollTo']=function (){      
				$(window.backTo["noteDiv"]).animate({
                scrollTop:window.backTo["lastScale"] * window.backTo["noteDiv"].scrollHeight,
                }, 300);
                
	  }      
</script > `);
		return this.$widget;
	}

	async refreshWithNote(note) {
		window.backTo["noteId"] = note.noteId
		const noteId = note.noteId
		const note1 = await api.getNote(window.backTo["historyNoteId"]);
		try {
			window.backTo["history"] = JSON.parse((await note1.getNoteComplement()).content);

		} catch (e) {
			window.backTo["history"] = {};
		}

		if (note.type == 'code' || note.type == 'text') {
			window.backTo["fnotetype"] = 1;
		} else {
			window.backTo["fnotetype"] = 0;
			$("div.component.note-split:not(.hidden-ext) .backToHis").css("display", "none");
			return;
		}
		$(document).ready(function() {
				getnoteDiv();
				if ($("div.component.note-split:not(.hidden-ext) div.ribbon-tab-title").last().attr('class') != 'backToHis ribbon-tab-title') {
					$("div.component.note-split:not(.hidden-ext) .ribbon-tab-title").last().after(` < div class = "backToHis ribbon-tab-spacer"
						style = "display:none;" > < /div>
<div  class="backToHis ribbon-tab-title" style="display:none;" onclick="window.backTo['scrollTo']()">
	<span  class="backToHis ribbon-tab-title-icon bx" style="display:none;"></span > < /div>

`);
}
			if (window.backTo["history"].hasOwnProperty(noteId) && window.backTo["history"][noteId] != "NaN") {
                window.backTo["lastScale"]=window.backTo["history"][window.backTo["noteId"]]; // When refreshing, it has to be fixed, otherwise it will change when scrolling.$("div.component.note-split:not(.hidden-ext) .backToHis").css('display', 'block');
					} else {
						$("div.component.note-split:not(.hidden-ext) .backToHis").css("display", "none");
						while (Object.keys(window.backTo["history"]).length > window.backTo["maxHistory"]) {
							delete window.backTo["history"][Object.keys(window.backTo["history"])[0]];
						}
						return;
					}
					$(".backToHis.ribbon-tab-title-icon.bx").attr("title", "Back To " + (window.backTo["history"][noteId] * 100).toFixed(1) + "%");
					if (window.backTo["autoJump"] == 1) {
						clearInterval(window.backTo["jumpInterval"]);
						var timesRun = 0;
						window.backTo["jumpInterval"] = setInterval(function() {
							timesRun += 1;
							if (timesRun == 50) {
								clearInterval(window.backTo["jumpInterval"]);
							}
							if (window.backTo["noteDiv"].scrollHeight == window.backTo['preHeight']) {
								return
							}
							window.backTo['preHeight'] = window.backTo["noteDiv"].scrollHeight;
							window.backTo['scrollTo']();
						}, 10);

					}
				});
		}

		async entitiesReloadedEvent() {
			scrollFunc();
			clearInterval(window.backTo["jumpInterval"]);
		}
	}

	module.exports = new BackToHistoryWidget();