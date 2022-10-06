chrome.storage.sync.get('spacePreviews', function (result) {

    if (result.spacePreviews == true) {
        $('a[href*="Space:"]').hover(function (e) { // jquery.hover() handlerIn (show spacePreview)
            $(this).attr('id', 'spaceHover');
            var sPreview = document.createElement('div');
            sPreview.setAttribute('id', 'spacePreview');
            sPreview.setAttribute('class', 'box rounded');
            sPreview.setAttribute('style', `z-index:999; height: 450px; overflow: scroll; position:absolute;`);
            document.getElementById(this.id).appendChild(sPreview);
            $.ajax({
                url: this.href,
                context: document.body
            }).done(function (result) {
                var pageContent = $(result).find('.ten.columns').html();
                try {
                    document.getElementById('spacePreview').innerHTML = pageContent;
                } catch { }
            });
        },
            // jqeury.hover() handlerOut (remove spacePreview)
            function () {
                $('#spacePreview').remove();
                $(this).attr('id', '');
            }
        )
    }
})