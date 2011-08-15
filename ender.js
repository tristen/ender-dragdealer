!function ($) {

    $.ender({
        dragdealer: function (opt) {
            return this.forEach(function (el) {
              dragdealer(el, opt);
            });
        }
    }, true);

}(ender);