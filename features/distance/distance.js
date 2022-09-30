chrome.storage.sync.get('distance', (result) => {
	if (result.distance && pageProfile == true) { 
        getDistance();
    }
})

// Add the distance number to the h1
async function addDistance(data){
    rows = $(data).find("table tr");
    distanceCell = rows.last().find("td").first().text();
    if (distanceCell){
        distance = distanceCell.match(/[0-9]+/);
        if (distance[0]){
            theDistance = distance[0];
            profileName = $("h1 span[itemprop='name']").text();
            $("h1").append($(`<span id='distanceFromYou' title='${profileName} is ${theDistance} degrees from you.'>${theDistance}°</span>`));
        }
    }	
    else {
        if ($(data).find(".content").text()){
            if ($(data).find(".content").text().match(/Error/)){
                console.log("?°");
            }
        }
    }
}

// Get the IDs of the user and the profile person
async function getDistance(){
    const id1 = Cookies.get("wikitree_wtb_UserName"); 
    const id2 = $("a.pureCssMenui0 span.person").text();
    data = await getConnectionFinderResult(id1,id2);
    addDistance(data);
}

// Get the Connection Finder Result from WT+
async function getConnectionFinderResult(id1,id2,relatives=0){
    try{
        const result = await $.ajax({url: "https://wikitree.sdms.si/function/WTPath/Path.htm",
        crossDomain: true,
        xhrFields: { withCredentials: false },
        type: 'POST',
        dataType: 'html',
        data: {"WikiTreeID1":id1,"WikiTreeID2":id2,"render":"1","relatives":relatives}
        })
        return result;
    } catch (error) {
        console.error(error);
    }
}

