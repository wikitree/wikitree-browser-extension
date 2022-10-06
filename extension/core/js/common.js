if (window.location.pathname.match(/(\/wiki\/)\w.*-[0-9]*/g) 
	|| window.location.href.match(/\?title\=\w.+\-[0-9]+/g)) {
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

// Add wte class to body to let WikiTree BEE know not to add the same functions 
document.querySelector("body").classList.add("wte");

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
	newUL = $("<ul class='pureCssMenu' id='wte-topMenuUL'></ul>");
	$("ul.pureCssMenu").eq(0).after(newUL);
	newUL.append(`<li>
        <a class="pureCssMenui0">
            <span>App Features</span>
        </a>
        <ul class="pureCssMenum" id="wte-topMenu"></ul>
    </li>`);
}

async function getRelatives(id,fields="*"){
    try{
        const result = await $.ajax({
            url: "https://api.wikitree.com/api.php", 
            crossDomain: true, 
            xhrFields: { withCredentials: true }, 
            type: 'POST', 
            dataType: 'json', 
            data: { 'action': 'getRelatives', 'keys': id,"fields":fields,"getParents":1,"getSiblings":1,"getSpouses":1,"getChildren":1}
        })
        return result[0].items[0].person;
    } catch (error) {
        console.error(error);
    }
}

// Make the family member arrays easier to handle
function extractRelatives(rel,theRelation=false) {
    let people = [];
    if (typeof rel == undefined || rel ==null) {
        return false;
    }
    pKeys = Object.keys(rel); 
    pKeys.forEach(function(pKey) {
        var aPerson = rel[pKey];
        if (theRelation!=false){
            aPerson.Relation = theRelation;
        }
        people.push(aPerson); 
    });
    return people;
}

function familyArray(person){
// This is a person from getRelatives
	const rels = ["Parents","Siblings","Spouses","Children"];
	let familyArr = [person];
	rels.forEach(function(rel){
		familyArr = familyArr.concat(extractRelatives(person[rel]));
	}) 
	return familyArr;
}
