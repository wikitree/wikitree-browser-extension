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
		description: 'Adds an apps submenu to the Find menu',
    category: 'Main'
	},{
		name: 'WikiTree+ Edit helper',
		id: 'wtplus',
		description: 'Adds multiple editing features.',
		category: 'Main'
	},{
		name: 'Collapsible Descendants Tree',
		id: 'collapsibleDescendantsTree',
		description: 'Makes the descendants tree on profile pages collapsible',
		category: 'Main'
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
