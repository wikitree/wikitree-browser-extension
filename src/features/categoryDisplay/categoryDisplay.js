import $ from 'jquery';
import {pageProfile} from '../../core/common';
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("categoryDisplay").then((result) => {
    if (result && pageProfile == true) { 
        moveCategories();
    }
})

async function moveCategories(){
    const options = await getFeatureOptions("categoryDisplay");
    // Determine the display type
    switch(options.displayType){
        case "default":
            break;
        case "list":
            $("#categories").find('span[class="SMALL"]').remove();
            $("#categories").replaceWith(function() { 
                var listCats = $("#categories").html().replace(/\|/g,"").replace(/&nbsp;/g,"");
                return `<div id="categories"><ol class="star">${listCats}</ol></div>` 
            });
            $("#categories span").replaceWith(function() { 
                return `<li>${this.innerHTML}</li>` 
            });
            break;
    }
    // Determine the border color
    switch(options.borderColor){
        case "none":
            $("#categories").css(
                {
                    "border":"none",
                    "padding":"5px",
                    "margin-top":"10px"
                }
            );
            break;
        case "gray":
            $("#categories")
                .attr("class","box rounded row")
                .css("margin-top","10px");
            break;
        case "default":
            $("#categories")
                .attr("class","box green rounded row")
                .css("margin-top","10px");
            break;
        case "orange":
            $("#categories")
                .attr("class","box orange rounded row")
                .css("margin-top","10px");
            break;
    }
    // Determine the category placement
    switch(options.categoryLocation){
        case "sidebar":
            $("#categories").find('span[class="SMALL"]').remove();
            $('a[name="DNA"')
                .before($("#categories"));
            break;
        case "top":
            $("#categories").find('span[class="SMALL"]').remove();
            $('div[style*="background-color:#eee"]:contains("page has been accessed")')
                .next()
                .after($("#categories"));
            break;
        case "default":
            break;
    }
}