chrome.storage.sync.get('printerFriendly', (result) => {
	if (result.printerFriendly) {
		// create a top menu item
		createTopMenuItem({
			title: 'Changes the format to a printer-friendly one.',
			name: 'Printer Friendly Bio',
			id: 'wte-tm-printer-friendly'
		});

		$(`#wte-tm-printer-friendly`).on('click', () => {
			printBio();
		});
	}
});

// modified code from Steven's WikiTree Toolkit
function printBio() {
	var pTitleClean = $(document).attr('title');
	var pTitleCleaner = pTitleClean.replace(' | WikiTree FREE Family Tree', '');
	var pTitle = pTitleCleaner.replace(' - WikiTree Profile', '');
	var pImage = $("img[src^='/photo.php/']").attr('src');
	var pTitleInsert = $('h2').first();
	pTitleInsert.before(
		`<div>
			<img style="float:left;" src="https://www.wikitree.com${pImage}" width="75" height="75">
			<div style="font-size: 2.1429em; line-height: 1.4em; margin-bottom:50px; padding: 20px 100px;">
				${pTitle}
			</div>
		</div>`
	);

	$("a[target='_Help']").parent().remove();
	$("span[title*='for the profile and']").parent().remove();
	$("div[style='background-color:#e1efbb;']").remove();
	$("div[style='background-color:#eee;']").remove();
	$("a[href^='/treewidget/']").remove();
	$("a[href='/g2g/']").remove();
	$("a[class='nohover']").remove();

	$('div').removeClass('ten columns');
	$('.VITALS').remove();
	$('.star').remove();
	$('.profile-tabs').remove();
	//$(".SMALL").remove();
	$('.showhidetree').remove();
	$('.row').remove();
	$('.button').remove();
	$('.large').remove();
	$('.sixteen').remove();
	$('.five').remove();
	$('.editsection').remove();
	$('.EDIT').remove();
	$('.comment-absent').remove();
	$('.box').remove();

	$('#views-wrap').remove();
	$('#footer').remove();
	$('#commentPostDiv').remove();
	$('#comments').remove();
	$('#commentEditDiv').remove();
	$('#commentG2GDiv').remove();
	$('#header').remove();
	$('#showHideDescendants').remove();

	window.print();
	location.reload();
}
