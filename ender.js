!function ($) {
    
    $.ender({
        dragdealer: function (opt) {
            return this.forEach(function (){
                dragdealer(el, opt);
            })
        }
    }, true);
    
}(ender)