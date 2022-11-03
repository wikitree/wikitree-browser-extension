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
    console.log(options)

    $("#categories").find('span[class="SMALL"]').remove();
    $('div:contains("This page has been accessed")').next().attr('id','cousinLinks');
    $("#cousinLinks").after($("#categories"));
    $("#categories").css({"border":"none","padding":"5px","margin-top":"10px"});
}