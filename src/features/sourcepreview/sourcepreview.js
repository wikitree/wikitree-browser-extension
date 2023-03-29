/*
Created By: Steve Harris (Harris-5439)
*/

import $ from 'jquery';
import { checkIfFeatureEnabled } from "../../core/options/options_storage"

checkIfFeatureEnabled("sPreviews").then((result) => {
  if (result) {
        sourcePreview();

        function sourcePreview() {
            if ($('.reference').length && $('.references').length) {
                $('.reference').hover(function (e) { // jquery.hover() handlerIn (show sourcePreview)
                    var sourceID = this.id.replace('ref', 'note').replace(/(_[0-9]+$)/g, '');
                    var sPreview = document.createElement('div');
                    sPreview.setAttribute('id', 'sourcePreview');
                    sPreview.setAttribute('class', 'box rounded');
                    sPreview.setAttribute('style', 'z-index:999; width: 450px; position:absolute;');
                    document.getElementById(this.id).appendChild(sPreview);
                    document.getElementById('sourcePreview').innerHTML = document.getElementById(sourceID).innerHTML;
                },
                    function () { // jqeury.hover() handlerOut (remove sourcePreview)
                        $('#sourcePreview').remove();
                    }
                )
            } else {}
        }
        const targetNode = document.getElementById('previewbox');
        const config = { childList: true };
        const callback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                    sourcePreview();
                }
            }
        };
        const observer = new MutationObserver(callback);
        if ($('#previewbox').length > 0) {
            observer.observe(targetNode, config);
        }
    }
})
