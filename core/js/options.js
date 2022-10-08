// an array of information about features
const features = [
	{
		name: 'Source Previews',
		id: 'sPreviews',
		description: 'Enable source previews on inline references.',
		category: 'Main'
	},{
		name: 'Printer Friendly Bio',
		id: 'printerFriendly',
		description: 'Change the page to a printer-friendly one.',
		category: 'Main'
	},{
		name: 'Apps Menu',
		id: 'appsMenu',
		description: 'Adds an apps submenu to the Find menu.',
   		category: 'Menu'
	},{
		name: 'WikiTree+ Edit Helper',
		id: 'wtplus',
		description: 'Adds multiple editing features.',
		category: 'Main'
	},{
		name: 'Collapsible Descendants Tree',
		id: 'collapsibleDescendantsTree',
		description: 'Makes the descendants tree on profile pages collapsible.',
		category: 'Profile'
	},{
		name: 'AKA Name Links',
		id: 'akaNameLinks',
		description: 'Adds surname page links to the "aka" names on the profile page.',
		category: 'Profile'
	},{
		name: 'Family Timeline',
		id: 'familyTimeline',
		description: 'Displays a family timeline.',
		category: 'Profile'
	},{
		name: 'Draft List',
		id: 'draftList',
		description: 'Adds a button to the Find menu to show your uncommitted drafts.',
		category: 'Menu'
	},{
		name: 'Random Profile',
		id: 'randomProfile',
		description: 'Adds a Random Profile link to the Find menu.',
		category: 'Menu'
	},{
		name: 'Locations Helper',
		id: 'locationsHelper',
		description: 'Manipulates the suggested locations, highlighting likely correct locations,'
		+' based on family members\' locations, and demoting likely wrong locations, based on the dates.',
		category: 'Editing'
	},{
		name: 'Distance and Relationship',
		id: 'distanceAndRelationship',
		description: 'Adds the distance (degrees) between you and the profile person and any relationship between you.',
		category: 'Profile'
	},{
		name: 'Dark Mode',
		id: 'darkMode',
		description: 'Make WikiTree dark.',
		category: 'Style'
	}
];

// saves options to chrome.storage
function save_options() {
	// for each feature, save if they are checked or not
	features.forEach((feature) => {
		const checked = $(`#${feature.id} input`).prop('checked');
		chrome.storage.sync.set({
			[feature.id]: checked
		});
	});
}

// restores state of options page
function restore_options() {
	chrome.storage.sync.get(null, (items) => {
		features.forEach((feature) => {
			$(`#${feature.id} input`).prop('checked', items[`${feature.id}`]);
		});
	});
}

// save the options when the "Save" button is clicked
$('#saveOptions').on('click', () => {
	save_options();
	$("#saved").remove();
	$('#saveOptions').after($("<span id='saved'>Saved</span>"));
	setTimeout(function(){
		$("#saved").fadeOut();
	},1500)
});

// when the options page loads, load status of options from storage
$(document).ready(() => {
	restore_options();
});

// add each feature to the options page
features.forEach((feature) => {
	addFeatureToOptionsPage(feature);
});

// adds feature HTML to the options page
function addFeatureToOptionsPage(featureData) {
	const featureHTML = `
        <div class="feature-information" id="${featureData.id}">
            <div class="feature-header">
                <div class="feature-toggle">
                    <label class="switch">
                    <input type="checkbox">
                    <span class="slider round"></span>
                    </label>
                </div>
                <div class="feature-name">
                ${featureData.name}
                </div>
            </div>
            <div class="feature-description">
                ${featureData.description}
            </div>
        </div>
    `;

	$('#features').append(featureHTML);
}
