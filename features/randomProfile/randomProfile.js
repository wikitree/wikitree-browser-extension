chrome.storage.sync.get('randomProfile', (result) => {
	if (result.randomProfile) {
        function getRandomProfile() {
            var randomProfileID = Math.floor(Math.random() * 36065988);
            var link = '';
            // check if exists
            $.getJSON('https://api.wikitree.com/api.php?action=getPerson&key=' + randomProfileID)
                .done(function (json) {
                    // check to see if the profile is Open
                    if (json[0]['status'] == 0 && 'Privacy_IsOpen' in json[0]['person'] && json[0]['person']['Privacy_IsOpen']) {
                        link = 'https://www.wikitree.com/wiki/' + randomProfileID;
                        window.location = link;
                    } else { // If it isn't open, find a new profile
                        getRandomProfile();
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.log('getJSON request failed! ' + textStatus + ' ' + errorThrown);
                    getRandomProfile();
                });
        }

        // add random option to 'Find'
        async function addRandomToFindMenu() {
            relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
            newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
            newLi.insertBefore(relationshipLi.parent());
            $(".randomProfile").click(function (e) {
                e.preventDefault();
                getRandomProfile()
            });
        }
    addRandomToFindMenu();
})