import $ from 'jquery';

$.fn.hoverDelay = function (n) {
  var e = { delayIn: 300, delayOut: 300, handlerIn: function () {}, handlerOut: function () {} };
  return (
    (n = $.extend(e, n)),
    this.each(function () {
      var e,
        t,
        u = $(this);
      u.hover(
        function () {
          t && clearTimeout(t),
            (e = setTimeout(function () {
              n.handlerIn(u);
            }, n.delayIn));
        },
        function () {
          e && clearTimeout(e),
            (t = setTimeout(function () {
              n.handlerOut(u);
            }, n.delayOut));
        }
      );
    })
  );
};
