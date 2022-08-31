if (window.location.pathname.match(/(\/wiki\/)\w.*-[0-9]*/g)) {
	// Is a Profile Page
	var pageProfile = true;
} else if (window.location.pathname.match(/(\/wiki\/)Help:*/g)) {
	// Is a Help Page
	var pageHelp = true;
} else if (window.location.pathname.match(/(\/wiki\/)Special:*/g)) {
	// Is a Special Page
	var pageSpecial = true;
} else if (window.location.pathname.match(/(\/wiki\/)Category:*/g)) {
	// Is a Category Page
	var pageCategory = true;
} else if (window.location.pathname.match(/(\/wiki\/)Template:*/g)) {
	// Is a Template Page
	var pageTemplate = true;
} else if (window.location.pathname.match(/(\/wiki\/)Space:*/g)) {
	// Is a Space Page
	var pageSpace = true;
} else if (window.location.pathname.match(/\/g2g\//g)) {
	// Is a G2G page
	var pageG2G = true;
}

/**
 * Creates a new menu item in the Apps dropdown menu.
 * 
 */
function createTopMenuItem(options) {
	let title = options.title;
	let name = options.name;
	let id = options.id;
	let url = options.url;

	$('#wte-topMenu').append(`<li>
        <a id="${id}" class="pureCssMenui" title="${title}">${name}</a>
    </li>`);
}

function createTopMenu() {
	$('.pureCssMenu').append(`<li>
        <a class="pureCssMenui0">
            <span>App Features</span>
        </a>
        <ul class="pureCssMenum" id="wte-topMenu"></ul>
    </li>`);
}
