module.exports = Ember.View.extend({

    willDestroy: function() {
        this._super();
        var controller = this.get('controller');
        if (controller) {
            controller.destroy();
        }
    }

});