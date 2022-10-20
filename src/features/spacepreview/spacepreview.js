import $ from 'jquery';
import '../../thirdparty/jquery.hoverDelay'

chrome.storage.sync.get("spacePreviews", function (result) {
  if (result.spacePreviews == true) {
    $('.ten.columns a[href*="/wiki/Space:"], .sixteen.columns a[href*="/wiki/Space:"]').hoverDelay({
      delayIn: 1000,
      delayOut: 0,
      handlerIn: function ($element) {
        $("#spacePreview").remove();
        $("#spaceHover").attr("id", "");
        console.log($element[0].href);
        $element.attr("id", "spaceHover");
        var sPreview = document.createElement("div");
        sPreview.setAttribute("id", "spacePreview");
        sPreview.setAttribute("class", "box rounded");
        sPreview.setAttribute(
          "style",
          `z-index:9999; max-height:450px; overflow: scroll; position:absolute; padding: 10px;`
        );
        document.getElementById("spaceHover").parentElement.appendChild(sPreview);
        $.ajax({
          url: $element[0].href,
          context: document.body,
        }).done(function (result) {
          var pageContent = $(result).find(".ten.columns").html();
          try {
            document.getElementById(
              "spacePreview"
            ).innerHTML = `<span style="float:right; font-weight:700;">click outside to close</span>${pageContent}`;
          } catch {}
        });
      },
    });
  }
  $(document).on("click", function (event) {
    if ($(event.target).closest("#spacePreview").length === 0) {
      $("#spacePreview").remove();
      $("#spaceHover").attr("id", "");
    }
  });
});
