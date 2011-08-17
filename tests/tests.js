sink('no conflict', function (test, ok) {
    test('Should return old dragdealer back to context', 1, function () {
        ok(dragdealer() === 'success', 'old dragdealer called');
    });
});
start();