chrome.storage.sync.get('relationshipText', (result) => {
	if (result.relationshipText && pageProfile == true) { 
        initCousinText();
    }
})

async function getSomeAncestorsOrDescendants(key,action,depth){
    try{
        const result = await $.ajax({url: "https://api.wikitree.com/api.php", crossDomain: true, xhrFields: { withCredentials: true }, type: 'POST', dataType: 'json', data: { 'action': action, 'depth':depth,'key': key,"fields":"*"},
            success: function(data) {
            }
        })
        if (result[0].ancestors){
            return result[0].ancestors;
        }
        else {
            return result[0].descendants;
        }
    } catch (error) {
        console.error(error);
    }
}

// Turn a cardinal number into an ordinal number
function ordinal(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

async function getProfile(id,fields="*"){
    try{
        const result = await $.ajax({
            url: "https://api.wikitree.com/api.php", 
            crossDomain: true, 
            xhrFields: { withCredentials: true }, 
            type: 'POST', 
            dataType: 'json', 
            data: { 'action': 'getProfile', 'key': id,"fields":fields}
        })
        return result[0].profile;
    } catch (error) {
        console.error(error);
    }
}

function displayName(fPerson){
    if (fPerson!=undefined){
	    fName1="";
        if (typeof fPerson["LongName"]!="undefined"){
            if (fPerson["LongName"]!=""){
                fName1 = fPerson["LongName"].replace(/\s\s/," ");
            }
        }
        fName2=""; fName4 = "";
        if (typeof fPerson["MiddleName"]!="undefined"){
            if (fPerson["MiddleName"]=="" && typeof fPerson["LongNamePrivate"]!="undefined"){
                if (fPerson["LongNamePrivate"]!=""){
                fName2 = fPerson["LongNamePrivate"].replace(/\s\s/," ");
                }
            }
        } 
        else {
            if (typeof fPerson["LongNamePrivate"]!="undefined"){
                if (fPerson["LongNamePrivate"]!=""){
                fName4 = fPerson["LongNamePrivate"].replace(/\s\s/," ");
                }
            }
        }
		fName3 = "";
		checks = ["Prefix","FirstName","RealName","MiddleName","LastNameAtBirth","LastNameCurrent","Suffix"];
		checks.forEach(function(dCheck){
			if (typeof fPerson[""+dCheck+""]!="undefined"){
				if (fPerson[""+dCheck+""]!="" && fPerson[""+dCheck+""]!=null){
					if (dCheck=="LastNameAtBirth"){
						if (fPerson["LastNameAtBirth"]!=fPerson.LastNameCurrent){
							fName3+="("+fPerson["LastNameAtBirth"]+") ";
						}
					}
					else if (dCheck=="RealName"){
						if (typeof fPerson["FirstName"]!="undefined"){

						}
						else {
							fName3+=fPerson["RealName"]+" ";
						}
					}
					else{
						fName3+=fPerson[""+dCheck+""]+" ";		
					}
				}
			}
		});
        arr = [fName1,fName2,fName3,fName4];
        var longest = arr.reduce(
            function (a, b) {
                return a.length > b.length ? a : b;
            }
        );
        fName = longest;
        if (fPerson["ShortName"]) {
            sName = fPerson["ShortName"];
        }	 	
        else {
            sName = fName;
        }	
        return [fName.trim(),sName.trim()];
	}
}

function ancestorType(generation,gender){
    if (generation > 0 || generation ==0){
        if (gender == "Female"){
            relType = "Mother";
        }
        else if (gender == "Male"){
            relType = "Father";
        }
        else {
            relType = "Parent";
        }
    }
    if (generation > 1){
        relType = "Grand"+relType.toLowerCase();
    }
    if (generation > 2){
        relType = "Great-"+relType.toLowerCase();
    }
    if (generation > 3){
        relType = ordinal(generation-2)+" "+relType;
    }
    return relType;
}

async function addCousinText(){
    people = window.CFconnections; 
    isCousin = false; 
    people.forEach(function(aPerson,ind){
        if (["son","daughter","child"].includes(aPerson.relation) && window.commonAncestor==undefined){
            window.commonAncestor = people[ind-1];
            thePerson = aPerson;
            index = ind;
            isCousin = true;
            num1 = ind;
            num2 = people.length-ind-1;
            removed = num1-num2-2;
            removedText = removed+" times";
            if (removed == 1){
                removedText = "once";
            }
            if (removed == 2){
                removedText = "twice";
            }
            if (num1 == num2){
                cousinTextRel = "Your "+ordinal(num2)+" cousin";
            }
            else if(num2==0){
                if (aPerson.gender=="Male"){
                    base = "uncle";
                }
                else {
                    base = "aunt";
                }
                if (num1>3){base = "grand"+base;}
                if (num1>4){base = "great-"+base;}
                    numnum =num1-4;
                    num = ordinal(numnum);
                if (numnum<2){
                    num = "";
                }
                cousinTextRel = "Your "+num+" "+base+"";
            }
            else if (removed<0){
                num2 = num2+removed;
                removed = Math.abs(removed);
                removedText = getRemovedText(removed);
                cousinTextRel = "Your "+ordinal(num2)+" cousin "+removedText+" removed";	
            }
            else {
                cousinTextRel = "Your "+ordinal(num2)+" cousin "+removedText+" removed";
            }
        }
    })
    possessiveAdj = "their";
    if (window.CFconnections[window.CFconnections.length-1].gender) {
        var gender = window.CFconnections[window.CFconnections.length-1].gender;
        if (gender == "Male"){
            possessiveAdj = "his";
        }
        if (gender == "Female"){
            possessiveAdj = "her";
        }
    }	
    if (isCousin == false){
        if (people.length-1>2){
            window.cousinTextRel = "Your "+ancestorType(people.length-1,gender).toLowerCase();
            thePerson = people[people.length-1];
            $("#yourRelationshipText").remove();
            cousinText = $("<span id='yourRelationshipText' class='connectionFinder'>"+window.cousinTextRel+"<br></span>");
            $("h1").after(cousinText);
        }
        else {
            return false;
        }
    }
    if ($("#yourRelationshipText").length==0 && $(".ancestorTextText").length==0 && $("#ancestorListBox").length==0){
        if (isCousin == true){
            if (window.commonAncestor!=undefined){
                if (window.commonAncestor.id){
                    // Get name and ID of common ancestor
                    await getProfile(window.commonAncestor.id).then((person)=>{
                        $("#yourRelationshipText").remove();
                        cousinText = $("<span id='yourRelationshipText' class='connectionFinder'>"+window.cousinTextRel+"<br></span>");
                        $("h1").after(cousinText);
                        commonAncestorText = $("<span id='yourCommonAncestor'>Your common ancestor, </span>");
                        cousinText.append(commonAncestorText);
                        $("#yourCommonAncestor").append($("<a href='https://www.wikitree.com/wiki/"+window.commonAncestor.id+"'>"
                        +displayName(person)[0]+"</a>"));
                        $("#yourCommonAncestor").append($(`<span>,&nbsp;is ${possessiveAdj} <span style='white-space:nowrap'>${ancestorType(num2 + 1, gender).toLowerCase()}</span>.</span>`));
                    })
                } 
            }
        }
    }
}

async function initCousinText(){		
    id1 = Cookies.get("wikitree_wtb_UserName"); 
    id2 = $("a.pureCssMenui0 span.person").text();
    $.ajax({
        url: "https://wikitree.sdms.si/function/WTPath/Path.htm",
        crossDomain: true,
        xhrFields: { withCredentials: false },
        type: 'POST',
        dataType: 'html',
        data: {"WikiTreeID1":id1,"WikiTreeID2":id2,"render":"1","relatives":"2"},
        success: function(data) {
            rows = $(data).find("table tr");	
            window.CFconnections = [];
            idLinks = $(data).find("tr td:nth-child(2) a[href*='/wiki/']");
            rows.each(function(index){
                if (index>0){
                    relation = $(this).find("td:first-child").text().replace(/[0-9]+/,"").trim();
                    thisID = $(this).find("td:nth-child(2) a[href*='/wiki/']").text();
                    thisGender = $(this).find("td:nth-child(6)").text();
                    thisName = $(this).find("td:nth-child(3)").text().replace(/(\b[a-z]\b)\s(\(.*\))/i,"$2 $1");
                    person = {id: thisID, relation: relation, gender:thisGender, name: thisName}
                    window.CFconnections.push(person);
                }
            })
            if ($("#yourRelationshipText").length==0 && $(".ancestorTextText").length==0 && rows.length){	
                window.CFprivates = 0;
                window.CFsToCheck = []; 
                window.checkedCFprivates =0;
                addCousinText();
            }
        },
        error: function(err){
            console.log(err);
        }
    })
}

