function addFeatureToOptionsPage(featureData) {
	const featureHTML = `
        <div class="feature-information">
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

// an array of information about features
const features = [
	{
		name: 'Feature 1',
		description: 'This is a feature',
		category: 'Main'
	},
	{
		name: 'Feature 2',
		description: 'This is another feature',
		category: 'Main'
	}
];

// add each feature to the options page
features.forEach((feature) => {
	addFeatureToOptionsPage(feature);
});
