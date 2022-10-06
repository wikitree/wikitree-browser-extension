async function akaNames(){
// Make AKA last names clickable
    if ($("body.profile").length){
        const nameBit = $(".VITALS").eq(0).find(".large");
        const nameText = nameBit.text();
        if (nameText.match("aka ")){
            const strongs = nameBit.find("strong");
            const lastStrong = strongs.eq(strongs.length-1);
            const akaText = lastStrong.text();
            const oAkaNames = akaText.split(",");
            lastStrong.text("");
            oAkaNames.forEach(function(akaName,i){
                $("<a href='https://www.wikitree.com/genealogy/"+akaName.trim()+"'>"+akaName.trim()+"</a>").appendTo(lastStrong);
                if (i+1<oAkaNames.length){
                    $("<span>, </span>").appendTo(lastStrong);
                }
            })
        }
    }
}

chrome.storage.sync.get('akaNameLinks', (result) => {
	if (result.akaNameLinks && pageProfile == true) { 
        akaNames();
    }
})