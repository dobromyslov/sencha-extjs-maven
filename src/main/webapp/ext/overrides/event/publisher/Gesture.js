//<feature legacyBrowser>
Ext.define('Ext.overrides.event.publisher.Gesture', {
    override: 'Ext.event.publisher.Gesture'
}, function() {
    if (Ext.isIE9m) {
        this.override({
            updateTouches: function(e, isEnd) {
                var browserEvent = e.browserEvent,
                    xy = e.getXY();

                // I don't always set pageX and pageY on the event object, but when I do
                // it's because the Gesture publisher expects an event object that has them.
                browserEvent.pageX = xy[0];
                browserEvent.pageY = xy[1];
                this.callParent([e, isEnd]);
            },

            initHandlers: function() {
                var me = this,
                    superOnDelegatedEvent;

                me.callParent();
                superOnDelegatedEvent = me.onDelegatedEvent;

                me.onDelegatedEvent = function(e) {
                    // When events are attached using IE's attachEvent API instead of
                    // addEventListener accessing any members of an event object asynchronously
                    // results in "Member not found" error.  To work around this we fabricate
                    // our own event object by copying all of its members to a new object.
                    // We do this for all events that the Gesture publisher handles
                    // because onTouchMove and onTouchEnd use requestAnimationFrame,
                    // and handle the event object asynchronously.
                    var name,
                        fakeEvent = {};

                    for (name in e) {
                        fakeEvent[name] = e[name];
                    }

                    superOnDelegatedEvent.call(me, fakeEvent);
                };
            }
        });
    }
});
//</feature legacyBrowser>
