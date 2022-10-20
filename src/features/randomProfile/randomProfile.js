import $ from 'jquery';
import {getPerson} from 'wikitree-js';

chrome.storage.sync.get('randomProfile', (result) => {
	if (result.randomProfile && $("body.BEE").length == 0) {
        function getRandomProfile() {
            const randomProfileID = Math.floor(Math.random() * 36065988);
            // check if exists
            getPerson(randomProfileID)
                .then((person) => {
                    // check to see if the profile is Open
                    if (person.Privacy_IsOpen) {
                        const link = `https://www.wikitree.com/wiki/${randomProfileID}`;
                        window.location = link;
                    } else { // If it isn't open, find a new profile
                        getRandomProfile();
                    }
                })
                .catch((reason) => {
                    console.log(`getJSON request failed! ${reason}`);
                    getRandomProfile();
                });
        }

        // add random option to 'Find'
        async function addRandomToFindMenu() {
            const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
            const newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
            newLi.insertBefore(relationshipLi.parent());
            $(".randomProfile").click(function (e) {
                e.preventDefault();
                getRandomProfile()
            });
        }
        addRandomToFindMenu();
    }
});
