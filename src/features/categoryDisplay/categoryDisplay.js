import $ from 'jquery';
import {pageProfile} from '../../core/common';
import { checkIfFeatureEnabled } from "../../core/options/options_storage.js";

function moveCategories(){
    $("#categories").find('span[class="SMALL"]').remove();
    $('div:contains("This page has been accessed")').next().attr('id','cousinLinks');
    $("#cousinLinks").after($("#categories"));
    $("#categories").css({"border":"none","padding":"5px","margin-top":"10px"});
}

checkIfFeatureEnabled("categoryDisplay").then((result) => {
    if (result && pageProfile == true) { 
        moveCategories();
    }
})