chrome.storage.sync.get('sPreviews', function(result) {
    if (result.sPreviews == true){
        if (pageProfile == true | pageSpace == true) { // Only enable this function on Profile or Space pages
            if ($('.reference').length) { // and only if inline citations are found
                $('.reference').hover(function (e) { // jquery.hover() handlerIn (show sourcePreview)
                    var sourceID = this.id.replace('ref', 'note').replace(/(_[0-9]+$)/g, '');
                    var sPreview = document.createElement('div');
                    sPreview.setAttribute('id', 'sourcePreview');
                    sPreview.setAttribute('class', 'box rounded');
                    sPreview.setAttribute('style', 'z-index:999; width: 450px; position:absolute;');
                    document.getElementById(this.id).appendChild(sPreview);
                    document.getElementById('sourcePreview').innerHTML = document.getElementById(sourceID).innerHTML;
                },
                    // jqeury.hover() handlerOut (remove sourcePreview)
                    function () {
                        $('#sourcePreview').remove();
                    }
                )
            }
        }
    }
})