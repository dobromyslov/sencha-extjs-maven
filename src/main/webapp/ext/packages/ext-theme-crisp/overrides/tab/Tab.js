Ext.define('ExtThemeCrisp.tab.Tab', {
    override: 'Ext.tab.Tab',
    initComponent: function() {
        // IE8/9 display black pixels on the rounded edges of the tabs when rotated.
        // IN classic/neptune this is not terribly obvious, but it really stands out
        // in the crisp theme.  The easiest solution is just to disable rounded corners
        // in IE9m
        if (Ext.isIE9m) {
            this.frame = false;
        }

        this.callParent();
    }
});
